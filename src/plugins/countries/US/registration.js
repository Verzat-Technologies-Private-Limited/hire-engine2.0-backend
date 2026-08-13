const Joi = require('joi');

/**
 * US-specific company registration validation.
 * Validates EIN (Employer Identification Number) and state registration.
 */

// EIN format: XX-XXXXXXX (9 digits with hyphen after 2nd digit)
const EIN_REGEX = /^[0-9]{2}-[0-9]{7}$/;

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC',
];

/**
 * Get Joi schema for US-specific company registration fields.
 * @returns {import('joi').ObjectSchema}
 */
function getRegistrationSchema() {
  return Joi.object({
    einNumber: Joi.string()
      .pattern(EIN_REGEX)
      .required()
      .messages({
        'string.pattern.base': 'EIN must be a valid 9-digit number in format XX-XXXXXXX',
        'any.required': 'EIN (Employer Identification Number) is required for US companies',
      }),

    stateOfIncorporation: Joi.string()
      .valid(...US_STATES)
      .required()
      .messages({
        'any.only': 'State of incorporation must be a valid US state code',
        'any.required': 'State of incorporation is required',
      }),

    businessType: Joi.string()
      .valid('llc', 'corporation', 'partnership', 'sole_proprietorship', 's_corp', 'nonprofit')
      .required()
      .messages({
        'any.only': 'Business type must be one of: LLC, Corporation, Partnership, Sole Proprietorship, S-Corp, Nonprofit',
      }),

    registeredAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string()
        .valid(...US_STATES)
        .required(),
      zipCode: Joi.string()
        .pattern(/^[0-9]{5}(-[0-9]{4})?$/)
        .required()
        .messages({
          'string.pattern.base': 'ZIP code must be in format XXXXX or XXXXX-XXXX',
        }),
    }).required(),
  });
}

/**
 * Perform additional validation on US company registration data.
 * @param {object} data
 * @returns {{ valid: boolean, errors: Array<{ field: string, message: string }> }}
 */
function validateRegistration(data) {
  const errors = [];

  // EIN prefixes 07, 08, 09, 17, 18, 19, 28, 29, 49, 69, 70, 78, 79, 89 are not assigned
  if (data.einNumber) {
    const prefix = data.einNumber.substring(0, 2);
    const invalidPrefixes = ['07', '08', '09', '17', '18', '19', '28', '29', '49', '69', '70', '78', '79', '89'];
    if (invalidPrefixes.includes(prefix)) {
      errors.push({
        field: 'einNumber',
        message: `EIN prefix "${prefix}" is not a valid IRS-assigned prefix`,
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
  EIN_REGEX,
  US_STATES,
};
