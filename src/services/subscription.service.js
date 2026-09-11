const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const Company = require('../models/Company');
const Plan = require('../models/Plan');
const ApiError = require('../utils/ApiError');
const { getPaymentAdapter } = require('../adapters/payment');
const { getCountryPlugin } = require('../plugins/countries');
const { paginateQuery } = require('../utils/pagination');
const logger = require('../config/logger');

/**
 * Resolve company by ID or logged-in user, and verify caller permissions.
 * @param {string} userId
 * @param {string} [companyId]
 * @returns {Promise<import('../models/Company')>}
 */
async function resolveCompanyForUser(userId, companyId) {
  let company;
  if (companyId) {
    company = await Company.findById(companyId);
  } else {
    company = await Company.findOne({
      $or: [{ owner: userId }, { 'teamMembers.user': userId }],
    });
  }

  if (!company) {
    throw ApiError.notFound('Company not found or you are not associated with any company');
  }

  if (!company.isTeamMember(userId)) {
    throw ApiError.forbidden('You do not have permission to manage billing for this company');
  }

  return company;
}

/**
 * Generate a sequential tax-compliant invoice number: INV-YYYY-XXXXX
 * @returns {Promise<string>}
 */
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

  const count = await Transaction.countDocuments({
    status: 'succeeded',
    createdAt: { $gte: startOfYear, $lte: endOfYear },
  });

  const seq = String(count + 1).padStart(5, '0');
  return `INV-${year}-${seq}`;
}

/**
 * Get available plans with tax calculation based on country and localized pricing.
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
    const basePrice = dbPlan.getPriceForCurrency
      ? dbPlan.getPriceForCurrency(plugin.currency)
      : dbPlan.price;

    const taxInfo = plugin.calculateTax(basePrice);

    plans[dbPlan.planId] = {
      id: dbPlan.planId,
      name: dbPlan.name,
      description: dbPlan.description,
      price: basePrice,
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
 * Step 1: Create a subscription purchase order.
 * Does NOT activate subscription prematurely. Creates a pending transaction.
 * @param {string} userId
 * @param {string} companyId
 * @param {string} planId
 * @returns {Promise<object>}
 */
async function subscribeCompany(userId, companyId, planId) {
  const company = await resolveCompanyForUser(userId, companyId);

  // Look up plan from database
  const planInfo = await Plan.findOne({ planId, isActive: true });
  if (!planInfo) {
    throw ApiError.badRequest('Invalid or inactive subscription plan');
  }

  // Get country plugin to determine tax & payment provider
  const plugin = getCountryPlugin(company.countryCode || 'US');
  const providerName = plugin.getPaymentProvider();
  const paymentAdapter = getPaymentAdapter(providerName);

  const basePrice = planInfo.getPriceForCurrency
    ? planInfo.getPriceForCurrency(plugin.currency)
    : planInfo.price;

  const taxInfo = plugin.calculateTax(basePrice, {
    state: company.address?.state || company.state,
  });

  // Create payment order via gateway adapter
  const order = await paymentAdapter.createOrder({
    amount: taxInfo.totalAmount,
    currency: plugin.currency,
    metadata: {
      companyId: company._id.toString(),
      planId: planInfo.planId,
      userId: userId.toString(),
    },
    description: `Subscription: ${planInfo.name}`,
  });

  // Record Transaction in PENDING state (awaiting payment verification)
  const transaction = await Transaction.create({
    company: company._id,
    type: 'subscription',
    amount: taxInfo.totalAmount,
    currency: plugin.currency,
    status: 'pending',
    paymentProvider: providerName,
    externalPaymentId: order.orderId,
    description: `Subscription Order: ${planInfo.name}`,
    taxAmount: taxInfo.taxAmount,
    taxBreakdown: taxInfo.breakdown,
    providerMetadata: {
      planId: planInfo.planId,
      providerData: order.providerData,
    },
    processedBy: userId,
  });

  return {
    order,
    transactionId: transaction._id,
    plan: {
      id: planInfo.planId,
      name: planInfo.name,
      basePrice,
      taxAmount: taxInfo.taxAmount,
      totalAmount: taxInfo.totalAmount,
      currency: plugin.currency,
      taxBreakdown: taxInfo.breakdown,
    },
  };
}

/**
 * Step 2: Verify payment authenticity and activate subscription.
 * @param {string} userId
 * @param {string} companyId
 * @param {object} paymentData - { paymentProvider, razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentIntentId }
 * @returns {Promise<object>}
 */
