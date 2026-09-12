const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const {
  generateTokenPair,
  verifyRefreshToken,
  generateEmailToken,
  verifyEmailToken,
} = require('../utils/tokens');
const emailService = require('./email.service');
const logger = require('../config/logger');

/**
 * Sanitize corrupted location.coordinates on existing User documents.
 * Legacy documents may have `coordinates: { type: 'Point' }` (no coordinates array),
 * which causes the MongoDB 2dsphere index to throw on any save().
 * This function unsets the coordinates subdocument if it is invalid.
 * @param {object} user - Mongoose User document
 */
function _sanitizeUserCoordinates(user) {
  const coords = user?.location?.coordinates;
  if (!coords) return;

  const hasValidArray =
    Array.isArray(coords.coordinates) &&
    coords.coordinates.length === 2 &&
    !(coords.coordinates[0] === 0 && coords.coordinates[1] === 0);

  if (!hasValidArray) {
    user.location.coordinates = undefined;
    user.markModified('location.coordinates');
  }
}

/**
 * Register a new user with email and password.
 * @param {object} userData
 * @returns {Promise<{ user: object, tokens: object }>}
 */
async function register(userData) {
  const { email, password, firstName, lastName, role, countryCode } = userData;

  // Check if email already taken
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw ApiError.conflict('An account with this email address already exists');
  }

  // Validate corporate email for employers using country plugin architecture
  const userRole = role || 'jobseeker';
  if (userRole === 'employer') {
    let emailValidation;
    if (countryCode) {
      try {
        const { getCountryPlugin } = require('../plugins/countries');
        const plugin = getCountryPlugin(countryCode);
        emailValidation = typeof plugin.validateEmployerEmail === 'function'
          ? plugin.validateEmployerEmail(email)
          : require('../utils/emailDomain').validateCorporateEmail(email);
      } catch {
        const { validateCorporateEmail } = require('../utils/emailDomain');
        emailValidation = validateCorporateEmail(email);
      }
    } else {
      const { validateCorporateEmail } = require('../utils/emailDomain');
      emailValidation = validateCorporateEmail(email);
    }

    if (!emailValidation.valid) {
      throw ApiError.badRequest(
        emailValidation.message ||
          'A business/corporate email address is required to register an employer profile. Free consumer email providers are not permitted.'
      );
    }
  }

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    passwordHash: password,
    role: userRole,
    countryCode: countryCode ? countryCode.toUpperCase() : '',
    authProvider: 'local',
  });

  // Generate tokens and persist hashed refresh token
  const tokens = generateTokenPair(user);
  if (typeof User.hashToken === 'function') {
    user.refreshToken = User.hashToken(tokens.refreshToken);
    await user.save();
  }

  // Send verification email asynchronously
  try {
    const verificationToken = generateEmailToken({ userId: user._id, type: 'verify' }, '24h');
    emailService.sendVerificationEmail(user, verificationToken).catch((err) => {
      logger.error('Failed to send verification email', { error: err.message, userId: user._id });
    });
  } catch (err) {
    logger.error('Error creating verification token', { error: err.message });
  }

  return {
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    },
    tokens,
  };
}

/**
 * Login user with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: object, tokens: object }>}
 */
