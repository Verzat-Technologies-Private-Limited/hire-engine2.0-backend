const SmsAdapter = require('./sms.adapter');
const logger = require('../../config/logger');

/**
 * Console SMS adapter (development/test stub).
 * Logs SMS content to console instead of dispatching via SMS gateway.
 */
class ConsoleSmsAdapter extends SmsAdapter {
  constructor() {
    super();
    logger.info('SMS adapter initialized: console (dev/test stub)');
  }

  async sendSms({ to, message }) {
    const messageId = `sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    logger.info('────────────── SMS (Console Stub) ──────────────');
    logger.info(`  To:      ${to}`);
    logger.info(`  Message: ${message}`);
    logger.info(`  ID:      ${messageId}`);
    logger.info('────────────────────────────────────────────────');

    return {
      status: 'success',
      provider: 'console',
      messageId,
    };
  }

  async sendOtp({ to, otp, ttlMinutes = 5 }) {
    const message = `Hire Engine: Your OTP code is ${otp}. Valid for ${ttlMinutes} minutes. Do not share this code.`;
    logger.info(`[DoveSoft Mock SMS] Mobile: ${to}, OTP: ${otp}`);
    return this.sendSms({ to, message });
  }
}

module.exports = ConsoleSmsAdapter;
