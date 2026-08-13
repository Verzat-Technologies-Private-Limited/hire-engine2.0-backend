const Joi = require('joi');

/**
 * India-specific company registration validation.
 * Validates GST Number, PAN, and CIN (Corporate Identity Number).
 */

// GST Number format: 22AAAAA0000A1Z5 (15 characters)
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// PAN format: ABCDE1234F (10 characters)
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// CIN format: U12345MH2000PTC123456 (21 characters)
const CIN_REGEX = /^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

/**
 * Get Joi schema for India-specific company registration fields.
 * @returns {import('joi').ObjectSchema}
 */
function getRegistrationSchema() {
  return Joi.object({
    gstNumber: Joi.string()
      .pattern(GST_REGEX)
      .required()
      .messages({
        'string.pattern.base': 'GST Number must be a valid 15-character GSTIN (e.g., 22AAAAA0000A1Z5)',
        'any.required': 'GST Number is required for Indian companies',
      }),

    panNumber: Joi.string()
      .pattern(PAN_REGEX)
      .required()
      .messages({
        'string.pattern.base': 'PAN must be a valid 10-character PAN (e.g., ABCDE1234F)',
        'any.required': 'PAN is required for Indian companies',
      }),

    cinNumber: Joi.string()
      .pattern(CIN_REGEX)
      .optional()
      .allow('')
      .messages({
        'string.pattern.base': 'CIN must be a valid 21-character Corporate Identity Number',
      }),

    registeredAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      pincode: Joi.string()
        .pattern(/^[1-9][0-9]{5}$/)
        .required()
        .messages({
          'string.pattern.base': 'Pincode must be a valid 6-digit Indian postal code',
        }),
    }).required(),
  });
}

/**
 * Perform additional validation on Indian company registration data.
 * @param {object} data
 * @returns {{ valid: boolean, errors: Array<{ field: string, message: string }> }}
 */
function validateRegistration(data) {
  const errors = [];

  // GST state code should match the address state (first 2 digits of GST)
  if (data.gstNumber && data.registeredAddress?.pincode) {
    // Basic check — in production this would verify against a state-pincode mapping
    const gstStateCode = data.gstNumber.substring(0, 2);
    const validStateCodes = [
      '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
      '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
      '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
      '31', '32', '33', '34', '35', '36', '37', '38',
    ];
    if (!validStateCodes.includes(gstStateCode)) {
      errors.push({
        field: 'gstNumber',
        message: `Invalid GST state code: ${gstStateCode}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  getRegistrationSchema,
  validateRegistration,
  GST_REGEX,
  PAN_REGEX,
  CIN_REGEX,
};
