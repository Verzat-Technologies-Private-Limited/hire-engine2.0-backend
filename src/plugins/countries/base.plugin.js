/**
 * Base country plugin class.
 * Defines the interface contract that every country plugin MUST implement.
 *
 * To add a new country:
 * 1. Create a folder: src/plugins/countries/{ISO_CODE}/
 * 2. Create index.js that exports a class extending BaseCountryPlugin
 * 3. Implement ALL methods below
 * 4. The plugin loader auto-discovers it — no registration needed
 */
class BaseCountryPlugin {
  // ── Identity ──────────────────────────────────────

  /** ISO 3166-1 alpha-2 country code (e.g., 'IN', 'US') */
  get code() {
    throw new Error('Country plugin must implement: get code()');
  }

  /** Human-readable country name */
  get name() {
    throw new Error('Country plugin must implement: get name()');
  }

  /** ISO 4217 currency code (e.g., 'INR', 'USD') */
  get currency() {
    throw new Error('Country plugin must implement: get currency()');
  }

  /** Default locale string (e.g., 'en-IN', 'en-US') */
  get locale() {
    throw new Error('Country plugin must implement: get locale()');
  }

  // ── Company Registration ──────────────────────────

  /**
   * Get the Joi validation schema for country-specific company registration fields.
   * This schema is MERGED with the base company registration schema.
   * @returns {import('joi').ObjectSchema}
   */
  getCompanyRegistrationSchema() {
    throw new Error('Country plugin must implement: getCompanyRegistrationSchema()');
  }

  /**
   * Perform country-specific validation on company registration data.
   * Called AFTER Joi validation for custom business logic checks.
   * @param {object} data - Registration data
   * @returns {{ valid: boolean, errors: Array<{ field: string, message: string }> }}
   */
  validateCompanyRegistration(data) {
    // Default: pass-through (no extra validation)
    return { valid: true, errors: [] };
  }

  /**
   * Get the list of required documents for company verification.
   * @returns {Array<{ type: string, label: string, description: string, required: boolean }>}
   */
  getRequiredCompanyDocuments() {
    return [];
  }

  // ── Tax Configuration ─────────────────────────────

  /**
   * Get tax configuration for this country.
   * @returns {{ name: string, rate: number, type: string, included: boolean }}
   */
  getTaxConfiguration() {
    throw new Error('Country plugin must implement: getTaxConfiguration()');
  }

  /**
   * Calculate tax for a given amount.
   * @param {number} amount - Base amount (in smallest currency unit)
   * @returns {{ taxAmount: number, totalAmount: number, breakdown: object }}
   */
  calculateTax(amount) {
    const taxConfig = this.getTaxConfiguration();
    const taxAmount = Math.round(amount * taxConfig.rate);
    return {
      taxAmount,
      totalAmount: amount + taxAmount,
      breakdown: {
        baseAmount: amount,
        [taxConfig.name]: taxAmount,
        rate: `${(taxConfig.rate * 100).toFixed(1)}%`,
      },
    };
  }

  // ── Payment ───────────────────────────────────────

  /**
   * Get the payment provider name for this country.
   * @returns {string} 'stripe' | 'razorpay'
   */
  getPaymentProvider() {
    throw new Error('Country plugin must implement: getPaymentProvider()');
  }

  // ── Data Privacy & Compliance ─────────────────────

  /**
   * Get data privacy rules for this country.
   * @returns {{
   *   regulation: string,
   *   dataRetentionDays: number,
   *   requiresExplicitConsent: boolean,
   *   rightToErasure: boolean,
   *   dataPortability: boolean,
   *   breachNotificationHours: number
   * }}
   */
  getDataPrivacyRules() {
    throw new Error('Country plugin must implement: getDataPrivacyRules()');
  }

  /**
   * Get the data deletion policy for GDPR/CCPA/DPDP requests.
   * @returns {{ softDelete: boolean, anonymize: boolean, retentionAfterRequestDays: number }}
   */
  getDataDeletionPolicy() {
    return {
      softDelete: true,
      anonymize: true,
      retentionAfterRequestDays: 30,
    };
  }

  // ── Employment ────────────────────────────────────

  /**
   * Get allowed employment types for this country.
   * May vary based on labor law classifications.
   * @returns {Array<{ value: string, label: string }>}
   */
  getEmploymentTypes() {
    return [
      { value: 'full-time', label: 'Full-Time' },
      { value: 'part-time', label: 'Part-Time' },
      { value: 'contract', label: 'Contract' },
      { value: 'internship', label: 'Internship' },
    ];
  }

  // ── Address Formatting ────────────────────────────

  /**
   * Format an address object for display according to country conventions.
   * @param {object} address
   * @returns {string} Formatted address string
   */
  formatAddress(address) {
    const parts = [
      address.street,
      address.city,
      address.state,
      address.postalCode,
      this.name,
    ].filter(Boolean);
    return parts.join(', ');
  }
}

module.exports = BaseCountryPlugin;