async function login(email, password) {
  const user = await User.findByEmailWithPassword(email);

  if (!user || user.authProvider !== 'local') {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.status === 'suspended') {
    throw ApiError.forbidden('Your account has been suspended. Please contact support.');
  }

  if (user.status === 'banned') {
    throw ApiError.forbidden('Your account has been permanently banned.');
  }

  // Check company status & permissions for employers
  let companyData = null;
  if (user.role === 'employer' || user.company) {
    const Company = require('../models/Company');
    const { TeamPermission } = require('../utils/constants');
    let company = null;
    if (user.company) {
      company = await Company.findById(user.company);
    }
    if (!company) {
      company = await Company.findOne({
        $or: [{ owner: user._id }, { 'teamMembers.user': user._id }],
      });
    }

    if (company) {
      // Check company verification status
      if (company.verificationStatus === 'rejected') {
        throw ApiError.forbidden(
          company.verificationNotes
            ? `Your company profile verification was rejected: ${company.verificationNotes}`
            : 'Your company profile verification has been rejected by administration. Please contact support.'
        );
      }

      const isOwner = company.owner.toString() === user._id.toString();
      let permissions = [];
      if (isOwner) {
        permissions = Object.values(TeamPermission);
      } else if (Array.isArray(company.teamMembers)) {
        const member = company.teamMembers.find((m) => m.user && m.user.toString() === user._id.toString());
        permissions = member?.permissions || [];
      }

      companyData = {
        _id: company._id,
        name: company.name,
        slug: company.slug,
        logoUrl: company.logoUrl || '',
        countryCode: company.countryCode,
        verificationStatus: company.verificationStatus,
        isVerified: company.verificationStatus === 'approved',
        isOwner,
        permissions,
      };

      if (!user.company) {
        user.company = company._id;
      }
    }
  }

  // Generate tokens and persist hashed refresh token in DB
  const tokens = generateTokenPair(user);
  if (typeof User.hashToken === 'function') {
    user.refreshToken = User.hashToken(tokens.refreshToken);
  }

  // Update last login
  // Sanitize legacy corrupted coordinates before save to avoid 2dsphere index errors
  _sanitizeUserCoordinates(user);
  user.lastLoginAt = new Date();
  await user.save();

  const userObj = user.toJSON();
  if (companyData) {
    userObj.company = companyData;
  }

  return {
    user: userObj,
    tokens,
  };
}

/**
 * Handle OAuth login/registration (Google / LinkedIn).
 * @param {object} profile - Normalized profile from passport strategy
 * @returns {Promise<{ user: object, tokens: object }>}
 */
async function handleOAuthCallback(profile) {
  let user = await User.findOne({ email: profile.email.toLowerCase() });

  if (user) {
    // Existing user - update provider info if needed
    if (!user.authProviderId) {
      user.authProvider = profile.authProvider;
      user.authProviderId = profile.authProviderId;
    }
    user.isEmailVerified = true;
    user.lastLoginAt = new Date();
    if (profile.avatar && !user.avatar) {
      user.avatar = profile.avatar;
    }
    // Sanitize legacy corrupted coordinates before save to avoid 2dsphere index errors
    _sanitizeUserCoordinates(user);
    await user.save();
  } else {
    // New OAuth user
    user = await User.create({
      firstName: profile.firstName || 'User',
      lastName: profile.lastName || '',
      email: profile.email.toLowerCase(),
      authProvider: profile.authProvider,
      authProviderId: profile.authProviderId,
      isEmailVerified: true,
      avatar: profile.avatar || '',
      role: 'jobseeker',
    });
  }

  const tokens = generateTokenPair(user);

  return {
    user: user.toJSON(),
    tokens,
  };
}

/**
 * Refresh access token using a valid refresh token.
 * Validates against the securely stored hashed refresh token in the DB and performs token rotation.
 * @param {string} refreshToken
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
async function refreshAccessToken(refreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.userId).select('+refreshToken');
  if (!user || user.status !== 'active') {
    throw ApiError.unauthorized('User not found or account inactive');
  }

  // Verify stored hashed refresh token matches incoming token
  if (typeof User.hashToken === 'function') {
    const incomingHash = User.hashToken(refreshToken);
    if (!user.refreshToken || user.refreshToken !== incomingHash) {
      // Token reuse or invalidated token: revoke token immediately
      user.refreshToken = undefined;
      await user.save();
      throw ApiError.unauthorized('Invalid, revoked or expired refresh token');
    }
  }

  // Token rotation: issue new token pair and save fresh hash to DB
  const tokens = generateTokenPair(user);
  if (typeof User.hashToken === 'function') {
    user.refreshToken = User.hashToken(tokens.refreshToken);
    await user.save();
  }

  return tokens;
}

/**
 * Resend email verification link.
 * @param {string} email
 */
