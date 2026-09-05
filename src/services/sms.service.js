const crypto = require('crypto');
const https = require('https');
const http = require('http');
const config = require('../config');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

/**
 * In-memory OTP cache store (Mobile -> { otp, expiresAt, attempts })
 * Map TTL cleanup runs automatically.
 */
const otpStore = new Map();

// Periodic cleanup of expired OTPs every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [mobile, data] of otpStore.entries()) {
    if (data.expiresAt <= now) {
      otpStore.delete(mobile);
    }
  }
}, 2 * 60 * 1000).unref();

/**
 * Generate a cryptographically secure numeric OTP.
 * @param {number} length - Number of digits (default: 6)
 * @returns {string} OTP string
 */
function generateOtp(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const num = crypto.randomInt(min, max + 1);
  return num.toString().padStart(length, '0');
}

const { getSmsAdapter } = require('../adapters/sms');

/**
 * Dispatch OTP SMS via configured SMS Adapter (DoveSoft or Console stub).
 * @param {string} mobile - Recipient phone number
 * @param {string} otp - OTP code
 * @param {number} [ttlSeconds=300] - Expiry in seconds
 * @returns {Promise<any>} Adapter response
 */
async function sendOtpSMS(mobile, otp, ttlSeconds = 300) {
  const adapter = getSmsAdapter();
  return adapter.sendOtp({
    to: mobile,
    otp,
    ttlMinutes: Math.floor(ttlSeconds / 60) || 5,
  });
}

/**
 * Generate, store, and send OTP to mobile.
 * @param {string} mobile - Recipient mobile number
 * @param {number} ttlSeconds - Expiration time in seconds (default: 300s = 5m)
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function generateAndSendOtp(mobile, ttlSeconds = 300) {
  if (!mobile || typeof mobile !== 'string') {
    throw ApiError.badRequest('A valid mobile number is required');
  }

  const cleanMobile = mobile.trim();
  const otp = generateOtp(6);
  const expiresAt = Date.now() + ttlSeconds * 1000;

  // Store OTP
  otpStore.set(cleanMobile, {
    otp,
    expiresAt,
    attempts: 0,
  });

  await sendOtpSMS(cleanMobile, otp);

  return {
    success: true,
    message: `OTP sent successfully to ${cleanMobile}. Valid for ${Math.floor(ttlSeconds / 60)} minutes.`,
  };
}

/**
 * Verify OTP for mobile.
 * @param {string} mobile - Mobile number
 * @param {string} candidateOtp - OTP supplied by user
 * @returns {boolean} true if valid
 */
function verifyOtp(mobile, candidateOtp) {
  if (!mobile || !candidateOtp) {
    throw ApiError.badRequest('Mobile number and OTP are required');
  }

  const cleanMobile = mobile.trim();
  const record = otpStore.get(cleanMobile);

  if (!record) {
    throw ApiError.badRequest('OTP expired or not requested. Please request a new OTP.');
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanMobile);
    throw ApiError.badRequest('OTP has expired. Please request a new OTP.');
  }

  record.attempts += 1;
  if (record.attempts > 5) {
    otpStore.delete(cleanMobile);
    throw ApiError.badRequest('Too many failed attempts. Please request a new OTP.');
  }

  if (record.otp !== candidateOtp.toString().trim()) {
    throw ApiError.badRequest('Invalid OTP code. Please check and try again.');
  }

  // OTP verified successfully - invalidate to prevent reuse
  otpStore.delete(cleanMobile);
  return true;
}

module.exports = {
  generateOtp,
  sendOtpSMS,
  generateAndSendOtp,
  verifyOtp,
  _otpStore: otpStore,
};
