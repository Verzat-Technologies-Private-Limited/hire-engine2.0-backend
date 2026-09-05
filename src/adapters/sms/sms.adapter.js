/**
 * SMS adapter interface (abstract base class).
 * All SMS provider implementations must extend this class.
 *
 * Implementations:
 * - ConsoleSmsAdapter: Logs SMS to console (development/test)
 * - DoveSoftSmsAdapter: DoveSoft SMS gateway (production)
 */
class SmsAdapter {
  /**
   * Send a general SMS text message.
   * @param {object} params
   * @param {string} params.to - Recipient phone number
   * @param {string} params.message - SMS message body
   * @returns {Promise<{ status: string, messageId?: string, [key: string]: any }>}
   */
  async sendSms(_params) {
    throw new Error('SmsAdapter.sendSms() must be implemented');
  }

  /**
   * Send an OTP verification code SMS.
   * @param {object} params
   * @param {string} params.to - Recipient phone number
   * @param {string} params.otp - OTP verification code
   * @param {number} [params.ttlMinutes=5] - Expiry in minutes
   * @returns {Promise<{ status: string, messageId?: string, [key: string]: any }>}
   */
  async sendOtp(_params) {
    throw new Error('SmsAdapter.sendOtp() must be implemented');
  }
}

module.exports = SmsAdapter;
