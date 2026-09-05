const https = require('https');
const http = require('http');
const SmsAdapter = require('./sms.adapter');
const config = require('../../config');
const logger = require('../../config/logger');
const ApiError = require('../../utils/ApiError');

/**
 * DoveSoft SMS gateway adapter.
 * Handles transactional SMS and OTP dispatches for production / live gateways.
 */
class DoveSoftSmsAdapter extends SmsAdapter {
  constructor() {
    super();
    this.key = config.dovesoft?.apiKey || process.env.DOVESOFT_API_KEY;
    this.senderid = config.dovesoft?.senderId || process.env.DOVESOFT_SENDER_ID;
    this.entityid = config.dovesoft?.entityId || process.env.DOVESOFT_ENTITY_ID;
    this.tempid = config.dovesoft?.templateId || process.env.DOVESOFT_TEMPLATE_ID;
    logger.info('SMS adapter initialized: DoveSoft API Gateway');
  }

  _httpGet(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client
        .get(url, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(data);
            }
          });
        })
        .on('error', (err) => reject(err));
    });
  }

  async sendSms({ to, message }) {
    if (!this.key || process.env.NODE_ENV === 'test') {
      logger.info(`Sending OTP SMS to ${to} via DoveSoft API Gateway`);
      logger.info(`[DoveSoft Mock SMS] Mobile: ${to}, Message: ${message}`);
      return { status: 'success', message: 'SMS sent (mock)', to };
    }

    const url = `https://api.dovesoft.io/api/sendsms?key=${encodeURIComponent(
      this.key || ''
    )}&mobiles=${encodeURIComponent(to)}&sms=${encodeURIComponent(
      message
    )}&senderid=${encodeURIComponent(this.senderid || '')}&entityid=${encodeURIComponent(
      this.entityid || ''
    )}&tempid=${encodeURIComponent(this.tempid || '')}`;

    logger.info(`Sending SMS to ${to} via DoveSoft API Gateway`);

    try {
      const response = await this._httpGet(url);
      logger.info(`DoveSoft SMS API response for ${to}:`, { response });
      return response;
    } catch (error) {
      logger.error(`Failed to send SMS via DoveSoft to ${to}:`, { error: error.message });
      throw ApiError.internal(`Failed to send SMS OTP: ${error.message}`);
    }
  }

  async sendOtp({ to, otp, ttlMinutes = 5 }) {
    const message = `ZAT Chat: Your OTP for login is ${otp}. It is valid for ${ttlMinutes} minutes. Please do not share it with anyone. KISHANENT`;
    if (!this.key || process.env.NODE_ENV === 'test') {
      logger.info(`Sending OTP SMS to ${to} via DoveSoft API Gateway`);
      logger.info(`[DoveSoft Mock SMS] Mobile: ${to}, OTP: ${otp}`);
      return { status: 'success', message: 'OTP sent (mock)', otp };
    }
    return this.sendSms({ to, message });
  }
}

module.exports = DoveSoftSmsAdapter;
