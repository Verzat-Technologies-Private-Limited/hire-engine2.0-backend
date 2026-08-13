const express = require('express');
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const validate = require('../middlewares/validate.middleware');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  sendOtpSchema,
  verifyOtpSchema,
} = require('../validators/auth.validator');

const router = express.Router();

// Local authentication
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);
router.post('/logout', authController.logout);

// Password recovery & Email verification
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);

// SMS OTP Gateway endpoints
router.post('/send-otp', authLimiter, validate(sendOtpSchema), authController.sendOtp);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), authController.verifyOtp);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  authController.oauthCallback
);

// LinkedIn OAuth
router.get('/linkedin', passport.authenticate('linkedin', { scope: ['openid', 'profile', 'email'] }));
router.get(
  '/linkedin/callback',
  passport.authenticate('linkedin', { session: false }),
  authController.oauthCallback
);

module.exports = router;
