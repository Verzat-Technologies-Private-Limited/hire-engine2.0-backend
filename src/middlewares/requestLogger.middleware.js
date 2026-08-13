const morgan = require('morgan');
const logger = require('../config/logger');
const config = require('../config');

/**
 * HTTP request logging middleware.
 * Uses Morgan to log incoming requests, piped through Winston logger.
 *
 * - Development: 'dev' format (colorized, concise)
 * - Production: 'combined' format (Apache-style, structured)
 */

// Custom Morgan stream that writes to Winston
const stream = {
  write: (message) => {
    // Remove trailing newline that Morgan adds
    logger.http(message.trim());
  },
};

// Skip logging in test environment to keep test output clean
const skip = () => config.env === 'test';

const requestLogger =
  config.env === 'development'
    ? morgan('dev', { stream, skip })
    : morgan('combined', { stream, skip });

module.exports = requestLogger;
