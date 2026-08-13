const Joi = require('joi');
const { TeamPermission } = require('../utils/constants');

const createCompanySchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(200).required(),
    website: Joi.string().uri().allow(''),
    industry: Joi.string().trim().allow(''),
    size: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+', ''),
    description: Joi.string().max(5000).allow(''),
    countryCode: Joi.string().uppercase().length(2).required(),
    address: Joi.object({
      street: Joi.string().allow(''),
      city: Joi.string().allow(''),
      state: Joi.string().allow(''),
      postalCode: Joi.string().allow(''),
      country: Joi.string().allow(''),
    }),
    socialLinks: Joi.object({
      linkedin: Joi.string().uri().allow(''),
      twitter: Joi.string().uri().allow(''),
      facebook: Joi.string().uri().allow(''),
    }),
    // Country-specific registration details are validated dynamically by the country plugin
    registrationDetails: Joi.object().unknown(true),
  }),
};

const updateCompanySchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(200),
    website: Joi.string().uri().allow(''),
    industry: Joi.string().trim().allow(''),
    size: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+', ''),
    description: Joi.string().max(5000).allow(''),
    address: Joi.object({
      street: Joi.string().allow(''),
      city: Joi.string().allow(''),
      state: Joi.string().allow(''),
      postalCode: Joi.string().allow(''),
      country: Joi.string().allow(''),
    }),
    socialLinks: Joi.object({
      linkedin: Joi.string().uri().allow(''),
      twitter: Joi.string().uri().allow(''),
      facebook: Joi.string().uri().allow(''),
    }),
  }).min(1),
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

const addTeamMemberSchema = {
  body: Joi.object({
    email: Joi.string().email().lowercase().required(),
    permissions: Joi.array()
      .items(Joi.string().valid(...Object.values(TeamPermission)))
      .min(1)
      .required(),
  }),
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

const updateTeamMemberSchema = {
  body: Joi.object({
    permissions: Joi.array()
      .items(Joi.string().valid(...Object.values(TeamPermission)))
      .min(1)
      .required(),
  }),
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
    userId: Joi.string().hex().length(24).required(),
  }),
};

module.exports = {
  createCompanySchema,
  updateCompanySchema,
  addTeamMemberSchema,
  updateTeamMemberSchema,
};
