const BaseCountryPlugin = require('../base.plugin');
const { getRegistrationSchema, validateRegistration } = require('./registration');
const { getTaxConfig, calculateTax } = require('./tax');
const { getPrivacyRules, getDeletionPolicy } = require('./privacy');

/**
 * 🇺🇸 United States Country Plugin
 *
 * - Payment: Stripe
 * - Tax: No federal sales tax (state-level varies)
 * - Registration: EIN, state of incorporation, business type
 * - Privacy: CCPA
 */
class USPlugin extends BaseCountryPlugin {
  get code() {
    return 'US';
  }

  get name() {
    return 'United States';
  }

  get currency() {
    return 'USD';
  }

  get locale() {
    return 'en-US';
  }

  // ── Company Registration ────────────────────────

  getCompanyRegistrationSchema() {
    return getRegistrationSchema();
  }

  validateCompanyRegistration(data) {
    return validateRegistration(data);
  }

  getRequiredCompanyDocuments() {
    return [
      {
        type: 'ein_letter',
        label: 'EIN Confirmation Letter (CP 575)',
        description: 'Upload your IRS EIN confirmation letter',
        required: true,
      },
      {
        type: 'articles_of_incorporation',
        label: 'Articles of Incorporation',
        description: 'Upload your state-filed articles of incorporation or organization',
        required: true,
      },
      {
        type: 'w9_form',
        label: 'W-9 Form',
        description: 'Upload a completed W-9 form',
        required: false,
      },
    ];
  }

  // ── Tax ─────────────────────────────────────────

  getTaxConfiguration() {
    return getTaxConfig();
  }

  calculateTax(amount) {
    return calculateTax(amount);
  }

  // ── Payment ─────────────────────────────────────

  getPaymentProvider() {
    return 'stripe';
  }

  // ── Privacy ─────────────────────────────────────

  getDataPrivacyRules() {
    return getPrivacyRules();
  }

  getDataDeletionPolicy() {
    return getDeletionPolicy();
  }

  // ── Employment Types ────────────────────────────

  getEmploymentTypes() {
    return [
      { value: 'full-time', label: 'Full-Time (W-2)' },
      { value: 'part-time', label: 'Part-Time' },
      { value: 'contract', label: 'Contract (1099)' },
      { value: 'internship', label: 'Internship' },
      { value: 'temporary', label: 'Temporary / Seasonal' },
    ];
  }

  // ── Address ─────────────────────────────────────

  formatAddress(address) {
    const parts = [
      address.street,
      address.city,
      address.state ? `${address.state} ${address.zipCode || ''}`.trim() : null,
      'USA',
    ].filter(Boolean);
    return parts.join(', ');
  }
}

module.exports = USPlugin;
