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

  /**
   * Check if this country requires a corporate business email for employer accounts.
   * Default is true. Plugins can override if local regulations or market customs differ.
   * @returns {boolean}
   */
  isCorporateEmailRequired() {
    return true;
  }

  /**
   * Validate employer email for company registration in this country.
   * Default implementation checks against disposable/free email providers.
   * @param {string} email
   * @param {object} [companyData]
   * @returns {{ valid: boolean, message?: string }}
   */
  validateEmployerEmail(email, companyData = {}) {
    if (!this.isCorporateEmailRequired()) {
      return { valid: true };
    }
    const { validateCorporateEmail } = require('../../utils/emailDomain');
    return validateCorporateEmail(email, companyData.website);
  }

  /**
   * Whether companies in this country require admin approval before publishing active jobs.
   * Default is true. When true, unverified companies can only save draft jobs.
   * @returns {boolean}
   */
  requiresVerificationForJobPosting() {
    return true;
  }

  /**
   * Validate business phone number according to country rules.
   * @param {string} phone
   * @returns {{ valid: boolean, message?: string }}
   */
  validatePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
      return { valid: false, message: 'Business phone number is required' };
    }
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.length < 7 || cleaned.length > 16) {
      return { valid: false, message: 'Phone number must be between 7 and 16 digits' };
    }
    return { valid: true };
  }

  /**
   * Whether phone verification via OTP is required for company registration in this country.
   * @returns {boolean}
   */
  isPhoneVerificationRequired() {
    return false;
  }

  /**
   * Target turnaround SLA in hours for admin review in this country.
   * @returns {number} Hours
   */
  getVerificationSLAHours() {
    return 48;
  }

  /**
   * Unique registration fields in registrationDetails that must not be duplicated across companies.
   * @returns {Array<{ field: string, label: string, transform?: (val: string) => string }>}
   */
  getUniqueRegistrationFields() {
    return [];
  }

  /**
   * Verify whether the company's registration details clash with any existing company in DB.
   * @param {object} registrationDetails
   * @param {import('mongoose').Model} CompanyModel
   * @returns {Promise<void>}
   */
  async checkDuplicateRegistration(registrationDetails, CompanyModel) {
    if (!registrationDetails || !CompanyModel) return;

    const fields = this.getUniqueRegistrationFields();
    for (const { field, label, transform } of fields) {
      const val = registrationDetails[field];
      if (val && typeof val === 'string' && val.trim()) {
        const queryVal = transform ? transform(val.trim()) : val.trim();
        const existing = await CompanyModel.findOne({
          [`registrationDetails.${field}`]: queryVal,
        });
        if (existing) {
          const ApiError = require('../../utils/ApiError');
          throw ApiError.conflict(
            `A company with this ${label || field} is already registered in the system`
          );
        }
      }
    }
  }

  /**
   * Check if a company with a conflicting name already exists.
   * @param {string} companyName
   * @param {import('mongoose').Model} CompanyModel
   * @returns {Promise<void>}
   */
  async checkDuplicateCompanyName(companyName, CompanyModel) {
    if (!companyName || !CompanyModel) return;
    const trimmed = companyName.trim();
    if (!trimmed) return;

    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await CompanyModel.findOne({
      name: { $regex: new RegExp(`^${escaped}$`, 'i') },
    });
    if (existing) {
      const ApiError = require('../../utils/ApiError');
      throw ApiError.conflict(`A company with the name "${trimmed}" is already registered`);
    }
  }

  /**
   * Format verification notification and email copy for an employer in this country.
   * Plugins can customize wording to align with country-specific compliance authorities.
   * @param {string} status - VerificationStatus
   * @param {string} notes - Reviewer notes
   * @param {object} company - Company document
   * @returns {{ title: string, message: string, actionUrl: string, emailSubject: string, emailTitle: string, emailBody: string, buttonText: string, buttonColor: string }}
   */
  formatVerificationNotification(status, notes, company) {
    const companyName = company?.name || 'Your company';
    let title = 'Company Verification Update';
    let message = `Your company verification status for "${companyName}" has been updated to "${status}".`;
    let actionUrl = '/employer/company';
    let emailSubject = `Company Verification Update - ${companyName}`;
    let emailTitle = 'Company Verification Status Update';
    let emailBody = message;
    let buttonText = 'Go to Employer Dashboard';
    let buttonColor = '#2563EB';

    switch (status) {
      case 'approved':
        title = 'Company Verification Approved! 🎉';
        message = `Your company profile for "${companyName}" has been officially verified and approved in ${this.name}. You can now publish active job postings.`;
        emailSubject = `🎉 Company Verification Approved - ${companyName}`;
        emailTitle = 'Your Company Profile Has Been Approved!';
        emailBody = `Congratulations! Your company profile for <strong>${companyName}</strong> has been officially verified and approved in ${this.name}. You can now publish active job postings, search resumes, and manage applicants.`;
        buttonColor = '#16A34A';
        buttonText = 'Start Posting Jobs';
        break;
      case 'rejected':
        title = 'Company Verification Not Approved';
        message = `Your company profile for "${companyName}" was not approved.${notes ? ` Reason: ${notes}` : ''}`;
        emailSubject = `Company Verification Not Approved - ${companyName}`;
        emailTitle = 'Company Verification Status';
        emailBody = `After reviewing your company registration details and compliance documents for <strong>${companyName}</strong> in ${this.name}, our team was unable to approve your profile at this time.`;
        buttonColor = '#DC2626';
        buttonText = 'View Profile Details';
        break;
      case 'information_required':
        title = 'Action Required: Verification Information Needed ⚠️';
        message = `Additional verification documents or information are requested for "${companyName}".${notes ? ` Reviewer notes: ${notes}` : ''}`;
        actionUrl = '/employer/company/documents';
        emailSubject = `⚠️ Action Required: Additional Information Needed for ${companyName}`;
        emailTitle = 'Additional Information or Documents Required';
        emailBody = `Our compliance team has reviewed your submission for <strong>${companyName}</strong> and requires additional information or statutory documents to finalize verification in ${this.name}. Please see the reviewer notes below.`;
        buttonColor = '#D97706';
        buttonText = 'Submit Requested Documents';
        break;
      case 'under_review':
        title = 'Company Verification Under Review 🔍';
        message = `Your company profile for "${companyName}" is currently under active compliance review.`;
        emailSubject = `Company Verification Under Review - ${companyName}`;
        emailTitle = 'Your Verification is In Progress';
        emailBody = `Your business verification submission for <strong>${companyName}</strong> is actively being reviewed by our compliance team in ${this.name}.`;
        buttonColor = '#2563EB';
        buttonText = 'View Review Status';
        break;
    }

    return {
      title,
      message,
      actionUrl,
      emailSubject,
      emailTitle,
      emailBody,
      buttonText,
      buttonColor,
    };
  }

  /**
   * Format moderation notification and email copy for a job listing in this country.
   * Enables country plugins to tailor compliance notices and terminology.
   * @param {string} action - Moderation action ('active'|'paused'|'closed'|'expired'|'delete')
   * @param {string} reason - Admin reason for moderation
   * @param {object} job - Job document
   * @returns {{ title: string, message: string, actionUrl: string, emailSubject: string, emailTitle: string, emailBody: string, buttonText: string, buttonColor: string }}
   */
  formatJobModerationNotification(action, reason, job) {
    const jobTitle = job?.title || 'Job Listing';
    let title = `Job Moderation Update: "${jobTitle}"`;
    let message = `Your job posting "${jobTitle}" status has been updated to "${action}".`;
    let actionUrl = `/employer/jobs/${job?._id || ''}`;
    let emailSubject = `Job Moderation Notice - ${jobTitle}`;
    let emailTitle = `Job Moderation Notice for "${jobTitle}"`;
    let emailBody = `<p>The status of your job listing <strong>${jobTitle}</strong> in ${this.name} has been updated to <strong>${action}</strong> by platform administration.</p>`;
    let buttonText = 'View Job Listing';
    let buttonColor = '#2563EB';

    if (reason) {
      message += ` Reason: ${reason}`;
      emailBody += `<p><strong>Reason provided:</strong> ${reason}</p>`;
    }

    switch (action) {
      case 'closed':
      case 'delete':
        title = `Job Closed by Administration: "${jobTitle}"`;
        emailSubject = `⚠️ Job Listing Closed by Administration - ${jobTitle}`;
        emailTitle = `Your Job Listing Has Been Closed`;
        buttonColor = '#DC2626';
        break;
      case 'paused':
        title = `Job Paused: "${jobTitle}"`;
        emailSubject = `Job Listing Paused - ${jobTitle}`;
        emailTitle = `Your Job Listing Has Been Temporarily Paused`;
        buttonColor = '#D97706';
        break;
      case 'active':
        title = `Job Activated: "${jobTitle}"`;
        emailSubject = `Job Listing Activated - ${jobTitle}`;
        emailTitle = `Your Job Listing is Now Active`;
        buttonColor = '#16A34A';
        break;
      case 'expired':
        title = `Job Expired: "${jobTitle}"`;
        emailSubject = `Job Listing Expired - ${jobTitle}`;
        emailTitle = `Your Job Listing Has Expired`;
        buttonColor = '#6B7280';
        break;
    }

    return {
      title,
      message,
      actionUrl,
      emailSubject,
      emailTitle,
      emailBody,
      buttonText,
      buttonColor,
    };
  }

  /**
   * Get complete verification rules & requirements for this country.
   * @returns {{
   *   requiresEmailVerification: boolean,
   *   requiresCorporateEmail: boolean,
   *   requiresPhoneVerification: boolean,
   *   requiresVerificationForJobPosting: boolean,
   *   slaHours: number,
   *   requiredDocuments: Array<{ type: string, label: string, description: string, required: boolean }>,
   *   uniqueRegistrationFields: Array<{ field: string, label: string }>
   * }}
   */
  getVerificationRules() {
    return {
      requiresEmailVerification: true,
      requiresCorporateEmail: this.isCorporateEmailRequired(),
      requiresPhoneVerification: this.isPhoneVerificationRequired(),
      requiresVerificationForJobPosting: this.requiresVerificationForJobPosting(),
      slaHours: this.getVerificationSLAHours(),
      requiredDocuments: this.getRequiredCompanyDocuments(),
      uniqueRegistrationFields: this.getUniqueRegistrationFields(),
    };
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
