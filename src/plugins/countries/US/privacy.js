/**
 * US data privacy rules.
 * Based on CCPA (California Consumer Privacy Act) as the strictest US regulation.
 * Applied platform-wide for consistency.
 */

const PRIVACY_RULES = {
  regulation: 'CCPA',
  dataRetentionDays: 1825, // 5 years
  requiresExplicitConsent: false, // CCPA uses opt-out, not opt-in
  rightToErasure: true, // Right to deletion
  dataPortability: true, // Right to data portability
  breachNotificationHours: 72,
  optOutRequired: true, // Must provide "Do Not Sell My Data" option
  minorProtection: true, // Extra protections for users under 16
  crossBorderTransfer: 'allowed', // No restrictions within US
};

/**
 * Get US data privacy rules.
 * @returns {typeof PRIVACY_RULES}
 */
function getPrivacyRules() {
  return { ...PRIVACY_RULES };
}

/**
 * Get US data deletion policy.
 * @returns {object}
 */
function getDeletionPolicy() {
  return {
    softDelete: true,
    anonymize: true,
    retentionAfterRequestDays: 45, // CCPA allows 45 days to fulfill
    notifyUser: true,
    auditTrail: true,
  };
}

module.exports = { getPrivacyRules, getDeletionPolicy };
