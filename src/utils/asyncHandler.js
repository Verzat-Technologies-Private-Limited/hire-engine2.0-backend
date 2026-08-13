/**
 * Higher-order function that wraps async Express route handlers.
 * Catches rejected promises and forwards errors to Express error middleware.
 *
 * Usage:
 *   router.get('/users', asyncHandler(async (req, res) => { ... }));
 *
 * Without this wrapper, unhandled promise rejections in async handlers
 * would crash the process or result in hanging requests.
 *
 * @param {Function} fn - Async Express route handler (req, res, next)
 * @returns {Function} Wrapped handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
