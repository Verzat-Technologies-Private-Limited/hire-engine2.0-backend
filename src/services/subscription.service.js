const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const Company = require('../models/Company');
const Plan = require('../models/Plan');
const ApiError = require('../utils/ApiError');
const { getPaymentAdapter } = require('../adapters/payment');
const { getCountryPlugin } = require('../plugins/countries');

/**
 * Get available plans with tax calculation based on country.
 * Reads plans from the Plan collection (only active plans).
 * @param {string} [countryCode='US']
 * @returns {Promise<object>}
 */
async function getAvailablePlans(countryCode = 'US') {
  let plugin;
  try {
    plugin = getCountryPlugin(countryCode);
  } catch {
    plugin = getCountryPlugin('US');
  }

  const dbPlans = await Plan.find({ isActive: true }).sort({ price: 1 });

  const plans = {};
  for (const dbPlan of dbPlans) {
    const taxInfo = plugin.calculateTax(dbPlan.price);
    plans[dbPlan.planId] = {
      id: dbPlan.planId,
      name: dbPlan.name,
      description: dbPlan.description,
      price: dbPlan.price,
      jobQuota: dbPlan.jobQuota,
      resumeQuota: dbPlan.resumeQuota,
      hasResumeDB: dbPlan.hasResumeDB,
      durationMonths: dbPlan.durationMonths,
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

  // Look up plan from database
  const planInfo = await Plan.findOne({ planId, isActive: true });
  if (!planInfo) {
    throw ApiError.badRequest('Invalid or inactive subscription plan');
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

  // Calculate period end based on plan duration
  const durationMonths = planInfo.durationMonths || 1;
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

