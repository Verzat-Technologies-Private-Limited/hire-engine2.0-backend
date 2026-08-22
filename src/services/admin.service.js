const Company = require('../models/Company');
const User = require('../models/User');
const Flag = require('../models/Flag');
const Taxonomy = require('../models/Taxonomy');
const SystemConfig = require('../models/SystemConfig');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Plan = require('../models/Plan');
const ApiError = require('../utils/ApiError');
const { getPaymentAdapter } = require('../adapters/payment');
const { paginateQuery } = require('../utils/pagination');

/**
 * List pending employer business verifications.
 */
async function getPendingEmployers(queryParams) {
  return paginateQuery(Company, { verificationStatus: 'pending' }, queryParams, {
    populate: 'owner',
    sort: '-createdAt',
  });
}

/**
 * Review and approve or reject employer account.
 */
async function verifyEmployer(companyId, adminId, verificationData, req) {
  const { status, notes } = verificationData;

  const company = await Company.findById(companyId);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  company.verificationStatus = status;
  company.verificationNotes = notes || '';
  company.verifiedAt = new Date();
  company.verifiedBy = adminId;
  await company.save();

  await AuditLog.log({
    performedBy: adminId,
    action: status === 'approved' ? 'company.verified' : 'company.rejected',
    targetModel: 'Company',
    targetId: company._id,
    details: { status, notes },
    req,
  });

  return company.toJSON();
}

/**
 * Suspend or ban a user / employer.
 */
async function suspendUser(userId, adminId, actionData, req) {
  const { action, reason } = actionData;

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (action === 'suspend') user.status = 'suspended';
  if (action === 'ban') user.status = 'banned';
  if (action === 'reactivate') user.status = 'active';

  await user.save();

  await AuditLog.log({
    performedBy: adminId,
    action: `user.${action}`,
    targetModel: 'User',
    targetId: user._id,
    details: { reason, action },
    req,
  });

  return user.toJSON();
}

/**
 * Manage content flags reported by community/AI.
 */
async function getFlags(queryParams) {
  const filter = {};
  if (queryParams.status) filter.status = queryParams.status;

  return paginateQuery(Flag, filter, queryParams, {
    populate: 'reportedBy',
    sort: '-createdAt',
  });
}

async function resolveFlag(flagId, adminId, resolutionData, req) {
  const flag = await Flag.findById(flagId);
  if (!flag) {
    throw ApiError.notFound('Flag report not found');
  }

  flag.status = resolutionData.status;
  flag.resolutionNote = resolutionData.resolutionNote || '';
  flag.actionTaken = resolutionData.actionTaken || 'none';
  flag.resolvedBy = adminId;
  flag.resolvedAt = new Date();
  await flag.save();

  // Handle action
  if (resolutionData.actionTaken === 'removed' && flag.targetModel === 'Job') {
    await Job.findByIdAndUpdate(flag.targetId, { status: 'closed' });
  }

  await AuditLog.log({
    performedBy: adminId,
    action: 'flag.resolved',
    targetModel: 'Flag',
    targetId: flag._id,
    details: resolutionData,
    req,
  });

  return flag.toJSON();
}

/**
 * Manage global internal taxonomy (skills, categories, industry tags).
 */
async function getTaxonomy(queryParams) {
  const filter = {};
  if (queryParams.type) filter.type = queryParams.type;

  return Taxonomy.find(filter).sort({ sortOrder: 1, name: 1 });
}

async function createTaxonomyEntry(adminId, data, req) {
  const taxonomy = await Taxonomy.create(data);

  await AuditLog.log({
    performedBy: adminId,
    action: 'taxonomy.created',
    targetModel: 'Taxonomy',
    targetId: taxonomy._id,
    details: data,
    req,
  });

  return taxonomy.toJSON();
}

async function updateTaxonomyEntry(id, adminId, data, req) {
  const taxonomy = await Taxonomy.findByIdAndUpdate(id, data, { new: true });
  if (!taxonomy) throw ApiError.notFound('Taxonomy item not found');

  await AuditLog.log({
    performedBy: adminId,
    action: 'taxonomy.updated',
    targetModel: 'Taxonomy',
    targetId: taxonomy._id,
    details: data,
    req,
  });

  return taxonomy.toJSON();
}

/**
 * Manage system-wide configuration thresholds (rate limits, API limits).
 */
async function getSystemConfigs() {
  return SystemConfig.find({});
}

async function updateSystemConfig(adminId, configData, req) {
  const { key, value, description, category } = configData;
  const config = await SystemConfig.setValue(key, value, {
    description,
    category,
    updatedBy: adminId,
  });

  await AuditLog.log({
    performedBy: adminId,
    action: 'config.updated',
    targetModel: 'SystemConfig',
    targetId: config._id,
    details: { key, value },
    req,
  });

  return config.toJSON();
}

/**
 * Executive platform overview reports.
 */
