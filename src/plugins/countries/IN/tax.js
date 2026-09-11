/**
 * India tax configuration.
 * GST (Goods and Services Tax) at 18% for digital services (SAC 998311).
 */

const SELLER_DEFAULT_STATE = 'DL'; // Platform registered headquarters (Delhi)
const SAC_CODE = '998311'; // Other information technology and computer services

const TAX_CONFIG = {
  name: 'GST',
  rate: 0.18, // 18%
  sacCode: SAC_CODE,
  sellerState: SELLER_DEFAULT_STATE,
  type: 'exclusive',
  included: false, // Prices are displayed excluding GST
  components: {
    CGST: 0.09, // Central GST — 9%
    SGST: 0.09, // State GST — 9%
    IGST: 0.18, // Integrated GST — 18% for interstate
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
 * @param {object} [context={}] - Optional buyer context with state
 * @returns {{ taxAmount: number, totalAmount: number, breakdown: object }}
 */
function calculateTax(amount, context = {}) {
  const buyerState = (context.buyerState || context.state || SELLER_DEFAULT_STATE).toUpperCase();
  const isInterstate = buyerState !== SELLER_DEFAULT_STATE;

  if (isInterstate) {
    const igst = Math.round(amount * TAX_CONFIG.components.IGST);
    return {
      taxAmount: igst,
      totalAmount: amount + igst,
      breakdown: {
        baseAmount: amount,
        IGST: igst,
        totalGST: igst,
        rate: '18%',
        taxType: 'interstate',
        sacCode: SAC_CODE,
        placeOfSupply: buyerState,
      },
    };
  }

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
      taxType: 'intrastate',
      sacCode: SAC_CODE,
      placeOfSupply: buyerState,
    },
  };
}

module.exports = { getTaxConfig, calculateTax, SAC_CODE };

