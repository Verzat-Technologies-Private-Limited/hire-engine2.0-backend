const dotenv = require('dotenv');
const path = require('path');

// Load .env file from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Central configuration object.
 * All environment variables are read here and exported.
 * Fail-fast on missing required variables in production.
 */
const config = {
  // ── Server ──────────────────────────────────────
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  apiVersion: process.env.API_VERSION || 'v1',

  // ── MongoDB ─────────────────────────────────────
  mongodb: {
    uri:
      process.env.NODE_ENV === 'test'
        ? process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/hire-engine-test'
        : process.env.MONGODB_URI || 'mongodb://localhost:27017/hire-engine',
  },

  // ── JWT ─────────────────────────────────────────
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // ── OAuth — Google ──────────────────────────────
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:5000/api/v1/auth/google/callback',
  },

  // ── OAuth — LinkedIn ────────────────────────────
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    callbackUrl:
      process.env.LINKEDIN_CALLBACK_URL ||
      'http://localhost:5000/api/v1/auth/linkedin/callback',
  },

  // ── Cloudinary ──────────────────────────────────
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  // ── Email ───────────────────────────────────────
  email: {
    driver: process.env.EMAIL_DRIVER || 'console', // 'console' | 'sendgrid'
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
    from: process.env.EMAIL_FROM || 'noreply@hireengine.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Hire Engine',
  },

  // ── Cache ───────────────────────────────────────
  cache: {
    driver: process.env.CACHE_DRIVER || 'memory', // 'memory' | 'redis'
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // ── Queue ───────────────────────────────────────
  queue: {
    driver: process.env.QUEUE_DRIVER || 'memory', // 'memory' | 'bullmq'
  },

  // ── Payment — Stripe ────────────────────────────
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },

  // ── Payment — Razorpay ──────────────────────────
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },

  // ── Rate Limiting ───────────────────────────────
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 min
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // ── CORS ────────────────────────────────────────
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // ── Client URL ──────────────────────────────────
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',

  // ── DoveSoft SMS Gateway ────────────────────────
  dovesoft: {
    apiKey: process.env.DOVESOFT_API_KEY || '',
    senderId: process.env.DOVESOFT_SENDER_ID || '',
    entityId: process.env.DOVESOFT_ENTITY_ID || '',
    templateId: process.env.DOVESOFT_TEMPLATE_ID || '',
  },
};

/**
 * Validate required config in production.
 * Fails fast so deployment doesn't start with missing secrets.
 */
function validateProductionConfig() {
  const required = [
    ['jwt.accessSecret', config.jwt.accessSecret, 'dev-access-secret-change-in-production'],
    ['jwt.refreshSecret', config.jwt.refreshSecret, 'dev-refresh-secret-change-in-production'],
    ['mongodb.uri', config.mongodb.uri],
  ];

  const missing = [];

  for (const [name, value, devDefault] of required) {
    if (!value || value === devDefault) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `FATAL: Missing required config in production: ${missing.join(', ')}. ` +
        'Set these environment variables before starting the server.'
    );
  }
}

if (config.env === 'production') {
  validateProductionConfig();
}

module.exports = config;
