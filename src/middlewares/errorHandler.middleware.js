const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const config = require('../config');

/**
 * Global error handler middleware.
 * Must be registered LAST in the Express middleware chain (after all routes).
 *
 * Handles:
 * - ApiError (operational errors) — sends structured error response
 * - Mongoose ValidationError — maps to 400
 * - Mongoose CastError (invalid ObjectId) — maps to 400
 * - Mongoose 11000 (duplicate key) — maps to 409
 * - JWT errors — maps to 401
 * - Multer errors — maps to 400
 * - Unknown errors — maps to 500 (hides details in production)
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let error = { ...err, message: err.message, stack: err.stack };

  // ── Mongoose Validation Error ─────────────────
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
      type: 'validation',
    }));
    error = ApiError.badRequest('Validation failed', errors);
  }

  // ── Mongoose Cast Error (invalid ObjectId) ────
  if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }

  // ── Mongoose Duplicate Key Error ──────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = ApiError.conflict(`Duplicate value for "${field}". This ${field} already exists.`);
  }

  // ── JWT Errors ────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token');
  }
  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token has expired');
  }

  // ── Multer Errors ─────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = ApiError.badRequest('File size exceeds the allowed limit');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = ApiError.badRequest(`Unexpected file field: ${err.field}`);
  }

  // ── Determine status code ─────────────────────
  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational !== undefined ? error.isOperational : false;

  // ── Log the error ─────────────────────────────
  if (statusCode >= 500) {
    logger.error('Server error', {
      statusCode,
      message: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?._id,
    });
  } else {
    logger.warn('Client error', {
      statusCode,
      message: error.message,
      url: req.originalUrl,
      method: req.method,
    });
  }

  // ── Send response ─────────────────────────────
  const response = {
    success: false,
    statusCode,
    message: isOperational || statusCode < 500
      ? error.message
      : 'An unexpected error occurred. Please try again later.',
  };

  // Include validation errors array if present
  if (error.errors && error.errors.length > 0) {
    response.errors = error.errors;
  }

  // Include stack trace in development only
  if (config.env === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
