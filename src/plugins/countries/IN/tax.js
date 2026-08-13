/**
 * India tax configuration.
 * GST (Goods and Services Tax) at 18% for digital services.
 */

const TAX_CONFIG = {
  name: 'GST',
  rate: 0.18, // 18%
  type: 'inclusive', // GST can be inclusive or exclusive
  included: false, // Prices are displayed excluding GST
  components: {
    CGST: 0.09, // Central GST — 9%
    SGST: 0.09, // State GST — 9% (or IGST 18% for interstate)
  },
};

/**
 * Get India's tax configuration.
 * @returns {typeof TAX_CONFIG}
 */
function getTaxConfig() {
  return { ...TAX_CONFIG };
}

/**
 * Calculate GST for a given amount.
 * @param {number} amount - Base amount in paise
 * @returns {{ taxAmount: number, totalAmount: number, breakdown: object }}
 */
function calculateTax(amount) {
  const cgst = Math.round(amount * TAX_CONFIG.components.CGST);
  const sgst = Math.round(amount * TAX_CONFIG.components.SGST);
  const totalTax = cgst + sgst;

  return {
    taxAmount: totalTax,
    totalAmount: amount + totalTax,
    breakdown: {
      baseAmount: amount,
      CGST: cgst,
      SGST: sgst,
      totalGST: totalTax,
      rate: '18%',
    },
  };
}

module.exports = { getTaxConfig, calculateTax };
