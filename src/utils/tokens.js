const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * JWT token utilities.
 * Generates and verifies access and refresh tokens.
 */

/**
 * Generate an access token.
 * @param {object} payload - Data to encode (userId, role)
 * @returns {string} JWT access token
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry,
  });
}

/**
 * Generate a refresh token.
 * @param {object} payload - Data to encode (userId)
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry,
  });
}

/**
 * Generate both access and refresh tokens for a user.
 * @param {object} user - User document with _id and role
 * @returns {{ accessToken: string, refreshToken: string }}
 */
function generateTokenPair(user) {
  const accessToken = generateAccessToken({
    userId: user._id,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    userId: user._id,
  });

  return { accessToken, refreshToken };
}

/**
 * Verify an access token.
 * @param {string} token
 * @returns {object} Decoded payload
 * @throws {jwt.JsonWebTokenError|jwt.TokenExpiredError}
 */
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

/**
 * Verify a refresh token.
 * @param {string} token
 * @returns {object} Decoded payload
 * @throws {jwt.JsonWebTokenError|jwt.TokenExpiredError}
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

/**
 * Generate a short-lived token for email verification / password reset.
 * @param {object} payload
 * @param {string} [expiresIn='1h']
 * @returns {string}
 */
function generateEmailToken(payload, expiresIn = '1h') {
  return jwt.sign(payload, config.jwt.accessSecret, { expiresIn });
}

/**
 * Verify an email token.
 * @param {string} token
 * @returns {object} Decoded payload
 */
function verifyEmailToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  generateEmailToken,
  verifyEmailToken,
};