async function verifyPayment(userId, companyId, paymentData) {
  const company = await resolveCompanyForUser(userId, companyId);

  const plugin = getCountryPlugin(company.countryCode || 'US');
  const providerName = paymentData.paymentProvider || plugin.getPaymentProvider();
  const paymentAdapter = getPaymentAdapter(providerName);

  // 1. Verify payment with gateway adapter
  const verification = await paymentAdapter.verifyPayment(paymentData);
  if (!verification || !verification.verified || verification.status !== 'succeeded') {
    // Look up transaction to mark as failed
    const lookupId = paymentData.razorpay_order_id || paymentData.paymentIntentId;
    if (lookupId) {
      await Transaction.findOneAndUpdate(
        { externalPaymentId: lookupId, company: company._id },
        { status: 'failed' }
      );
    }
    throw ApiError.badRequest('Payment verification failed or was not approved by payment gateway');
  }

  // 2. Locate corresponding pending transaction
  const orderId = paymentData.razorpay_order_id || paymentData.paymentIntentId;
  let transaction = await Transaction.findOne({
    $or: [{ externalPaymentId: orderId }, { 'providerMetadata.providerData.orderId': orderId }],
    company: company._id,
  });

  if (!transaction) {
    // Fallback: search most recent pending transaction for this company
    transaction = await Transaction.findOne({
      company: company._id,
      status: 'pending',
    }).sort({ createdAt: -1 });
  }

  if (!transaction) {
    throw ApiError.notFound('Pending transaction record not found for this payment');
  }

  // Idempotency: if already processed as succeeded
  if (transaction.status === 'succeeded') {
    const existingSub = await Subscription.findOne({ company: company._id });
    return {
      subscription: existingSub ? existingSub.toJSON() : null,
      transaction: transaction.toJSON(),
      alreadyProcessed: true,
    };
  }

  // 3. Mark transaction as succeeded and assign official invoice number
  transaction.status = 'succeeded';
  transaction.externalPaymentId = verification.paymentId || transaction.externalPaymentId;
  transaction.invoiceNumber = await generateInvoiceNumber();
  await transaction.save();

  // 4. Retrieve plan and activate subscription
  const planId = transaction.providerMetadata?.planId;
  const planInfo = await Plan.findOne({ planId });
  if (!planInfo) {
    throw ApiError.notFound(`Subscription plan "${planId}" not found`);
  }

  const durationMonths = planInfo.durationMonths || 1;
  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000);

  // Quota rollover logic: preserve unused quotas if upgrading active plan
  const existingSub = await Subscription.findOne({ company: company._id });
  let jobPostQuota = planInfo.jobQuota;
  let jobPostsUsed = 0;
  let resumeSearchQuota = planInfo.resumeQuota;
  let resumeSearchesUsed = 0;

  if (existingSub && existingSub.isCurrentlyActive()) {
    if (existingSub.jobPostQuota > 0 && planInfo.jobQuota > 0) {
      const remainingJobs = Math.max(0, existingSub.jobPostQuota - existingSub.jobPostsUsed);
      jobPostQuota = planInfo.jobQuota + remainingJobs;
    }
  }

  const subscription = await Subscription.findOneAndUpdate(
    { company: company._id },
    {
      company: company._id,
      plan: planInfo.planId,
      status: 'active',
      paymentProvider: providerName,
      externalSubscriptionId: verification.paymentId || orderId,
      jobPostQuota,
      jobPostsUsed,
      resumeSearchQuota,
      resumeSearchesUsed,
      hasResumeDBAccess: planInfo.hasResumeDB,
      currentPeriodStart,
      currentPeriodEnd,
      cancelledAt: null,
      cancelReason: '',
    },
    { upsert: true, new: true }
  );

  return {
    subscription: subscription.toJSON(),
    transaction: transaction.toJSON(),
  };
}

/**
 * Get current active subscription details, quota progress, and expiration for employer.
 * @param {string} userId
 * @param {string} [companyId]
 * @returns {Promise<object>}
 */