async function resendVerificationEmail(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Return silently to prevent email enumeration attack
    return;
  }

  if (user.isEmailVerified) {
    throw ApiError.badRequest('This email address is already verified');
  }

  const verificationToken = generateEmailToken({ userId: user._id, type: 'verify' }, '24h');
  await emailService.sendVerificationEmail(user, verificationToken);
}

/**
 * Log out user by revoking active refresh token in DB.
 * @param {string} userIdOrToken
 */
async function logout(userIdOrToken) {
  if (!userIdOrToken) return;
  try {
    if (typeof userIdOrToken === 'string' && userIdOrToken.length > 30) {
      const hashed = typeof User.hashToken === 'function' ? User.hashToken(userIdOrToken) : userIdOrToken;
      await User.updateOne({ refreshToken: hashed }, { $unset: { refreshToken: 1 } });
    } else {
      await User.findByIdAndUpdate(userIdOrToken, { $unset: { refreshToken: 1 } });
    }
  } catch (err) {
    logger.error('Error invalidating refresh token on logout', { error: err.message });
  }
}

/**
 * Request a password reset link.
 * @param {string} email
 */
async function forgotPassword(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Return silently to prevent email enumeration attack
    return;
  }

  const resetToken = generateEmailToken({ userId: user._id, type: 'reset' }, '1h');
  await emailService.sendPasswordResetEmail(user, resetToken);
}

/**
 * Reset password using a valid reset token.
 * @param {string} token
 * @param {string} newPassword
 */
async function resetPassword(token, newPassword) {
  let decoded;
  try {
    decoded = verifyEmailToken(token);
  } catch {
    throw ApiError.badRequest('Invalid or expired password reset token');
  }

  if (decoded.type !== 'reset') {
    throw ApiError.badRequest('Invalid token type');
  }

  const user = await User.findById(decoded.userId).select('+passwordHash');
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  user.passwordHash = newPassword;
  await user.save();
}

/**
 * Verify email address with verification token.
 * @param {string} token
 */
async function verifyEmail(token) {
  let decoded;
  try {
    decoded = verifyEmailToken(token);
  } catch {
    throw ApiError.badRequest('Invalid or expired verification token');
  }

  if (decoded.type !== 'verify') {
    throw ApiError.badRequest('Invalid token type');
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  user.isEmailVerified = true;
  await user.save();
}

/**
 * Generate and send OTP SMS to a mobile number via DoveSoft gateway.
 * @param {string} mobile
 */
async function sendOtp(mobile) {
  const smsService = require('./sms.service');
  return smsService.generateAndSendOtp(mobile);
}

/**
 * Verify OTP code submitted for a mobile number.
 * @param {string} mobile
 * @param {string} otp
 */
async function verifyOtp(mobile, otp) {
  const smsService = require('./sms.service');
  const isVerified = smsService.verifyOtp(mobile, otp);
  return {
    verified: isVerified,
    message: 'OTP verified successfully.',
  };
}

/**
 * Change password for an authenticated user.
 * Verifies current password before setting new password and invalidating refresh token.
 * @param {string} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.authProvider !== 'local' && !user.passwordHash) {
    throw ApiError.badRequest(
      `Your account is registered via ${user.authProvider}. Password change is not supported for OAuth accounts.`
    );
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password cannot be the same as current password');
  }

  user.passwordHash = newPassword;
  user.refreshToken = undefined;
  _sanitizeUserCoordinates(user);
  await user.save();
}

module.exports = {
  register,
  login,
  handleOAuthCallback,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  logout,
  sendOtp,
  verifyOtp,
  changePassword,
};
