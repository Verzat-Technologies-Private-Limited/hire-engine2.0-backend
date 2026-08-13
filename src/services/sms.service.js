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

/**
 * Helper to make HTTP GET request.
 * @param {string} url
 * @returns {Promise<any>}
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch {
            resolve(data);
          }
        });
      })
      .on('error', (err) => reject(err));
  });
}

/**
 * Dispatch OTP SMS via DoveSoft API gateway.
 * @param {string} mobile - Recipient phone number
 * @param {string} otp - OTP code
 * @returns {Promise<any>} API response
 */
async function sendOtpSMS(mobile, otp) {
  const key = config.dovesoft.apiKey || process.env.DOVESOFT_API_KEY;
  const senderid = config.dovesoft.senderId || process.env.DOVESOFT_SENDER_ID;
  const entityid = config.dovesoft.entityId || process.env.DOVESOFT_ENTITY_ID;
  const tempid = config.dovesoft.templateId || process.env.DOVESOFT_TEMPLATE_ID;

  const sms = `ZAT Chat: Your OTP for login is ${otp}. It is valid for 5 minutes. Please do not share it with anyone. KISHANENT`;
  const url = `https://api.dovesoft.io/api/sendsms?key=${encodeURIComponent(
    key || ''
  )}&mobiles=${encodeURIComponent(mobile)}&sms=${encodeURIComponent(
    sms
  )}&senderid=${encodeURIComponent(senderid || '')}&entityid=${encodeURIComponent(
    entityid || ''
  )}&tempid=${encodeURIComponent(tempid || '')}`;

  logger.info(`Sending OTP SMS to ${mobile} via DoveSoft API Gateway`);

  // In test/development environment without API key, mock response
  if (!key || process.env.NODE_ENV === 'test') {
    logger.info(`[DoveSoft Mock SMS] Mobile: ${mobile}, OTP: ${otp}`);
    return { status: 'success', message: 'OTP sent (mock)', otp };
  }

  try {
    const response = await httpGet(url);
    logger.info(`DoveSoft SMS API response for ${mobile}:`, { response });
    return response;
  } catch (error) {
    logger.error(`Failed to send SMS via DoveSoft to ${mobile}:`, { error: error.message });
    throw ApiError.internal(`Failed to send SMS OTP: ${error.message}`);
  }
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
