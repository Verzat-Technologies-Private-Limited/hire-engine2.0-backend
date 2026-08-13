const logger = require('../../config/logger');

/**
 * Payment adapter factory.
 * Returns a payment adapter instance for the given provider name.
 * Unlike cache/queue adapters, payment adapters are NOT singletons —
 * different companies may use different providers based on their country.
 *
 * The country plugin determines which provider to use:
 *   const provider = countryPlugin.getPaymentProvider(); // 'stripe' | 'razorpay'
 *   const adapter = getPaymentAdapter(provider);
 *
 * Adapter instances ARE cached per provider to avoid re-initialization.
 */

/** @type {Map<string, import('./payment.adapter')>} */
const adapterCache = new Map();

/**
 * Get a payment adapter for the given provider.
 * @param {string} providerName - 'stripe' | 'razorpay'
 * @returns {import('./payment.adapter')}
 * @throws {Error} If provider is not supported
 */
function getPaymentAdapter(providerName) {
  if (adapterCache.has(providerName)) {
    return adapterCache.get(providerName);
  }

  let adapter;

  switch (providerName) {
    case 'stripe': {
      const StripeAdapter = require('./stripe.adapter');
      adapter = new StripeAdapter();
      break;
    }
    case 'razorpay': {
      const RazorpayAdapter = require('./razorpay.adapter');
      adapter = new RazorpayAdapter();
      break;
    }
    default:
      throw new Error(
        `Unsupported payment provider: "${providerName}". ` +
          'Supported providers: stripe, razorpay'
      );
  }

  adapterCache.set(providerName, adapter);
  logger.info(`Payment adapter cached for provider: ${providerName}`);
  return adapter;
}

module.exports = { getPaymentAdapter };
