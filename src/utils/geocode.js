const { getGeocodeAdapter } = require('../adapters/geocode');
const logger = require('../config/logger');

/**
 * Geocode a location object by converting text fields (city, state, country)
 * into GeoJSON coordinates. Skips geocoding if valid coordinates are already present.
 *
 * This is a non-blocking, best-effort utility — returns the original location
 * unchanged if geocoding fails or is disabled.
 *
 * @param {object} location - Location object from User or Job model
 * @param {string} [location.address]
 * @param {string} [location.city]
 * @param {string} [location.state]
 * @param {string} [location.country]
 * @param {string} [location.postalCode]
 * @param {object} [location.coordinates]
 * @returns {Promise<object>} Enriched location object with coordinates filled in
 */
async function geocodeLocation(location) {
  if (!location) return location;

  // Skip if valid coordinates are already present (not [0,0] and not empty)
  if (_hasValidCoordinates(location)) {
    return location;
  }

  // Build a query string from available text fields
  const queryParts = [];
  if (location.address) queryParts.push(location.address);
  if (location.city) queryParts.push(location.city);
  if (location.state) queryParts.push(location.state);
  if (location.postalCode) queryParts.push(location.postalCode);
  if (location.country) queryParts.push(location.country);

  const query = queryParts.join(', ').trim();
  if (!query) return location;

  try {
    const geocoder = getGeocodeAdapter();
    const result = await geocoder.forward(query);

    if (!result) return location;

    // Enrich the location with geocoded coordinates
    const enriched = { ...location };

    enriched.coordinates = {
      type: 'Point',
      coordinates: [result.lng, result.lat], // GeoJSON: [longitude, latitude]
    };

    // Backfill missing text fields from geocode response
    if (!enriched.city && result.city) enriched.city = result.city;
    if (!enriched.state && result.state) enriched.state = result.state;
    if (!enriched.country && result.country) enriched.country = result.country;
    if (!enriched.postalCode && result.postalCode) enriched.postalCode = result.postalCode;

    logger.debug('[Geocode] Location enriched', {
      query,
      lat: result.lat,
      lng: result.lng,
    });

    return enriched;
  } catch (err) {
    logger.error('[Geocode] geocodeLocation failed, returning original', {
      error: err.message,
    });
    return location;
  }
}

/**
 * Check if a location object has valid (non-zero) coordinates.
 * @param {object} location
 * @returns {boolean}
 */
function _hasValidCoordinates(location) {
  const coords = location?.coordinates?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return false;

  const [lng, lat] = coords;
  // Treat [0, 0] as invalid (Null Island)
  if (lng === 0 && lat === 0) return false;
  // Validate ranges
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;

  return true;
}

module.exports = { geocodeLocation, _hasValidCoordinates };
