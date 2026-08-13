const Joi = require('joi');
const { ProfileVisibility } = require('../utils/constants');

const updateProfileSchema = {
  body: Joi.object({
    firstName: Joi.string().trim().min(1).max(50),
    lastName: Joi.string().trim().min(1).max(50),
    phone: Joi.string().trim().allow(''),
    headline: Joi.string().max(200).allow(''),
    summary: Joi.string().max(2000).allow(''),
    skills: Joi.array().items(Joi.string().trim()).max(50),
    location: Joi.object({
      address: Joi.string().allow(''),
      city: Joi.string().allow(''),
      state: Joi.string().allow(''),
      country: Joi.string().allow(''),
      postalCode: Joi.string().allow(''),
      coordinates: Joi.object({
        type: Joi.string().valid('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2),
      }),
    }),
    countryCode: Joi.string().uppercase().length(2),
  }).min(1), // At least one field required
};

const toggleVisibilitySchema = {
  body: Joi.object({
    visibility: Joi.string()
      .valid(...Object.values(ProfileVisibility))
      .required(),
  }),
};

module.exports = {
  updateProfileSchema,
  toggleVisibilitySchema,
};
