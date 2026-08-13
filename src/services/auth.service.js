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

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    passwordHash: password,
    role: role || 'jobseeker',
    countryCode: countryCode ? countryCode.toUpperCase() : '',
    authProvider: 'local',
  });

  // Generate tokens
  const tokens = generateTokenPair(user);

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

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  const tokens = generateTokenPair(user);

  return {
    user: user.toJSON(),
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

  const user = await User.findById(decoded.userId);
  if (!user || user.status !== 'active') {
    throw ApiError.unauthorized('User not found or account inactive');
  }

  return generateTokenPair(user);
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

module.exports = {
  register,
  login,
  handleOAuthCallback,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  sendOtp,
  verifyOtp,
};