async function getExecutiveReport() {
  const [totalUsers, totalEmployers, totalJobs, activeJobs, totalApplications, totalRevenue] = await Promise.all([
    User.countDocuments({ role: 'jobseeker' }),
    Company.countDocuments({ verificationStatus: 'approved' }),
    Job.countDocuments({}),
    Job.countDocuments({ status: 'active' }),
    Application.countDocuments({}),
    Transaction.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  return {
    metrics: {
      totalUsers,
      totalEmployers,
      totalJobs,
      activeJobs,
      totalApplications,
      totalRevenue: totalRevenue[0]?.total || 0,
    },
  };
}

/**
 * Process payment refund for employer dispute resolution.
 */
async function processRefund(transactionId, adminId, refundData, req) {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction || transaction.status !== 'succeeded') {
    throw ApiError.badRequest('Transaction not eligible for refund');
  }

  const paymentAdapter = getPaymentAdapter(transaction.paymentProvider);
  const refundResult = await paymentAdapter.processRefund(
    transaction.externalPaymentId,
    refundData.amount,
    refundData.reason
  );

  transaction.status = 'refunded';
  transaction.refundReason = refundData.reason;
  await transaction.save();

  await AuditLog.log({
    performedBy: adminId,
    action: 'refund.processed',
    targetModel: 'Transaction',
    targetId: transaction._id,
    details: refundResult,
    req,
  });

  return transaction.toJSON();
}

/**
 * Get audit logs trail.
 */
async function getAuditLogs(queryParams) {
  return paginateQuery(AuditLog, {}, queryParams, {
    populate: 'performedBy',
    sort: '-createdAt',
  });
}

// ── Plan Management ──────────────────────────────────

/**
 * List all subscription plans (optionally filter by active status).
 * @param {object} queryParams
 * @returns {Promise<Array>}
 */
async function getPlans(queryParams) {
  const filter = {};
  if (queryParams.active !== undefined) {
    filter.isActive = queryParams.active === 'true';
  }
  return Plan.find(filter).sort({ price: 1 });
}

/**
 * Create a new subscription plan.
 * @param {string} adminId
 * @param {object} planData
 * @param {object} req
 * @returns {Promise<object>}
 */
async function createPlan(adminId, planData, req) {
  const existing = await Plan.findOne({ planId: planData.planId });
  if (existing) {
    throw ApiError.conflict(`A plan with ID "${planData.planId}" already exists`);
  }

  const plan = await Plan.create(planData);

  await AuditLog.log({
    performedBy: adminId,
    action: 'plan.created',
    targetModel: 'Plan',
    targetId: plan._id,
    details: planData,
    req,
  });

  return plan.toJSON();
}

/**
 * Update an existing subscription plan.
 * @param {string} planId - MongoDB ObjectId
 * @param {string} adminId
 * @param {object} updateData
 * @param {object} req
 * @returns {Promise<object>}
 */
async function updatePlan(planId, adminId, updateData, req) {
  const plan = await Plan.findByIdAndUpdate(planId, updateData, { new: true, runValidators: true });
  if (!plan) {
    throw ApiError.notFound('Plan not found');
  }

  await AuditLog.log({
    performedBy: adminId,
    action: 'plan.updated',
    targetModel: 'Plan',
    targetId: plan._id,
    details: updateData,
    req,
  });

  return plan.toJSON();
}

/**
 * Delete a subscription plan (hard delete).
 * Prevents deletion if any active subscriptions reference this plan.
 * @param {string} planId - MongoDB ObjectId
 * @param {string} adminId
 * @param {object} req
 * @returns {Promise<object>}
 */
async function deletePlan(planId, adminId, req) {
  const plan = await Plan.findById(planId);
  if (!plan) {
    throw ApiError.notFound('Plan not found');
  }

  // Check if any active subscriptions use this plan
  const Subscription = require('../models/Subscription');
  const activeCount = await Subscription.countDocuments({
    plan: plan.planId,
    status: { $in: ['active', 'past_due'] },
  });

  if (activeCount > 0) {
    throw ApiError.conflict(
      `Cannot delete plan "${plan.name}". ${activeCount} active subscription(s) are using it. Deactivate the plan instead.`
    );
  }

  await Plan.findByIdAndDelete(planId);

  await AuditLog.log({
    performedBy: adminId,
    action: 'plan.deleted',
    targetModel: 'Plan',
    targetId: plan._id,
    details: { planId: plan.planId, name: plan.name },
    req,
  });

  return { message: `Plan "${plan.name}" deleted successfully` };
}

module.exports = {
  getPendingEmployers,
  verifyEmployer,
  suspendUser,
  getFlags,
  resolveFlag,
  getTaxonomy,
  createTaxonomyEntry,
  updateTaxonomyEntry,
  getSystemConfigs,
  updateSystemConfig,
  getExecutiveReport,
  processRefund,
  getAuditLogs,
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
};
