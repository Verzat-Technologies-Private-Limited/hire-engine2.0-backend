const config = require('../../config');

/**
 * Geocode adapter factory.
 * Returns a singleton geocode adapter instance based on GEOCODE_PROVIDER env var.
 *
 * Supported providers:
 * - 'opencage' (default): OpenCage Geocoding API
 * - 'none': Disabled — all geocode calls return null
 */

let instance = null;

/**
 * Get the geocode adapter singleton.
 * @returns {import('./geocode.adapter')}
 */
function getGeocodeAdapter() {
  if (instance) return instance;

  const provider = config.geocode.provider;

  switch (provider) {
    case 'opencage': {
      const OpenCageGeocodeAdapter = require('./opencage.adapter');
      instance = new OpenCageGeocodeAdapter(config.geocode.opencageApiKey);
      break;
    }
    case 'none':
    default: {
      // Return a no-op adapter that always returns null
      const GeocodeAdapter = require('./geocode.adapter');
      instance = new GeocodeAdapter();
      // Override methods to return null instead of throwing
      instance.forward = async () => null;
      instance.reverse = async () => null;
      break;
    }
  }

  return instance;
}

module.exports = { getGeocodeAdapter };