async function getCurrentSubscription(userId, companyId) {
  const company = await resolveCompanyForUser(userId, companyId);

  const subscription = await Subscription.findOne({ company: company._id });
  if (!subscription) {
    return {
      active: false,
      status: 'none',
      subscription: null,
      plan: null,
    };
  }

  const planInfo = await Plan.findOne({ planId: subscription.plan });
  const now = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(subscription.currentPeriodEnd) - now) / (1000 * 60 * 60 * 24))
  );

  const jobPostQuota = subscription.jobPostQuota || 0;
  const jobPostsUsed = subscription.jobPostsUsed || 0;
  const resumeSearchQuota = subscription.resumeSearchQuota || 0;
  const resumeSearchesUsed = subscription.resumeSearchesUsed || 0;

  return {
    active: subscription.isCurrentlyActive(),
    status: subscription.status,
    subscription: subscription.toJSON(),
    plan: planInfo ? planInfo.toJSON() : null,
    daysRemaining,
    quotas: {
      jobs: {
        total: jobPostQuota === 0 ? 'unlimited' : jobPostQuota,
        used: jobPostsUsed,
        remaining: jobPostQuota === 0 ? 'unlimited' : Math.max(0, jobPostQuota - jobPostsUsed),
        percentageUsed: jobPostQuota === 0 ? 0 : Math.round((jobPostsUsed / jobPostQuota) * 100),
      },
      resumes: {
        total: resumeSearchQuota === 0 ? 'unlimited' : resumeSearchQuota,
        used: resumeSearchesUsed,
        remaining:
          resumeSearchQuota === 0 ? 'unlimited' : Math.max(0, resumeSearchQuota - resumeSearchesUsed),
        percentageUsed:
          resumeSearchQuota === 0 ? 0 : Math.round((resumeSearchesUsed / resumeSearchQuota) * 100),
      },
      hasResumeDBAccess: subscription.hasResumeDBAccess,
    },
  };
}

/**
 * Cancel an active subscription.
 * @param {string} userId
 * @param {string} companyId
 * @param {string} [reason='']
 * @returns {Promise<object>}
 */
async function cancelSubscription(userId, companyId, reason = '') {
  const company = await resolveCompanyForUser(userId, companyId);

  const subscription = await Subscription.findOne({ company: company._id });
  if (!subscription || subscription.status === 'cancelled') {
    throw ApiError.badRequest('No active subscription found to cancel');
  }

  if (subscription.externalSubscriptionId) {
    const paymentAdapter = getPaymentAdapter(subscription.paymentProvider);
    await paymentAdapter.cancelSubscription(subscription.externalSubscriptionId).catch((err) => {
      logger.warn('Failed to cancel gateway subscription', { error: err.message });
    });
  }

  subscription.status = 'cancelled';
  subscription.cancelledAt = new Date();
  if (reason) subscription.cancelReason = reason;
  await subscription.save();

  return subscription.toJSON();
}

/**
 * Get transaction audit log for company with strict tenant isolation, pagination, and filters.
 * @param {string} userId
 * @param {string} companyId
 * @param {object} queryParams - { page, limit, status, type, startDate, endDate }
 * @returns {Promise<{ docs: Array, meta: object }>}
 */
async function getCompanyTransactions(userId, companyId, queryParams = {}) {
  const company = await resolveCompanyForUser(userId, companyId);

  const filter = { company: company._id };

  if (queryParams.status) {
    filter.status = queryParams.status;
  }
  if (queryParams.type) {
    filter.type = queryParams.type;
  }
  if (queryParams.startDate || queryParams.endDate) {
    filter.createdAt = {};
    if (queryParams.startDate) filter.createdAt.$gte = new Date(queryParams.startDate);
    if (queryParams.endDate) filter.createdAt.$lte = new Date(queryParams.endDate);
  }

  return paginateQuery(Transaction, filter, queryParams, { sort: '-createdAt' });
}

/**
 * Get complete B2B Tax Invoice breakdown for a transaction.
 * @param {string} userId
 * @param {string} transactionId
 * @returns {Promise<object>}
 */
