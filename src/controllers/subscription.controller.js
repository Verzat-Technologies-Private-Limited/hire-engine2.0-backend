const subscriptionService = require('../services/subscription.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getPlans = asyncHandler(async (req, res) => {
  const plans = await subscriptionService.getAvailablePlans(req.query.countryCode);
  ApiResponse.ok('Available subscription plans retrieved', plans).send(res);
});

const subscribe = asyncHandler(async (req, res) => {
  const { companyId, planId } = req.body;
  const result = await subscriptionService.subscribeCompany(req.user._id, companyId, planId);
  ApiResponse.created('Subscription order created successfully', result).send(res);
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { companyId, ...paymentData } = req.body;
  const result = await subscriptionService.verifyPayment(req.user._id, companyId, paymentData);
  ApiResponse.ok('Payment verified and subscription activated successfully', result).send(res);
});

const getCurrentSubscription = asyncHandler(async (req, res) => {
  const result = await subscriptionService.getCurrentSubscription(req.user._id, req.query.companyId);
  ApiResponse.ok('Current subscription retrieved successfully', result).send(res);
});

const cancel = asyncHandler(async (req, res) => {
  const { companyId, reason } = req.body;
  const subscription = await subscriptionService.cancelSubscription(req.user._id, companyId, reason);
  ApiResponse.ok('Subscription cancelled successfully', subscription).send(res);
});

const getTransactions = asyncHandler(async (req, res) => {
  const { companyId, ...queryParams } = req.query;
  const result = await subscriptionService.getCompanyTransactions(req.user._id, companyId, queryParams);
  ApiResponse.ok('Company transaction history retrieved', result.docs, result.meta).send(res);
});

const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await subscriptionService.getTransactionInvoice(req.user._id, req.params.id);
  ApiResponse.ok('Transaction tax invoice retrieved successfully', invoice).send(res);
});

const handleWebhook = asyncHandler(async (req, res) => {
  const provider = req.params.provider || 'stripe';
  const result = await subscriptionService.handlePaymentWebhook(req, provider);
  res.json(result);
});

module.exports = {
  getPlans,
  subscribe,
  verifyPayment,
  getCurrentSubscription,
  cancel,
  getTransactions,
  getInvoice,
  handleWebhook,
};
