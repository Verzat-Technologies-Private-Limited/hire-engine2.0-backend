/**
 * US tax configuration.
 * No federal sales tax — tax varies by state.
 * For SaaS/digital services, most states don't charge sales tax.
 */

const TAX_CONFIG = {
  name: 'Sales Tax',
  rate: 0, // No federal sales tax; state-level handled separately if needed
  type: 'exclusive',
  included: false,
  note: 'US has no federal sales tax. State-level sales tax may apply depending on nexus.',
};

/**
 * Get US tax configuration.
 * @returns {typeof TAX_CONFIG}
 */
function getTaxConfig() {
  return { ...TAX_CONFIG };
}

/**
 * Calculate tax for a given amount.
 * Currently returns 0 as SaaS services are generally not taxed federally.
 * @param {number} amount - Base amount in cents
 * @returns {{ taxAmount: number, totalAmount: number, breakdown: object }}
 */
function calculateTax(amount) {
  return {
    taxAmount: 0,
    totalAmount: amount,
    breakdown: {
      baseAmount: amount,
      salesTax: 0,
      rate: '0% (no federal sales tax)',
      note: TAX_CONFIG.note,
    },
  };
}

module.exports = { getTaxConfig, calculateTax };
