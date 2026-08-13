const subscriptionService = require('../services/subscription.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getPlans = asyncHandler(async (req, res) => {
  const plans = subscriptionService.getAvailablePlans(req.query.countryCode);
  ApiResponse.ok('Available subscription plans retrieved', plans).send(res);
});

const subscribe = asyncHandler(async (req, res) => {
  const { companyId, planId } = req.body;
  const result = await subscriptionService.subscribeCompany(req.user._id, companyId, planId);
  ApiResponse.created('Subscription order created successfully', result).send(res);
});

const cancel = asyncHandler(async (req, res) => {
  const { companyId } = req.body;
  const subscription = await subscriptionService.cancelSubscription(req.user._id, companyId);
  ApiResponse.ok('Subscription cancelled successfully', subscription).send(res);
});

const getTransactions = asyncHandler(async (req, res) => {
  const transactions = await subscriptionService.getCompanyTransactions(req.query.companyId);
  ApiResponse.ok('Company transaction history retrieved', transactions).send(res);
});

const handleWebhook = asyncHandler(async (req, res) => {
  const provider = req.params.provider || 'stripe';
  const result = await subscriptionService.handlePaymentWebhook(req, provider);
  res.json(result);
});

module.exports = {
  getPlans,
  subscribe,
  cancel,
  getTransactions,
  handleWebhook,
};
