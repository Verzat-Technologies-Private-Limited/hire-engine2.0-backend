const GeocodeAdapter = require('./geocode.adapter');
const { getCacheAdapter } = require('../cache');
const logger = require('../../config/logger');

/**
 * OpenCage Geocoding API adapter.
 * Uses the OpenCage REST API for forward and reverse geocoding.
 * Results are cached via the app's cache adapter (Redis/memory) to reduce API calls.
 *
 * Free tier: 2,500 requests/day — no credit card required.
 * @see https://opencagedata.com/api
 */
class OpenCageGeocodeAdapter extends GeocodeAdapter {
  /**
   * @param {string} apiKey - OpenCage API key
   * @param {object} [options]
   * @param {number} [options.cacheTtl=2592000] - Cache TTL in seconds (default: 30 days)
   * @param {number} [options.timeoutMs=5000] - Request timeout in milliseconds
   */
  constructor(apiKey, options = {}) {
    super();

    if (!apiKey) {
      logger.warn('OpenCage API key is not set — geocoding will be disabled');
    }

    this._apiKey = apiKey;
    this._baseUrl = 'https://api.opencagedata.com/geocode/v1/json';
    this._cacheTtl = options.cacheTtl || 30 * 24 * 60 * 60; // 30 days
    this._timeoutMs = options.timeoutMs || 5000;
  }

  /**
   * Forward geocode: convert an address string to coordinates.
   * @param {string} addressString
   * @returns {Promise<{ lat: number, lng: number, formattedAddress: string, city: string, state: string, country: string, countryCode: string, postalCode: string } | null>}
   */
  async forward(addressString) {
    if (!this._apiKey || !addressString) return null;

    const query = addressString.trim();
    if (!query) return null;

    const cacheKey = `geocode:fwd:${query.toLowerCase()}`;

    // Check cache first
    try {
      const cache = getCacheAdapter();
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.debug('[Geocode] Cache hit for forward geocode', { query });
        return cached;
      }
    } catch (err) {
      logger.debug('[Geocode] Cache lookup failed, proceeding with API call', {
        error: err.message,
      });
    }

    // Call OpenCage API
    try {
      const url = new URL(this._baseUrl);
      url.searchParams.set('q', query);
      url.searchParams.set('key', this._apiKey);
      url.searchParams.set('limit', '1');
      url.searchParams.set('no_annotations', '1');

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(this._timeoutMs),
      });

      if (!response.ok) {
        logger.error('[Geocode] OpenCage API error', {
          status: response.status,
          statusText: response.statusText,
        });
        return null;
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        logger.debug('[Geocode] No results for query', { query });
        return null;
      }

      const result = data.results[0];
      const components = result.components || {};

      const parsed = {
        lat: result.geometry.lat,
        lng: result.geometry.lng,
        formattedAddress: result.formatted || '',
        city:
          components.city ||
          components.town ||
          components.village ||
          components.county ||
          '',
        state: components.state || components.state_district || '',
        country: components.country || '',
        countryCode: (components.country_code || '').toUpperCase(),
        postalCode: components.postcode || '',
      };

      // Cache the result
      try {
        const cache = getCacheAdapter();
        await cache.set(cacheKey, parsed, this._cacheTtl);
      } catch (err) {
        logger.debug('[Geocode] Failed to cache geocode result', { error: err.message });
      }

      logger.info('[Geocode] Forward geocoded successfully', {
        query,
        lat: parsed.lat,
        lng: parsed.lng,
        country: parsed.countryCode,
      });

      return parsed;
    } catch (err) {
      logger.error('[Geocode] Forward geocode failed', {
        query,
        error: err.message,
      });
      return null;
    }
  }

  /**
   * Reverse geocode: convert coordinates to an address.
   * @param {number} lat
   * @param {number} lng
   * @returns {Promise<{ formattedAddress: string, city: string, state: string, country: string, countryCode: string, postalCode: string } | null>}
   */
  async reverse(lat, lng) {
    if (!this._apiKey) return null;
    if (lat == null || lng == null) return null;

    const cacheKey = `geocode:rev:${lat.toFixed(5)},${lng.toFixed(5)}`;

    // Check cache first
    try {
      const cache = getCacheAdapter();
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.debug('[Geocode] Cache hit for reverse geocode', { lat, lng });
        return cached;
      }
    } catch (err) {
      logger.debug('[Geocode] Cache lookup failed', { error: err.message });
    }

    try {
      const url = new URL(this._baseUrl);
      url.searchParams.set('q', `${lat},${lng}`);
      url.searchParams.set('key', this._apiKey);
      url.searchParams.set('limit', '1');
      url.searchParams.set('no_annotations', '1');

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(this._timeoutMs),
      });

      if (!response.ok) {
        logger.error('[Geocode] OpenCage reverse API error', {
          status: response.status,
        });
        return null;
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return null;
      }

      const result = data.results[0];
      const components = result.components || {};

      const parsed = {
        formattedAddress: result.formatted || '',
        city:
          components.city ||
          components.town ||
          components.village ||
          components.county ||
          '',
        state: components.state || components.state_district || '',
        country: components.country || '',
        countryCode: (components.country_code || '').toUpperCase(),
        postalCode: components.postcode || '',
      };

      // Cache the result
      try {
        const cache = getCacheAdapter();
        await cache.set(cacheKey, parsed, this._cacheTtl);
      } catch (err) {
        logger.debug('[Geocode] Failed to cache reverse result', { error: err.message });
      }

      return parsed;
    } catch (err) {
      logger.error('[Geocode] Reverse geocode failed', {
        lat,
        lng,
        error: err.message,
      });
      return null;
    }
  }
}

module.exports = OpenCageGeocodeAdapter;
