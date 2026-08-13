const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Rate limiter middleware configurations.
 * Each limiter targets a specific route group with appropriate thresholds.
 */

// ── Global rate limiter (applies to all routes) ───
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests. Please try again later.',
  },
});

// ── Auth-specific rate limiter (strict) ───────────
// Login/register attempts — prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// ── Application submission rate limiter ───────────
// Prevent spam applications
const applicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 applications per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Application limit reached. You can submit more applications in an hour.',
  },
});

// ── Search rate limiter (moderate) ────────────────
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 searches per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many search requests. Please slow down.',
  },
});

// ── File upload rate limiter ──────────────────────
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Upload limit reached. Please try again later.',
  },
});

module.exports = {
  globalLimiter,
  authLimiter,
  applicationLimiter,
  searchLimiter,
  uploadLimiter,
};
