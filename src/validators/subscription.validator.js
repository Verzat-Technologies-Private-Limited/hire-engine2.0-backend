const Joi = require('joi');
const { TransactionStatus, TransactionType, PaymentProvider } = require('../utils/constants');

const subscribeSchema = {
  body: Joi.object({
    companyId: Joi.string().hex().length(24).optional(),
    planId: Joi.string().trim().required().messages({
      'any.required': 'Plan ID is required to create a subscription order',
    }),
  }),
};

const verifyPaymentSchema = {
  body: Joi.object({
    companyId: Joi.string().hex().length(24).optional(),
    paymentProvider: Joi.string()
      .valid(...Object.values(PaymentProvider))
      .default(PaymentProvider.RAZORPAY),

    // Razorpay verification fields
    razorpay_order_id: Joi.string().when('paymentProvider', {
      is: PaymentProvider.RAZORPAY,
      then: Joi.string().required(),
      otherwise: Joi.string().optional(),
    }),
    razorpay_payment_id: Joi.string().when('paymentProvider', {
      is: PaymentProvider.RAZORPAY,
      then: Joi.string().required(),
      otherwise: Joi.string().optional(),
    }),
    razorpay_signature: Joi.string().when('paymentProvider', {
      is: PaymentProvider.RAZORPAY,
      then: Joi.string().required(),
      otherwise: Joi.string().optional(),
    }),

    // Stripe verification fields
    paymentIntentId: Joi.string().when('paymentProvider', {
      is: PaymentProvider.STRIPE,
      then: Joi.string().required(),
      otherwise: Joi.string().optional(),
    }),
  }),
};

const cancelSubscriptionSchema = {
  body: Joi.object({
    companyId: Joi.string().hex().length(24).optional(),
    reason: Joi.string().max(500).allow('').optional(),
  }),
};

const currentSubscriptionSchema = {
  query: Joi.object({
    companyId: Joi.string().hex().length(24).optional(),
  }),
};

const getTransactionsSchema = {
  query: Joi.object({
    companyId: Joi.string().hex().length(24).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string()
      .valid(...Object.values(TransactionStatus))
      .allow('')
      .optional(),
    type: Joi.string()
      .valid(...Object.values(TransactionType))
      .allow('')
      .optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
  }),
};

const getPlansSchema = {
  query: Joi.object({
    countryCode: Joi.string().uppercase().length(2).default('US'),
  }),
};

module.exports = {
  subscribeSchema,
  verifyPaymentSchema,
  cancelSubscriptionSchema,
  currentSubscriptionSchema,
  getTransactionsSchema,
  getPlansSchema,
};
