const winston = require('winston');
const config = require('./index');

/**
 * Winston logger configuration.
 * - Production: JSON format (structured logs for log aggregation)
 * - Development: Colorized, human-readable console output
 */

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan',
};

winston.addColors(colors);

// Determine log level based on environment
const level = config.env === 'development' ? 'debug' : 'info';

// ── Format definitions ────────────────────────────

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level: lvl, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${lvl}]: ${message}${metaStr}`;
  })
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ── Transport definitions ─────────────────────────

const transports = [];

// Console transport — always active
transports.push(
  new winston.transports.Console({
    format: config.env === 'production' ? prodFormat : devFormat,
  })
);

// File transport — production only
if (config.env === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: prodFormat,
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: prodFormat,
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 10,
    })
  );
}

// ── Create logger instance ────────────────────────

const logger = winston.createLogger({
  level,
  levels,
  transports,
  // Don't exit on uncaught exceptions — let the process handler deal with it
  exitOnError: false,
});

module.exports = logger;
