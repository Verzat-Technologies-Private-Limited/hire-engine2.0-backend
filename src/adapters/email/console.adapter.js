const EmailAdapter = require('./email.adapter');
const logger = require('../../config/logger');

/**
 * Console email adapter (development stub).
 * Logs email content to the console instead of sending it.
 * Useful for local development without email credentials.
 */
class ConsoleEmailAdapter extends EmailAdapter {
  constructor() {
    super();
    logger.info('Email adapter initialized: console (dev stub — emails will be logged, not sent)');
  }

  async sendEmail({ to, subject, html, text, from, fromName }) {
    const messageId = `console_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    logger.info('────────────── EMAIL (Console Stub) ──────────────');
    logger.info(`  From:    ${fromName || 'Hire Engine'} <${from || 'noreply@hireengine.com'}>`);
    logger.info(`  To:      ${to}`);
    logger.info(`  Subject: ${subject}`);
    logger.info(`  Body:    ${text || html?.replace(/<[^>]*>/g, '').substring(0, 200)}...`);
    logger.info(`  ID:      ${messageId}`);
    logger.info('──────────────────────────────────────────────────');

    return {
      messageId,
      status: 'logged',
    };
  }

  async sendBulkEmail({ recipients, subject, html, text }) {
    logger.info(`────────────── BULK EMAIL (Console Stub) ──────────────`);
    logger.info(`  Subject:    ${subject}`);
    logger.info(`  Recipients: ${recipients.length}`);
    logger.info(`  Emails:     ${recipients.map((r) => r.email).join(', ')}`);
    logger.info(`  Body:       ${text || html?.replace(/<[^>]*>/g, '').substring(0, 200)}...`);
    logger.info(`────────────────────────────────────────────────────────`);

    return {
      sent: recipients.length,
      failed: 0,
    };
  }
}

module.exports = ConsoleEmailAdapter;
