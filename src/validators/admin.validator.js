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

const createPlanSchema = {
  body: Joi.object({
    planId: Joi.string()
      .pattern(/^[a-z0-9-]+$/)
      .min(2)
      .max(50)
      .required()
      .messages({ 'string.pattern.base': 'Plan ID must be lowercase alphanumeric with hyphens only' }),
    name: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().max(2000).allow('').default(''),
    price: Joi.number().min(0).required(),
    jobQuota: Joi.number().integer().min(0).default(0),
    resumeQuota: Joi.number().integer().min(0).default(0),
    hasResumeDB: Joi.boolean().default(false),
    durationMonths: Joi.number().integer().min(1).max(120).required(),
    isActive: Joi.boolean().default(true),
  }),
};

const updatePlanSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(200),
    description: Joi.string().max(2000).allow(''),
    price: Joi.number().min(0),
    jobQuota: Joi.number().integer().min(0),
    resumeQuota: Joi.number().integer().min(0),
    hasResumeDB: Joi.boolean(),
    durationMonths: Joi.number().integer().min(1).max(120),
    isActive: Joi.boolean(),
  }).min(1), // At least one field required
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
  createPlanSchema,
  updatePlanSchema,
};
