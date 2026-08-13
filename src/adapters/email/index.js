const config = require('../../config');

/**
 * Email adapter factory.
 * Returns a singleton email adapter based on EMAIL_DRIVER env var.
 *
 * Supported drivers:
 * - 'console' (default): Logs to console — for development
 * - 'sendgrid': SendGrid — for production
 */

let instance = null;

/**
 * Get the email adapter singleton.
 * @returns {import('./email.adapter')}
 */
function getEmailAdapter() {
  if (instance) return instance;

  const driver = config.email.driver;

  switch (driver) {
    case 'sendgrid': {
      const SendGridAdapter = require('./sendgrid.adapter');
      instance = new SendGridAdapter();
      break;
    }
    case 'console':
    default: {
      const ConsoleEmailAdapter = require('./console.adapter');
      instance = new ConsoleEmailAdapter();
      break;
    }
  }

  return instance;
}

module.exports = { getEmailAdapter };
