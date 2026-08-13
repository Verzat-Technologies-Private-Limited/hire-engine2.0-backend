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
  next();
});

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

module.exports = { authenticate, optionalAuth };