async function getTransactionInvoice(userId, transactionId) {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    throw ApiError.notFound('Transaction not found');
  }

  const company = await Company.findById(transaction.company);
  if (!company || !company.isTeamMember(userId)) {
    throw ApiError.forbidden('You do not have permission to view invoice for this transaction');
  }

  const plugin = getCountryPlugin(company.countryCode || 'US');

  const sellerProfiles = {
    IN: {
      legalEntity: 'Hire Engine India Private Limited',
      address: 'Plot 42, Cyber City, Gurugram, Haryana 122002, India',
      state: 'HR',
      gstin: '06AAACH7409R1ZZ',
      pan: 'AAACH7409R',
      sacCode: '998311',
    },
    US: {
      legalEntity: 'Hire Engine Inc.',
      address: '100 Innovation Boulevard, Suite 500, San Francisco, CA 94107, USA',
      state: 'CA',
      ein: '12-3456789',
    },
  };

  const seller = sellerProfiles[plugin.code] || sellerProfiles.US;

  return {
    invoiceNumber: transaction.invoiceNumber || 'INV-PENDING',
    date: transaction.createdAt,
    status: transaction.status,
    currency: transaction.currency,
    paymentProvider: transaction.paymentProvider,
    externalPaymentId: transaction.externalPaymentId,
    description: transaction.description,
    seller,
    buyer: {
      companyId: company._id,
      name: company.name,
      country: company.countryCode,
      address: company.address,
      taxIdentifier:
        company.registrationDetails?.gstNumber ||
        company.registrationDetails?.einNumber ||
        company.registrationDetails?.panNumber ||
        'N/A',
    },
    lineItems: [
      {
        description: transaction.description || 'Recruiter Subscription Plan',
        sacCode: seller.sacCode || 'N/A',
        baseAmount: (transaction.amount || 0) - (transaction.taxAmount || 0),
        taxAmount: transaction.taxAmount || 0,
        totalAmount: transaction.amount || 0,
      },
    ],
    taxBreakdown: transaction.taxBreakdown || {},
    totalAmount: transaction.amount,
  };
}

/**
 * Generic Payment Webhook Handler.
 * Fulfills subscriptions asynchronously and handles cancellations/failures.
 * @param {object} req - Express request
 * @param {string} providerName - 'stripe' | 'razorpay'
 */
async function handlePaymentWebhook(req, providerName) {
  const paymentAdapter = getPaymentAdapter(providerName);
  const normalizedEvent = await paymentAdapter.constructWebhookEvent(req);

  logger.info(`Received ${providerName} webhook: ${normalizedEvent.eventType}`);

  if (normalizedEvent.eventType === 'payment.succeeded' || normalizedEvent.eventType === 'invoice.paid') {
    const data = normalizedEvent.data;
    const orderId = data.order_id || data.id || data.payment_intent;

    let transaction = await Transaction.findOne({
      $or: [{ externalPaymentId: orderId }, { 'providerMetadata.providerData.orderId': orderId }],
    });

    if (transaction && transaction.status !== 'succeeded') {
      transaction.status = 'succeeded';
      const paymentId = typeof data.id === 'string' && data.id.startsWith('pay_') ? data.id : null;
      if (paymentId) {
        transaction.externalPaymentId = paymentId;
      }
      if (!transaction.invoiceNumber) {
        transaction.invoiceNumber = await generateInvoiceNumber();
      }
      await transaction.save();

      const planId = transaction.providerMetadata?.planId;
      const planInfo = await Plan.findOne({ planId });
      if (planInfo) {
        const durationMonths = planInfo.durationMonths || 1;
        await Subscription.findOneAndUpdate(
          { company: transaction.company },
          {
            company: transaction.company,
            plan: planInfo.planId,
            status: 'active',
            paymentProvider: providerName,
            externalSubscriptionId: paymentId || orderId,
            jobPostQuota: planInfo.jobQuota,
            resumeSearchQuota: planInfo.resumeQuota,
            hasResumeDBAccess: planInfo.hasResumeDB,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000),
          },
          { upsert: true, new: true }
        );
      }
    }

  } else if (normalizedEvent.eventType === 'payment.failed' || normalizedEvent.eventType === 'invoice.failed') {
    const data = normalizedEvent.data;
    const orderId = data.order_id || data.id || data.payment_intent;

    const transaction = await Transaction.findOne({
      $or: [{ externalPaymentId: orderId }, { 'providerMetadata.providerData.orderId': orderId }],
    });

    if (transaction) {
      transaction.status = 'failed';
      await transaction.save();

      await Subscription.findOneAndUpdate(
        { company: transaction.company },
        { status: 'past_due' }
      );
    }
  } else if (normalizedEvent.eventType === 'subscription.cancelled') {
    const data = normalizedEvent.data;
    const subId = data.id || data.subscription_id;

    if (subId) {
      await Subscription.findOneAndUpdate(
        { externalSubscriptionId: subId },
        { status: 'cancelled', cancelledAt: new Date() }
      );
    }
  }

  return { received: true };
}

module.exports = {
  getAvailablePlans,
  subscribeCompany,
  verifyPayment,
  getCurrentSubscription,
  cancelSubscription,
  getCompanyTransactions,
  getTransactionInvoice,
  handlePaymentWebhook,
};
