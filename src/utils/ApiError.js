/**
 * Custom API error class.
 * Extends native Error with HTTP status code and operational flag.
 *
 * - Operational errors: expected failures (validation, auth, not found) — safe to send to client.
 * - Programmer errors: bugs — should NOT leak details to client in production.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {object} [options]
   * @param {boolean} [options.isOperational=true] - Whether this is an expected operational error
   * @param {Array} [options.errors=[]] - Detailed validation errors array
   * @param {string} [options.stack] - Custom stack trace
   */
  constructor(statusCode, message, { isOperational = true, errors = [], stack } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // ── Factory methods for common errors ─────────────

  static badRequest(message = 'Bad request', errors = []) {
    return new ApiError(400, message, { errors });
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, { isOperational: false });
  }
}

module.exports = ApiError;
