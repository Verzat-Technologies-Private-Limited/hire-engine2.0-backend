const BaseCountryPlugin = require('../base.plugin');
const { getRegistrationSchema, validateRegistration } = require('./registration');
const { getTaxConfig, calculateTax } = require('./tax');
const { getPrivacyRules, getDeletionPolicy } = require('./privacy');

/**
 * 🇮🇳 India Country Plugin
 *
 * - Payment: Razorpay
 * - Tax: GST (18%)
 * - Registration: GST, PAN, CIN
 * - Privacy: DPDP Act 2023
 */
class IndiaPlugin extends BaseCountryPlugin {
  get code() {
    return 'IN';
  }

  get name() {
    return 'India';
  }

  get currency() {
    return 'INR';
  }

  get locale() {
    return 'en-IN';
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
      return { valid: false, message: 'Business phone number is required for Indian companies' };
    }
    const cleaned = phone.replace(/[\s\-()]/g, '').replace(/^(\+91|0)/, '');
    if (!/^[6-9][0-9]{9}$/.test(cleaned)) {
      return {
        valid: false,
        message: 'Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9',
      };
    }
    return { valid: true };
  }

  isPhoneVerificationRequired() {
    return true;
  }

  getVerificationSLAHours() {
    return 48;
  }

  getUniqueRegistrationFields() {
    return [
      { field: 'gstNumber', label: 'GST number', transform: (v) => v.toUpperCase() },
      { field: 'panNumber', label: 'PAN number', transform: (v) => v.toUpperCase() },
      { field: 'cinNumber', label: 'CIN number', transform: (v) => v.toUpperCase() },
    ];
  }

  getRequiredCompanyDocuments() {
    return [
      {
        type: 'gst_certificate',
        label: 'GST Registration Certificate',
        description: 'Upload your GST registration certificate issued by the GST portal',
        required: true,
      },
      {
        type: 'pan_card',
        label: 'Company PAN Card',
        description: 'Upload a copy of your company PAN card',
        required: true,
      },
      {
        type: 'cin_certificate',
        label: 'Certificate of Incorporation (CIN)',
        description: 'Upload your Certificate of Incorporation from MCA',
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
    return 'razorpay';
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
      { value: 'full-time', label: 'Full-Time (Permanent)' },
      { value: 'part-time', label: 'Part-Time' },
      { value: 'contract', label: 'Contract / Freelance' },
      { value: 'internship', label: 'Internship / Trainee' },
      { value: 'temporary', label: 'Temporary / Casual' },
    ];
  }

  // ── Address ─────────────────────────────────────

  formatAddress(address) {
    const parts = [
      address.street,
      address.city,
      address.state,
      address.pincode ? `PIN: ${address.pincode}` : null,
      'India',
    ].filter(Boolean);
    return parts.join(', ');
  }
}

module.exports = IndiaPlugin;
