// geocode.js
require('dotenv').config();
const opencage = require('opencage-api-client');

/**
 * Converts an address string or PIN code to latitude and longitude.
 * @param {string} locationInput - The address or PIN code to search.
 * @param {string} countryCode - (Optional) 2-letter ISO country code to restrict results.
 */
async function getCoordinates(locationInput, countryCode = '') {
  try {
    // 1. Check if input is empty
    if (!locationInput || locationInput.trim() === '') {
      throw new Error('Input location cannot be empty');
    }

    // 2. Configure the request parameters
    const requestOptions = {
      q: locationInput,
      limit: 1,               // We only want the top match
      no_annotations: 1,      // Reduces payload size by excluding timezone/currency info
    };

    // Add country restriction if provided (e.g., 'gb' for UK, 'in' for India)
    if (countryCode) {
      requestOptions.countrycode = countryCode;
    }

    // 3. Execute the API call using the opencage client
    // Note: The client automatically uses process.env.OPENCAGE_API_KEY
    const data = await opencage.geocode(requestOptions);

    // 4. Handle HTTP success but empty results (address not found)
    if (data.status.code === 200 && data.results.length > 0) {
      const bestMatch = data.results[0];
      
      return {
        success: true,
        formattedAddress: bestMatch.formatted,
        latitude: bestMatch.geometry.lat,
        longitude: bestMatch.geometry.lng,
        confidence: bestMatch.confidence // 1 (low) to 10 (high)
      };
    } else {
      return {
        success: false,
        message: 'No results found for this address.'
      };
    }

  } catch (error) {
    // 5. Graceful Error Handling
    // The OpenCage API client wraps API errors nicely
    console.error('Geocoding Error:', error.message);
    
    // Check if it's a specific API error (like 402 Quota Exceeded or 403 Forbidden)
    if (error.status && error.status.code) {
       console.error(`API Error Code: ${error.status.code} - ${error.status.message}`);
    }

    return {
      success: false,
      message: 'Failed to geocode address due to a server error.'
    };
  }
}

// ==========================================
// Example Usage
// ==========================================
(async () => {
  console.log("Searching for PIN Code 'SW1A 1AA' in the UK...");
  const result1 = await getCoordinates('412206', 'in');
  console.log(result1);

  console.log("\nSearching for 'Eiffel Tower' in France...");
  const result2 = await getCoordinates('Eiffel Tower', 'fr');
  console.log(result2);
})();