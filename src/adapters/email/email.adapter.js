/**
 * Email adapter interface (abstract base class).
 * All email provider implementations must extend this class.
 *
 * Implementations:
 * - SendGridAdapter: SendGrid transactional email (production)
 * - ConsoleAdapter: Logs email to console (development)
 */
class EmailAdapter {
  /**
   * Send a single email.
   * @param {object} params
   * @param {string} params.to - Recipient email
   * @param {string} params.subject - Email subject
   * @param {string} params.html - HTML body
   * @param {string} [params.text] - Plain text body (fallback)
   * @param {string} [params.from] - Sender email (overrides default)
   * @param {string} [params.fromName] - Sender name
   * @param {Array<{filename: string, content: Buffer}>} [params.attachments]
   * @returns {Promise<{ messageId: string, status: string }>}
   */
  async sendEmail(_params) {
    throw new Error('EmailAdapter.sendEmail() must be implemented');
  }

  /**
   * Send bulk emails (same template, multiple recipients).
   * @param {object} params
   * @param {Array<{ email: string, substitutions?: object }>} params.recipients
   * @param {string} params.subject - Email subject (supports {{variable}} placeholders)
   * @param {string} params.html - HTML body (supports {{variable}} placeholders)
   * @param {string} [params.text] - Plain text body
   * @returns {Promise<{ sent: number, failed: number }>}
   */
  async sendBulkEmail(_params) {
    throw new Error('EmailAdapter.sendBulkEmail() must be implemented');
  }
}

module.exports = EmailAdapter;
