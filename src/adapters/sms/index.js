const config = require('../../config');

/**
 * SMS adapter factory.
 * Returns a singleton SMS adapter based on SMS_DRIVER or presence of DoveSoft credentials.
 *
 * Supported drivers:
 * - 'console' (default if no credentials): Logs to console
 * - 'dovesoft': DoveSoft SMS API Gateway
 */

let instance = null;

function getSmsAdapter() {
  if (instance) return instance;

  const driver = config.sms?.driver || (config.dovesoft?.apiKey ? 'dovesoft' : 'console');

  switch (driver) {
    case 'dovesoft': {
      const DoveSoftSmsAdapter = require('./dovesoft.adapter');
      instance = new DoveSoftSmsAdapter();
      break;
    }
    case 'console':
    default: {
      const ConsoleSmsAdapter = require('./console.adapter');
      instance = new ConsoleSmsAdapter();
      break;
    }
  }

  return instance;
}

module.exports = { getSmsAdapter };
