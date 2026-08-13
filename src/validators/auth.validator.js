const Joi = require('joi');
const { UserRole } = require('../utils/constants');

const registerSchema = {
  body: Joi.object({
    firstName: Joi.string().trim().min(1).max(50).required(),
    lastName: Joi.string().trim().min(1).max(50).required(),
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().min(8).max(128).required()
      .messages({ 'string.min': 'Password must be at least 8 characters' }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({ 'any.only': 'Passwords do not match' }),
    role: Joi.string().valid(UserRole.JOB_SEEKER, UserRole.EMPLOYER).default(UserRole.JOB_SEEKER),
    countryCode: Joi.string().uppercase().length(2).optional(),
  }),
};

const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().required(),
  }),
};

const refreshTokenSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

const forgotPasswordSchema = {
  body: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
  }),
};

const resetPasswordSchema = {
  body: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).max(128).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({ 'any.only': 'Passwords do not match' }),
  }),
};

const verifyEmailSchema = {
  body: Joi.object({
    token: Joi.string().required(),
  }),
};

const sendOtpSchema = {
  body: Joi.object({
    mobile: Joi.string()
      .trim()
      .pattern(/^[0-9+]{8,15}$/)
      .required()
      .messages({ 'string.pattern.base': 'Please provide a valid mobile number with country code' }),
  }),
};

const verifyOtpSchema = {
  body: Joi.object({
    mobile: Joi.string().trim().required(),
    otp: Joi.string().trim().length(6).required(),
  }),
};

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  sendOtpSchema,
  verifyOtpSchema,
};
