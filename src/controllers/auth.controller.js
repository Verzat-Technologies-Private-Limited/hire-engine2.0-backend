const authService = require('../services/auth.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  ApiResponse.created('Registration successful. Please verify your email.', result).send(res);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  ApiResponse.ok('Login successful', result).send(res);
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  const tokens = await authService.refreshAccessToken(token);
  ApiResponse.ok('Token refreshed successfully', tokens).send(res);
});

const logout = asyncHandler(async (req, res) => {
  // Client discards tokens. In production, could blacklist token in cache adapter.
  ApiResponse.ok('Logged out successfully').send(res);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.forgotPassword(email);
  ApiResponse.ok('If an account with that email exists, a password reset link has been sent.').send(res);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  ApiResponse.ok('Password has been reset successfully. You can now login with your new password.').send(res);
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  await authService.verifyEmail(token);
  ApiResponse.ok('Email verified successfully.').send(res);
});

const oauthCallback = asyncHandler(async (req, res) => {
  const result = await authService.handleOAuthCallback(req.user);
  ApiResponse.ok('OAuth authentication successful', result).send(res);
});

const sendOtp = asyncHandler(async (req, res) => {
  const { mobile } = req.body;
  const result = await authService.sendOtp(mobile);
  ApiResponse.ok(result.message, result).send(res);
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { mobile, otp } = req.body;
  const result = await authService.verifyOtp(mobile, otp);
  ApiResponse.ok(result.message, result).send(res);
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  oauthCallback,
  sendOtp,
  verifyOtp,
};
