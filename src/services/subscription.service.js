const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const Company = require('../models/Company');
const ApiError = require('../utils/ApiError');
const { getPaymentAdapter } = require('../adapters/payment');
const { getCountryPlugin } = require('../plugins/countries');

const PLAN_PRICING = {
  'pay-per-job': { name: 'Pay Per Job', price: 9900, jobQuota: 1, resumeQuota: 0, hasResumeDB: false },
  'monthly': { name: 'Monthly Subscription', price: 29900, jobQuota: 10, resumeQuota: 100, hasResumeDB: true },
  'annual': { name: 'Annual Enterprise', price: 249900, jobQuota: 0, resumeQuota: 0, hasResumeDB: true },
  'enterprise': { name: 'Custom Enterprise', price: 499900, jobQuota: 0, resumeQuota: 0, hasResumeDB: true },
};

/**
 * Get available plans with tax calculation based on country.
 * @param {string} [countryCode='US']
 * @returns {object}
 */
function getAvailablePlans(countryCode = 'US') {
  let plugin;
  try {
    plugin = getCountryPlugin(countryCode);
  } catch {
    plugin = getCountryPlugin('US');
  }

  const plans = {};
  for (const [planId, planInfo] of Object.entries(PLAN_PRICING)) {
    const taxInfo = plugin.calculateTax(planInfo.price);
    plans[planId] = {
      id: planId,
      ...planInfo,
      currency: plugin.currency,
      tax: taxInfo.breakdown,
      totalPrice: taxInfo.totalAmount,
    };
  }

  return {
    country: plugin.name,
    currency: plugin.currency,
    paymentProvider: plugin.getPaymentProvider(),
    plans,
  };
}

/**
 * Subscribe company to a billing plan.
 * Uses the country's payment provider (Razorpay for India, Stripe for US/UK).
 * @param {string} userId
 * @param {string} companyId
 * @param {string} planId
 * @returns {Promise<object>}
 */
async function subscribeCompany(userId, companyId, planId) {
  const company = await Company.findById(companyId);
  if (!company || !company.isTeamMember(userId)) {
    throw ApiError.forbidden('You do not have permission to manage billing for this company');
  }

  const planInfo = PLAN_PRICING[planId];
  if (!planInfo) {
    throw ApiError.badRequest('Invalid subscription plan');
  }

  // Get country plugin to determine tax & payment provider
  const plugin = getCountryPlugin(company.countryCode || 'US');
  const providerName = plugin.getPaymentProvider();
  const paymentAdapter = getPaymentAdapter(providerName);

  const taxInfo = plugin.calculateTax(planInfo.price);

  // Create payment order via adapter
  const order = await paymentAdapter.createOrder({
    amount: taxInfo.totalAmount,
    currency: plugin.currency,
    metadata: { companyId: company._id.toString(), planId },
    description: `Subscription: ${planInfo.name}`,
  });

  // Calculate 1 month / 1 year period end
  const durationMonths = planId === 'annual' ? 12 : 1;
  const currentPeriodEnd = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000);

  // Upsert Subscription
  const subscription = await Subscription.findOneAndUpdate(
    { company: company._id },
    {
      company: company._id,
      plan: planId,
      status: 'active',
      paymentProvider: providerName,
      externalSubscriptionId: order.orderId,
      jobPostQuota: planInfo.jobQuota,
      resumeSearchQuota: planInfo.resumeQuota,
      hasResumeDBAccess: planInfo.hasResumeDB,
      currentPeriodStart: new Date(),
      currentPeriodEnd,
    },
    { upsert: true, new: true }
  );

  // Record Transaction
  await Transaction.create({
    company: company._id,
    type: 'subscription',
    amount: taxInfo.totalAmount,
    currency: plugin.currency,
    status: 'succeeded',
    paymentProvider: providerName,
    externalPaymentId: order.orderId,
    description: `Subscribed to ${planInfo.name}`,
    taxAmount: taxInfo.taxAmount,
    taxBreakdown: taxInfo.breakdown,
  });

  return {
    subscription: subscription.toJSON(),
    order,
  };
}

/**
 * Cancel an active subscription.
 * @param {string} userId
 * @param {string} companyId
 * @returns {Promise<object>}
 */
async function cancelSubscription(userId, companyId) {
  const company = await Company.findById(companyId);
  if (!company || !company.isTeamMember(userId)) {
    throw ApiError.forbidden('Permission denied');
  }

  const subscription = await Subscription.findOne({ company: company._id });
  if (!subscription || subscription.status === 'cancelled') {
    throw ApiError.badRequest('No active subscription found to cancel');
  }

  if (subscription.externalSubscriptionId) {
    const paymentAdapter = getPaymentAdapter(subscription.paymentProvider);
    await paymentAdapter.cancelSubscription(subscription.externalSubscriptionId).catch(() => {});
  }

  subscription.status = 'cancelled';
  subscription.cancelledAt = new Date();
  await subscription.save();

  return subscription.toJSON();
}

/**
 * Get transaction audit log for company.
 * @param {string} companyId
 * @returns {Promise<Array>}
 */
async function getCompanyTransactions(companyId) {
  return Transaction.find({ company: companyId }).sort({ createdAt: -1 });
}

/**
 * Generic Payment Webhook Handler.
 * Routes raw webhook event to the appropriate payment adapter.
 * @param {object} req - Express request
 * @param {string} providerName - 'stripe' | 'razorpay'
 */
async function handlePaymentWebhook(req, providerName) {
  const paymentAdapter = getPaymentAdapter(providerName);
  const normalizedEvent = await paymentAdapter.constructWebhookEvent(req);

  // Handle normalized event types
  if (normalizedEvent.eventType === 'payment.succeeded') {
    // Process successful payment
  } else if (normalizedEvent.eventType === 'subscription.cancelled') {
    // Handle cancelled subscription
  }

  return { received: true };
}

module.exports = {
  getAvailablePlans,
  subscribeCompany,
  cancelSubscription,
  getCompanyTransactions,
  handlePaymentWebhook,
};
