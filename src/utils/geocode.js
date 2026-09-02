const { getGeocodeAdapter } = require('../adapters/geocode');
const logger = require('../config/logger');

/**
 * Geocode a location object by converting text fields (city, state, country)
 * into GeoJSON coordinates. Skips geocoding if valid coordinates are already present.
 *
 * Failure behaviour (production-safe):
 *   - If the geocode provider is disabled (GEOCODE_PROVIDER=none), the location
 *     text fields are stored as-is with no coordinates — this is fully valid.
 *   - If the provider API call fails (network error, quota exceeded, bad response),
 *     we log a warning and store the location without coordinates — the job/user is
 *     still saved successfully; only proximity search won't work for that record.
 *   - If the incoming location already has a malformed or partial `coordinates`
 *     subdocument (e.g. `{ type: 'Point' }` without the array), it is stripped
 *     so the 2dsphere index never receives invalid GeoJSON.
 *
 * @param {object} location - Location object from User or Job model
 * @param {string} [location.address]
 * @param {string} [location.city]
 * @param {string} [location.state]
 * @param {string} [location.country]
 * @param {string} [location.postalCode]
 * @param {object} [location.coordinates]
 * @returns {Promise<object>} Location object — with valid GeoJSON coordinates if
 *   geocoding succeeded, or without coordinates if it failed/was skipped.
 */
async function geocodeLocation(location) {
  if (!location) return location;

  // Always start by stripping any invalid/partial coordinates from the input.
  // This prevents `{ type: 'Point' }` (without the coordinates array) from
  // reaching the MongoDB 2dsphere index, which would cause a hard 500 error.
  const sanitized = _stripInvalidCoordinates({ ...location });

  // Skip geocoding if valid coordinates are already present (not [0,0] and not empty)
  if (_hasValidCoordinates(sanitized)) {
    return sanitized;
  }

  // Build a query string from available text fields
  const queryParts = [];
  if (sanitized.address) queryParts.push(sanitized.address);
  if (sanitized.city) queryParts.push(sanitized.city);
  if (sanitized.state) queryParts.push(sanitized.state);
  if (sanitized.postalCode) queryParts.push(sanitized.postalCode);
  if (sanitized.country) queryParts.push(sanitized.country);

  const query = queryParts.join(', ').trim();

  // No text to geocode — return sanitized location (no coordinates) and carry on
  if (!query) {
    logger.debug('[Geocode] No address text to geocode, skipping', { location: sanitized });
    return sanitized;
  }

  try {
    const geocoder = getGeocodeAdapter();
    const result = await geocoder.forward(query);

    if (!result) {
      // Provider is disabled (GEOCODE_PROVIDER=none) or returned no results.
      // This is not an error — save the record without coordinates.
      logger.debug('[Geocode] No geocode result, saving location without coordinates', { query });
      return sanitized;
    }

    // Validate the API result before trusting it
    if (!_isValidLatLng(result.lat, result.lng)) {
      logger.warn('[Geocode] API returned out-of-range coordinates, ignoring', {
        query,
        lat: result.lat,
        lng: result.lng,
      });
      return sanitized;
    }

    // Enrich the location with geocoded coordinates
    const enriched = { ...sanitized };

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
    // Geocoding failed (network timeout, quota exceeded, etc.)
    // We intentionally swallow the error: the record is saved without coordinates.
    // Proximity search won't work for this specific record, but the API call succeeds.
    logger.warn('[Geocode] Geocoding failed — saving location without coordinates', {
      query,
      error: err.message,
    });
    return sanitized; // Safe — no coordinates subdocument
  }
}

/**
 * Strip any malformed / partial GeoJSON coordinates subdocument from a location object.
 * Returns a shallow copy of the location with `coordinates` removed if it is invalid.
 * @param {object} location
 * @returns {object}
 */
function _stripInvalidCoordinates(location) {
  if (!location.coordinates) return location;

  if (_hasValidCoordinates(location)) return location;

  // Coordinates exist but are invalid — remove them entirely
  const clean = { ...location };
  delete clean.coordinates;
  return clean;
}

/**
 * Check if a location object has valid (non-zero, in-range) GeoJSON coordinates.
 * @param {object} location
 * @returns {boolean}
 */
function _hasValidCoordinates(location) {
  const coords = location?.coordinates?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return false;

  const [lng, lat] = coords;
  // Treat [0, 0] as invalid (Null Island)
  if (lng === 0 && lat === 0) return false;

  return _isValidLatLng(lat, lng);
}

/**
 * Check if lat/lng values are within valid geographic ranges.
 * @param {number} lat
 * @param {number} lng
 * @returns {boolean}
 */
function _isValidLatLng(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!isFinite(lat) || !isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

module.exports = { geocodeLocation, _hasValidCoordinates, _stripInvalidCoordinates };
