/**
 * Geocode adapter interface (abstract base class).
 * All geocoding implementations must extend this class.
 *
 * Implementations:
 * - OpenCageGeocodeAdapter: OpenCage Geocoding API (default)
 */
class GeocodeAdapter {
  /**
   * Forward geocode: convert an address string to coordinates.
   * @param {string} addressString - Free-text address (e.g. "Mumbai, India")
   * @returns {Promise<{ lat: number, lng: number, formattedAddress: string, city: string, state: string, country: string, countryCode: string, postalCode: string } | null>}
   */
  async forward(_addressString) {
    throw new Error('GeocodeAdapter.forward() must be implemented');
  }

  /**
   * Reverse geocode: convert coordinates to an address.
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<{ formattedAddress: string, city: string, state: string, country: string, countryCode: string, postalCode: string } | null>}
   */
  async reverse(_lat, _lng) {
    throw new Error('GeocodeAdapter.reverse() must be implemented');
  }
}

module.exports = GeocodeAdapter;
