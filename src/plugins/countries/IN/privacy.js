/**
 * India data privacy rules.
 * Based on the Digital Personal Data Protection (DPDP) Act, 2023.
 */

const PRIVACY_RULES = {
  regulation: 'DPDP Act 2023',
  dataRetentionDays: 1095, // 3 years — default retention
  requiresExplicitConsent: true,
  rightToErasure: true,
  dataPortability: true,
  breachNotificationHours: 72, // Notify within 72 hours
  consentWithdrawal: true, // Users can withdraw consent
  crossBorderTransfer: 'restricted', // Data transfer outside India is restricted
  significantDataFiduciary: false, // Set true if platform crosses user threshold
};

/**
 * Get India's data privacy rules.
 * @returns {typeof PRIVACY_RULES}
 */
function getPrivacyRules() {
  return { ...PRIVACY_RULES };
}

/**
 * Get India's data deletion policy.
 * @returns {object}
 */
function getDeletionPolicy() {
  return {
    softDelete: true,
    anonymize: true,
    retentionAfterRequestDays: 30, // Process within 30 days
    notifyUser: true,
    auditTrail: true, // Keep audit record of deletion
  };
}

module.exports = { getPrivacyRules, getDeletionPolicy };
