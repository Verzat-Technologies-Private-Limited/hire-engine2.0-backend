const Joi = require('joi');

const verifyEmployerSchema = {
  body: Joi.object({
    status: Joi.string().valid('approved', 'rejected').required(),
    notes: Joi.string().max(1000).allow(''),
  }),
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

const suspendUserSchema = {
  body: Joi.object({
    action: Joi.string().valid('suspend', 'ban', 'reactivate').required(),
    reason: Joi.string().max(500).when('action', {
      is: Joi.valid('suspend', 'ban'),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }),
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

const resolveFlagSchema = {
  body: Joi.object({
    status: Joi.string().valid('resolved', 'dismissed').required(),
    resolutionNote: Joi.string().max(1000).allow(''),
    actionTaken: Joi.string().valid('none', 'removed', 'suspended', 'warned').default('none'),
  }),
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

const updateConfigSchema = {
  body: Joi.object({
    key: Joi.string().required(),
    value: Joi.any().required(),
    description: Joi.string().max(500).allow(''),
    category: Joi.string().valid('rate_limits', 'thresholds', 'features', 'general'),
  }),
};

const taxonomySchema = {
  body: Joi.object({
    type: Joi.string().valid('skill', 'category', 'industry', 'job_title').required(),
    name: Joi.string().trim().min(1).max(100).required(),
    parentId: Joi.string().hex().length(24).allow(null),
    aliases: Joi.array().items(Joi.string().trim()).max(10),
    isActive: Joi.boolean().default(true),
    sortOrder: Joi.number().integer().min(0).default(0),
  }),
};

const processRefundSchema = {
  body: Joi.object({
    amount: Joi.number().min(0).allow(null), // null = full refund
    reason: Joi.string().max(500).required(),
  }),
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

module.exports = {
  verifyEmployerSchema,
  suspendUserSchema,
  resolveFlagSchema,
  updateConfigSchema,
  taxonomySchema,
  processRefundSchema,
};
