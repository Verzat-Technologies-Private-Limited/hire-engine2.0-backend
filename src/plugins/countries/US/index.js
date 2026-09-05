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

  validatePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
      return { valid: false, message: 'Business phone number is required for US companies' };
    }
    const cleaned = phone.replace(/[\s\-()]/g, '').replace(/^(\+1|1)/, '');
    if (!/^[2-9][0-9]{9}$/.test(cleaned)) {
      return {
        valid: false,
        message: 'Please provide a valid 10-digit US phone number (e.g., 555-123-4567)',
      };
    }
    return { valid: true };
  }

  isPhoneVerificationRequired() {
    return false;
  }

  getVerificationSLAHours() {
    return 24;
  }

  getUniqueRegistrationFields() {
    return [{ field: 'einNumber', label: 'EIN', transform: (v) => v.trim() }];
  }

  async checkDuplicateRegistration(registrationDetails, CompanyModel) {
    await super.checkDuplicateRegistration(registrationDetails, CompanyModel);
    const ein = registrationDetails?.einNumber || registrationDetails?.ein;
    if (ein && typeof ein === 'string' && ein.trim()) {
      const existing = await CompanyModel.findOne({
        $or: [
          { 'registrationDetails.einNumber': ein.trim() },
          { 'registrationDetails.ein': ein.trim() },
        ],
      });
      if (existing) {
        const ApiError = require('../../../utils/ApiError');
        throw ApiError.conflict('A company with this EIN is already registered in the system');
      }
    }
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
