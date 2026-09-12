const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/tokens');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Authentication middleware.
 * Extracts JWT from Authorization header, verifies it,
 * and attaches the full user document to req.user.
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  // 1. Extract token from header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Access token is required. Provide it as: Authorization: Bearer <token>');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw ApiError.unauthorized('Access token is malformed');
  }

  // 2. Verify token
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token has expired. Please refresh your token.');
    }
    throw ApiError.unauthorized('Invalid access token');
  }

  // 3. Find user and verify they still exist / are active
  const user = await User.findById(decoded.userId).select('-passwordHash').lean();

  if (!user) {
    throw ApiError.unauthorized('User associated with this token no longer exists');
  }

  if (user.status === 'suspended') {
    throw ApiError.forbidden('Your account has been suspended. Contact support for assistance.');
  }

  if (user.status === 'banned') {
    throw ApiError.forbidden('Your account has been permanently banned.');
  }

  // 4. Attach user to request
  req.user = user;

  // 5. Attach company and team membership context (req.company & req.companyMember)
  if (user.company || user.role === 'employer') {
    const Company = require('../models/Company');
    const { TeamPermission } = require('../utils/constants');
    const company = user.company
      ? await Company.findById(user.company)
      : await Company.findOne({ $or: [{ owner: user._id }, { 'teamMembers.user': user._id }] });

    if (company) {
      req.company = company;
      const isOwner = company.owner.toString() === user._id.toString();
      let permissions = [];
      if (isOwner) {
        permissions = Object.values(TeamPermission);
      } else {
        const member = company.teamMembers.find((m) => m.user.toString() === user._id.toString());
        permissions = member?.permissions || [];
      }

      req.companyMember = {
        isOwner,
        permissions,
        companyId: company._id,
      };
      req.isCompanyRejected = company.verificationStatus === 'rejected';
    } else {
      req.company = null;
      req.companyMember = null;
      req.isCompanyRejected = false;
    }
  } else {
    req.company = null;
    req.companyMember = null;
    req.isCompanyRejected = false;
  }

  next();
});

/**
 * Require approved company verification middleware.
 * Ensures the employer's company profile is fully approved before proceeding.
 */
const requireVerifiedCompany = (req, _res, next) => {
  if (!req.company) {
    throw ApiError.badRequest('No company profile found for this employer account');
  }

  if (req.company.verificationStatus === 'rejected') {
    throw ApiError.forbidden(
      req.company.verificationNotes
        ? `Your company profile was rejected: ${req.company.verificationNotes}`
        : 'Your company profile has been rejected by administration. Please contact support.'
    );
  }

  if (req.company.verificationStatus !== 'approved') {
    throw ApiError.forbidden(
      `Company profile verification is currently "${req.company.verificationStatus}". An approved company profile is required.`
    );
  }

  next();
};

/**
 * Optional authentication middleware.
 * If a token is present, it verifies and attaches the user.
 * If no token, continues without error (req.user = null).
 * Useful for public routes that behave differently for authenticated users.
 */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('-passwordHash').lean();
    req.user = user || null;
  } catch {
    req.user = null;
  }

  next();
});

module.exports = { authenticate, optionalAuth, requireVerifiedCompany };
