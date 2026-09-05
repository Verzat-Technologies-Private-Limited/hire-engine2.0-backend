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
const { getCacheAdapter } = require('../adapters/cache');
const { paginateQuery } = require('../utils/pagination');
const { NotificationType } = require('../utils/constants');
const notificationService = require('./notification.service');
const emailService = require('./email.service');
const logger = require('../config/logger');

/**
 * List all users with optional filters (role, status, search).
 * Returns paginated results with user id, name, email, role, and status.
 */
async function getAllUsers(queryParams) {
  const filter = { role: { $ne: 'admin' } };
  if (queryParams.role) filter.role = queryParams.role;
  if (queryParams.status) filter.status = queryParams.status;
  if (queryParams.search) {
    const searchRegex = new RegExp(queryParams.search, 'i');
    filter.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
    ];
  }

  return paginateQuery(User, filter, queryParams, {
    select: '_id firstName lastName email role status createdAt lastLoginAt',
    sort: '-createdAt',
  });
}

/**
 * List pending employer business verifications.
 * Filters by pending, under_review, or information_required.
 */
async function getPendingEmployers(queryParams) {
  const filter = {};
  if (queryParams.status) {
    filter.verificationStatus = queryParams.status;
  } else {
    filter.verificationStatus = { $in: ['pending', 'under_review', 'information_required'] };
  }

  return paginateQuery(Company, filter, queryParams, {
    populate: 'owner',
    sort: '-createdAt',
  });
}

/**
 * Get detailed employer company profile for admin review.
 * Dynamically resolves country plugin for country metadata and verification checklist.
 * @param {string} companyId
 * @returns {Promise<object>}
 */
async function getEmployerById(companyId) {
  const company = await Company.findById(companyId)
    .populate('owner', 'firstName lastName email phone isEmailVerified createdAt lastLoginAt')
    .populate('verifiedBy', 'firstName lastName email');
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  let countryMeta = {
    code: company.countryCode,
    name: company.countryCode,
    currency: '',
    documentChecklist: [],
  };

  try {
    const { getCountryPlugin } = require('../plugins/countries');
    const plugin = getCountryPlugin(company.countryCode);
    const requiredDocs = plugin.getRequiredCompanyDocuments() || [];

    const checklist = requiredDocs.map((reqDoc) => {
      const uploaded = company.documents.find((d) => d.type === reqDoc.type);
      return {
        type: reqDoc.type,
        label: reqDoc.label,
        description: reqDoc.description,
        required: reqDoc.required,
        isUploaded: Boolean(uploaded),
        uploadedDocument: uploaded || null,
      };
    });

    const totalRequired = requiredDocs.filter((d) => d.required).length;
    const uploadedRequired = checklist.filter((d) => d.required && d.isUploaded).length;

    countryMeta = {
      code: plugin.code,
      name: plugin.name,
      currency: plugin.currency,
      locale: plugin.locale,
      taxConfiguration: plugin.getTaxConfiguration(),
      privacyRules: plugin.getDataPrivacyRules(),
      formattedAddress: plugin.formatAddress(company.address || {}),
      verificationRules: plugin.getVerificationRules(),
      documentChecklist: checklist,
      documentCompleteness: {
        totalRequired,
        uploadedRequired,
        isComplete: uploadedRequired >= totalRequired,
      },
    };
  } catch (err) {
    const logger = require('../config/logger');
    logger.warn('Failed to resolve country plugin for employer review', {
      companyId: company._id,
      countryCode: company.countryCode,
      error: err.message,
    });
  }

  const result = company.toJSON();
  result.country = countryMeta;
  return result;
}

/**
 * Review and verify employer account.
 * Supports approved, rejected, information_required, and under_review statuses.
 * Dispatches both in-app notification and email to employer with reviewer notes.
 */
async function verifyEmployer(companyId, adminId, verificationData, req) {
  const { status, notes } = verificationData;

  const company = await Company.findById(companyId);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (status === 'information_required') {
    company.infoRequestedAt = new Date();
    company.infoRequestedNotes = notes || '';
  }

  company.verificationStatus = status;
  company.verificationNotes = notes || '';
  company.verifiedAt = new Date();
  company.verifiedBy = adminId;
  await company.save();

  // Audit log action mapping
  const auditActionMap = {
    approved: 'company.verified',
    rejected: 'company.rejected',
    information_required: 'company.information_requested',
    under_review: 'company.under_review',
  };
  const action = auditActionMap[status] || `company.${status}`;

  await AuditLog.log({
    performedBy: adminId,
    action,
    targetModel: 'Company',
    targetId: company._id,
    details: { status, notes },
    req,
  });

  // Gap 10: Dispatch communication to employer owner (plugin-formatted notification + email via adapter)
  try {
    const owner = await User.findById(company.owner);
    if (owner) {
      const { getCountryPlugin } = require('../plugins/countries');
      let plugin = null;
      try {
        plugin = getCountryPlugin(company.countryCode);
      } catch {
        plugin = null;
      }

      const notifData =
        plugin && typeof plugin.formatVerificationNotification === 'function'
          ? plugin.formatVerificationNotification(status, notes, company)
          : {
              title: status === 'approved' ? 'Company Verification Approved! 🎉' : 'Company Verification Update',
              message: `Your company verification status for "${company.name}" is now "${status}".`,
              actionUrl: status === 'information_required' ? '/employer/company/documents' : '/employer/company',
            };

      const notifType =
        status === 'approved'
          ? NotificationType.COMPANY_VERIFIED
          : NotificationType.COMPANY_VERIFICATION_UPDATE;

      notificationService
        .createNotification(owner._id, {
          type: notifType,
          title: notifData.title,
          message: notifData.message,
          relatedModel: 'Company',
          relatedId: company._id,
          actionUrl: notifData.actionUrl || (status === 'information_required' ? '/employer/company/documents' : '/employer/company'),
        })
        .catch((err) => logger.error('Failed to create verification in-app notification', { error: err.message }));

      // Email notification via adapter & country plugin
      emailService
        .sendCompanyVerificationDecision(owner, company, status, notes, plugin)
        .catch((err) => {
          logger.error('Failed to send verification decision email', { error: err.message });
        });
    }
  } catch (err) {
    logger.error('Error dispatching employer verification notifications', { error: err.message });
  }

  return company.toJSON();
}

/**
 * Suspend or ban a user / employer.
 */
async function suspendUser(userId, adminId, actionData, req) {
  if (userId === adminId.toString()) {
    throw ApiError.badRequest('Admin cannot suspend their own account');
  }

  const { action, reason } = actionData;

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.role === 'admin') {
    throw ApiError.badRequest('Cannot suspend another admin account');
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

// ── Gap 1: Global Job Moderation & Search ─────────────────

/**
 * List all jobs across the platform with comprehensive moderation filters.
 * @param {object} queryParams
 * @returns {Promise<{ docs: Array, meta: object }>}
 */
async function getAllJobs(queryParams) {
  const filter = {};

  if (queryParams.status) {
    filter.status = queryParams.status;
  }
  if (queryParams.company) {
    filter.company = queryParams.company;
  }
  if (queryParams.isSponsored !== undefined) {
    filter.isSponsored = queryParams.isSponsored === true || queryParams.isSponsored === 'true';
  }
  if (queryParams.employmentType) {
    filter.employmentType = queryParams.employmentType;
  }
  if (queryParams.workplaceType) {
    filter.workplaceType = queryParams.workplaceType;
  }

  // Country filtering: checks job location country or company countryCode
  if (queryParams.country) {
    const countryCode = queryParams.country.toUpperCase();
    const matchingCompanies = await Company.find({ countryCode }).select('_id').lean();
    const companyIds = matchingCompanies.map((c) => c._id);
    filter.$or = [
      { 'location.country': new RegExp(`^${countryCode}$`, 'i') },
      { company: { $in: companyIds } },
    ];
  }

  // Keyword search across title, description, skills, category
  if (queryParams.search) {
    const searchRegex = new RegExp(queryParams.search, 'i');
    const searchConditions = [
      { title: searchRegex },
      { description: searchRegex },
      { skills: searchRegex },
      { category: searchRegex },
    ];
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
      delete filter.$or;
    } else {
      filter.$or = searchConditions;
    }
  }

  // Flag moderation filter: filter jobs with pending community/AI flags
  if (queryParams.hasFlags !== undefined) {
    const hasFlags = queryParams.hasFlags === true || queryParams.hasFlags === 'true';
    const flaggedJobIds = await Flag.distinct('targetId', {
      targetModel: 'Job',
      status: 'pending',
    });
    if (hasFlags) {
      filter._id = { $in: flaggedJobIds };
    } else {
      filter._id = { $nin: flaggedJobIds };
    }
  }

  const result = await paginateQuery(Job, filter, queryParams, {
    populate: [
      { path: 'company', select: '_id name slug logoUrl countryCode verificationStatus website' },
      { path: 'postedBy', select: '_id firstName lastName email phone' },
    ],
    sort: queryParams.sort || '-createdAt',
  });

  // Attach pending flag count to each job for quick moderation triage
  if (result.docs.length > 0) {
    const jobIds = result.docs.map((d) => d._id);
    const flagCounts = await Flag.aggregate([
      { $match: { targetModel: 'Job', targetId: { $in: jobIds }, status: 'pending' } },
      { $group: { _id: '$targetId', count: { $sum: 1 } } },
    ]);
    const flagMap = new Map(flagCounts.map((f) => [f._id.toString(), f.count]));

    result.docs = result.docs.map((doc) => {
      const obj = doc.toJSON ? doc.toJSON() : doc;
      obj.pendingFlagsCount = flagMap.get(obj._id.toString()) || 0;
      return obj;
    });
  }

  return result;
}

/**
 * Get detailed job listing inspection for admin review.
 * Includes populated company profile, poster, application stats, and flag reports.
 * @param {string} jobId
 * @returns {Promise<object>}
 */
async function getJobById(jobId) {
  const job = await Job.findById(jobId)
    .populate('company')
    .populate('postedBy', '_id firstName lastName email phone role status');
  if (!job) {
    throw ApiError.notFound('Job not found');
  }

  // Fetch all flags filed against this job
  const flags = await Flag.find({ targetModel: 'Job', targetId: job._id })
    .populate('reportedBy', '_id firstName lastName email')
    .sort('-createdAt');

  // Application metrics breakdown
  const appCounts = await Application.aggregate([
    { $match: { job: job._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const applicationStats = {
    total: 0,
    byStatus: {},
  };
  appCounts.forEach((c) => {
    applicationStats.byStatus[c._id] = c.count;
    applicationStats.total += c.count;
  });

  // Country plugin metadata decoration
  let countryInfo = null;
  const countryCode = job.company?.countryCode || job.location?.country;
  if (countryCode) {
    try {
      const { getCountryPlugin } = require('../plugins/countries');
      const plugin = getCountryPlugin(countryCode);
      countryInfo = {
        code: plugin.code,
        name: plugin.name,
        currency: plugin.currency,
        locale: plugin.locale,
      };
    } catch {
      countryInfo = null;
    }
  }

  const result = job.toJSON();
  result.flags = flags;
  result.applicationStats = applicationStats;
  result.countryInfo = countryInfo;
  return result;
}

// ── Gap 2: Admin Force Actions on Jobs ─────────────────────

/**
 * Admin force status update, sponsorship toggle, or expiration change on a job.
 * Dispatches localized notification via country plugin and email adapter.
 * @param {string} jobId
 * @param {string} adminId
 * @param {object} updateData - { status, isSponsored, expiresAt, reason }
 * @param {object} req - Express request
 * @returns {Promise<object>}
 */
async function updateJobStatus(jobId, adminId, updateData, req) {
  const { status, isSponsored, expiresAt, reason } = updateData;

  const job = await Job.findById(jobId).populate('company');
  if (!job) {
    throw ApiError.notFound('Job not found');
  }

  const previousState = {
    status: job.status,
    isSponsored: job.isSponsored,
    expiresAt: job.expiresAt,
  };

  if (status !== undefined) job.status = status;
  if (isSponsored !== undefined) job.isSponsored = isSponsored;
  if (expiresAt !== undefined) job.expiresAt = expiresAt ? new Date(expiresAt) : null;

  await job.save();

  // Audit log
  await AuditLog.log({
    performedBy: adminId,
    action: status === 'closed' ? 'job.closed' : 'job.updated',
    targetModel: 'Job',
    targetId: job._id,
    details: {
      previousState,
      newState: { status: job.status, isSponsored: job.isSponsored, expiresAt: job.expiresAt },
      reason,
    },
    req,
  });

  // Localized notification & email via CountryPlugin and EmailAdapter
  try {
    const poster = await User.findById(job.postedBy);
    if (poster) {
      let plugin = null;
      const countryCode = job.company?.countryCode || job.location?.country;
      if (countryCode) {
        try {
          const { getCountryPlugin } = require('../plugins/countries');
          plugin = getCountryPlugin(countryCode);
        } catch {
          plugin = null;
        }
      }

      const formatted =
        plugin && typeof plugin.formatJobModerationNotification === 'function'
          ? plugin.formatJobModerationNotification(job.status, reason, job)
          : {
              title: `Job Status Updated: "${job.title}"`,
              message: `Your job posting "${job.title}" status has been set to "${job.status}" by administration. Reason: ${reason}`,
              actionUrl: `/employer/jobs/${job._id}`,
            };

      // In-app notification
      notificationService
        .createNotification(poster._id, {
          type: NotificationType.JOB_STATUS_CHANGE || 'system',
          title: formatted.title,
          message: formatted.message,
          relatedModel: 'Job',
          relatedId: job._id,
          actionUrl: formatted.actionUrl,
        })
        .catch((err) => logger.warn('Failed to send job moderation in-app notification', { error: err.message }));

      // Dispatched email notice via adapter
      emailService
        .sendJobModerationNotice(poster, job, job.status, reason, plugin)
        .catch((err) => logger.warn('Failed to send job moderation email', { error: err.message }));
    }
  } catch (err) {
    logger.error('Error dispatching job status change notification', { error: err.message });
  }

  return job.toJSON();
}

// ── Gap 3: Bulk Job Operations ─────────────────────────────

/**
 * Bulk action on multiple job listings (activate, pause, close, expire, delete).
 * @param {string} adminId
 * @param {object} bulkData - { jobIds: string[], action: string, reason: string }
 * @param {object} req - Express request
 * @returns {Promise<object>}
 */
async function bulkJobAction(adminId, bulkData, req) {
  const { jobIds, action, reason } = bulkData;

  const jobs = await Job.find({ _id: { $in: jobIds } }).select('_id title status company postedBy location');
  if (jobs.length === 0) {
    throw ApiError.notFound('None of the specified jobs were found');
  }

  const foundIds = jobs.map((j) => j._id);
  let resultSummary = {};

  switch (action) {
    case 'activate': {
      const updateRes = await Job.updateMany(
        { _id: { $in: foundIds } },
        { $set: { status: 'active' } }
      );
      resultSummary = { action: 'activate', matchedCount: updateRes.matchedCount, modifiedCount: updateRes.modifiedCount };
      break;
    }
    case 'pause': {
      const updateRes = await Job.updateMany(
        { _id: { $in: foundIds } },
        { $set: { status: 'paused' } }
      );
      resultSummary = { action: 'pause', matchedCount: updateRes.matchedCount, modifiedCount: updateRes.modifiedCount };
      break;
    }
    case 'close': {
      const updateRes = await Job.updateMany(
        { _id: { $in: foundIds } },
        { $set: { status: 'closed' } }
      );
      resultSummary = { action: 'close', matchedCount: updateRes.matchedCount, modifiedCount: updateRes.modifiedCount };
      break;
    }
    case 'expire': {
      const updateRes = await Job.updateMany(
        { _id: { $in: foundIds } },
        { $set: { status: 'expired', expiresAt: new Date() } }
      );
      resultSummary = { action: 'expire', matchedCount: updateRes.matchedCount, modifiedCount: updateRes.modifiedCount };
      break;
    }
    case 'delete': {
      const deleteRes = await Job.deleteMany({ _id: { $in: foundIds } });
      resultSummary = { action: 'delete', deletedCount: deleteRes.deletedCount };
      break;
    }
  }

  // Audit log
  await AuditLog.log({
    performedBy: adminId,
    action: 'job.bulk_action',
    targetModel: 'Job',
    details: {
      action,
      jobIds: foundIds,
      count: foundIds.length,
      result: resultSummary,
      reason,
    },
    req,
  });

  return {
    success: true,
    action,
    reason,
    affectedCount: resultSummary.modifiedCount !== undefined ? resultSummary.modifiedCount : resultSummary.deletedCount,
    jobIds: foundIds,
  };
}

// ── Gap 4: Full Employer Directory ─────────────────────────

/**
 * Full Employer Directory listing across all countries & verification statuses.
 * Enriches with job counts and country plugin metadata.
 * @param {object} queryParams
 * @returns {Promise<{ docs: Array, meta: object }>}
 */
async function getAllEmployers(queryParams) {
  const filter = {};

  if (queryParams.verificationStatus) {
    filter.verificationStatus = queryParams.verificationStatus;
  }
  if (queryParams.countryCode) {
    filter.countryCode = queryParams.countryCode.toUpperCase();
  }
  if (queryParams.industry) {
    filter.industry = new RegExp(queryParams.industry, 'i');
  }
  if (queryParams.dateFrom || queryParams.dateTo) {
    filter.createdAt = {};
    if (queryParams.dateFrom) filter.createdAt.$gte = new Date(queryParams.dateFrom);
    if (queryParams.dateTo) filter.createdAt.$lte = new Date(queryParams.dateTo);
  }

  if (queryParams.search) {
    const searchRegex = new RegExp(queryParams.search, 'i');
    filter.$or = [
      { name: searchRegex },
      { website: searchRegex },
      { contactName: searchRegex },
      { phone: searchRegex },
    ];
  }

  const result = await paginateQuery(Company, filter, queryParams, {
    populate: 'owner',
    sort: queryParams.sort || '-createdAt',
  });

  // Calculate total and active jobs for each employer in the current page
  if (result.docs.length > 0) {
    const companyIds = result.docs.map((c) => c._id);
    const jobStats = await Job.aggregate([
      { $match: { company: { $in: companyIds } } },
      {
        $group: {
          _id: '$company',
          totalJobs: { $sum: 1 },
          activeJobs: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
        },
      },
    ]);
    const statMap = new Map(jobStats.map((s) => [s._id.toString(), s]));

    const { getCountryPlugin } = require('../plugins/countries');

    result.docs = result.docs.map((doc) => {
      const obj = doc.toJSON ? doc.toJSON() : doc;
      const stats = statMap.get(obj._id.toString()) || { totalJobs: 0, activeJobs: 0 };
      obj.totalJobs = stats.totalJobs;
      obj.activeJobs = stats.activeJobs;

      // Country metadata decoration
      try {
        const plugin = getCountryPlugin(obj.countryCode);
        obj.country = {
          code: plugin.code,
          name: plugin.name,
          currency: plugin.currency,
          locale: plugin.locale,
          paymentProvider: plugin.getPaymentProvider(),
        };
      } catch {
        obj.country = { code: obj.countryCode, name: obj.countryCode };
      }

      return obj;
    });
  }

  return result;
}

/**
 * List all jobs posted by a specific employer with administrative metrics.
 * @param {string} companyId
 * @param {object} queryParams
 * @returns {Promise<{ docs: Array, meta: object }>}
 */
async function getEmployerJobs(companyId, queryParams) {
  const company = await Company.findById(companyId);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  const filter = { company: company._id };
  if (queryParams.status) {
    filter.status = queryParams.status;
  }

  return paginateQuery(Job, filter, queryParams, {
    sort: queryParams.sort || '-createdAt',
  });
}

// ── Gap 5: Financial Transactions List & Discovery ─────────

/**
 * List financial transactions across platform with multi-currency filters.
 * @param {object} queryParams
 * @returns {Promise<{ docs: Array, meta: object }>}
 */
async function getAllTransactions(queryParams) {
  const filter = {};

  if (queryParams.status) {
    filter.status = queryParams.status;
  }
  if (queryParams.type) {
    filter.type = queryParams.type;
  }
  if (queryParams.paymentProvider) {
    filter.paymentProvider = queryParams.paymentProvider;
  }
  if (queryParams.currency) {
    filter.currency = queryParams.currency.toUpperCase();
  }
  if (queryParams.company) {
    filter.company = queryParams.company;
  }
  if (queryParams.countryCode) {
    const code = queryParams.countryCode.toUpperCase();
    const companies = await Company.find({ countryCode: code }).select('_id').lean();
    filter.company = { $in: companies.map((c) => c._id) };
  }
  if (queryParams.dateFrom || queryParams.dateTo) {
    filter.createdAt = {};
    if (queryParams.dateFrom) filter.createdAt.$gte = new Date(queryParams.dateFrom);
    if (queryParams.dateTo) filter.createdAt.$lte = new Date(queryParams.dateTo);
  }
  if (queryParams.search) {
    const searchRegex = new RegExp(queryParams.search, 'i');
    filter.$or = [
      { externalPaymentId: searchRegex },
      { invoiceNumber: searchRegex },
      { description: searchRegex },
    ];
  }

  return paginateQuery(Transaction, filter, queryParams, {
    populate: [
      { path: 'company', select: '_id name logoUrl countryCode owner' },
      { path: 'processedBy', select: '_id firstName lastName email' },
    ],
    sort: queryParams.sort || '-createdAt',
  });
}

/**
 * Get single transaction details with full provider metadata and audit trail.
 * @param {string} transactionId
 * @returns {Promise<object>}
 */
async function getTransactionById(transactionId) {
  const transaction = await Transaction.findById(transactionId)
    .populate('company')
    .populate('processedBy', '_id firstName lastName email');
  if (!transaction) {
    throw ApiError.notFound('Transaction not found');
  }

  // Find related audit logs
  const auditLogs = await AuditLog.find({
    targetModel: 'Transaction',
    targetId: transaction._id,
  }).sort('-createdAt');

  // Country plugin & currency metadata
  let currencyMeta = {
    currency: transaction.currency,
    provider: transaction.paymentProvider,
  };
  if (transaction.company?.countryCode) {
    try {
      const { getCountryPlugin } = require('../plugins/countries');
      const plugin = getCountryPlugin(transaction.company.countryCode);
      currencyMeta.countryName = plugin.name;
      currencyMeta.locale = plugin.locale;
    } catch {
      // ignore
    }
  }

  const result = transaction.toJSON();
  result.auditLogs = auditLogs;
  result.currencyMeta = currencyMeta;
  return result;
}

// ── Gap 6: Executive Platform & Labor Market Analytics ─────

/**
 * Comprehensive Executive Platform & Labor Market Analytics.
 * Segmented by date range, country, and multi-currency.
 * Uses CacheAdapter with 60s TTL (bypassed with refresh=true).
 * @param {object} [queryParams] - { dateFrom, dateTo, interval, country, refresh }
 * @returns {Promise<object>}
 */
async function getExecutiveReport(queryParams = {}) {
  const cache = getCacheAdapter();
  const cacheKey = `admin:exec_report:${queryParams.country || 'all'}:${queryParams.dateFrom || 'all'}:${queryParams.dateTo || 'all'}:${queryParams.interval || 'day'}`;

  if (!queryParams.refresh) {
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return typeof cached === 'string' ? JSON.parse(cached) : cached;
      }
    } catch (err) {
      logger.warn('Failed to read executive report from cache', { error: err.message });
    }
  }

  // Date range filters (default: last 30 days)
  const now = new Date();
  const dateTo = queryParams.dateTo ? new Date(queryParams.dateTo) : now;
  const dateFrom = queryParams.dateFrom
    ? new Date(queryParams.dateFrom)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const countryFilter = queryParams.country ? queryParams.country.toUpperCase() : null;

  // Build country-specific company IDs if country specified
  let countryCompanyIds = null;
  if (countryFilter) {
    const companies = await Company.find({ countryCode: countryFilter }).select('_id').lean();
    countryCompanyIds = companies.map((c) => c._id);
  }

  // User filters
  const userGlobalFilter = { role: 'jobseeker' };
  const userPeriodFilter = { role: 'jobseeker', createdAt: { $gte: dateFrom, $lte: dateTo } };
  const employerGlobalFilter = countryFilter ? { countryCode: countryFilter } : {};
  const employerPeriodFilter = {
    ...employerGlobalFilter,
    createdAt: { $gte: dateFrom, $lte: dateTo },
  };

  // Job filters
  const jobGlobalFilter = countryCompanyIds ? { company: { $in: countryCompanyIds } } : {};
  const jobActiveFilter = { ...jobGlobalFilter, status: 'active' };
  const jobPeriodFilter = { ...jobGlobalFilter, createdAt: { $gte: dateFrom, $lte: dateTo } };

  // Application filters
  const appGlobalFilter = countryCompanyIds
    ? { job: { $in: await Job.distinct('_id', { company: { $in: countryCompanyIds } }) } }
    : {};
  const appPeriodFilter = { ...appGlobalFilter, createdAt: { $gte: dateFrom, $lte: dateTo } };

  // Financial filters
  const txnMatch = { status: 'succeeded' };
  if (countryCompanyIds) txnMatch.company = { $in: countryCompanyIds };

  const [
    totalUsers,
    newUsersInPeriod,
    totalEmployers,
    approvedEmployers,
    newEmployersInPeriod,
    totalJobs,
    activeJobs,
    newJobsInPeriod,
    totalApplications,
    newApplicationsInPeriod,
    revenueByCurrencyRaw,
    jobTrend,
    appTrend,
    topCategories,
    topSkillsRaw,
    workplaceStats,
    employmentTypeStats,
    topHiringCompanies,
    metricsByCountryRaw,
    funnelCounters,
  ] = await Promise.all([
    User.countDocuments(userGlobalFilter),
    User.countDocuments(userPeriodFilter),
    Company.countDocuments(employerGlobalFilter),
    Company.countDocuments({ ...employerGlobalFilter, verificationStatus: 'approved' }),
    Company.countDocuments(employerPeriodFilter),
    Job.countDocuments(jobGlobalFilter),
    Job.countDocuments(jobActiveFilter),
    Job.countDocuments(jobPeriodFilter),
    Application.countDocuments(appGlobalFilter),
    Application.countDocuments(appPeriodFilter),
    // Multi-currency revenue aggregation (avoids adding USD + INR together!)
    Transaction.aggregate([
      { $match: txnMatch },
      {
        $group: {
          _id: '$currency',
          totalGross: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
    // Time-series Job Postings Trend
    Job.aggregate([
      { $match: jobPeriodFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Time-series Applications Trend
    Application.aggregate([
      { $match: appPeriodFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // In-demand Job Categories
    Job.aggregate([
      { $match: jobActiveFilter },
      { $match: { category: { $ne: '' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    // In-demand Skills (unwind array)
    Job.aggregate([
      { $match: jobActiveFilter },
      { $unwind: '$skills' },
      { $match: { skills: { $ne: '' } } },
      { $group: { _id: '$skills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    // Workplace distribution
    Job.aggregate([
      { $match: jobActiveFilter },
      { $group: { _id: '$workplaceType', count: { $sum: 1 } } },
    ]),
    // Employment type distribution
    Job.aggregate([
      { $match: jobActiveFilter },
      { $group: { _id: '$employmentType', count: { $sum: 1 } } },
    ]),
    // Top hiring employers
    Job.aggregate([
      { $match: jobActiveFilter },
      { $group: { _id: '$company', activeJobs: { $sum: 1 } } },
      { $sort: { activeJobs: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'companies',
          localField: '_id',
          foreignField: '_id',
          as: 'companyInfo',
        },
      },
      { $unwind: { path: '$companyInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          activeJobs: 1,
          name: '$companyInfo.name',
          countryCode: '$companyInfo.countryCode',
        },
      },
    ]),
    // Multi-country overview breakdown
    Company.aggregate([
      {
        $group: {
          _id: '$countryCode',
          totalEmployers: { $sum: 1 },
          verifiedEmployers: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'approved'] }, 1, 0] },
          },
        },
      },
      { $sort: { totalEmployers: -1 } },
    ]),
    // Engagement / Funnel Counters
    Job.aggregate([
      { $match: jobActiveFilter },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$viewCount' },
          totalClicks: { $sum: '$clickCount' },
          totalApplications: { $sum: '$applicationCount' },
        },
      },
    ]),
  ]);

  // Format revenue by currency object
  const revenueByCurrency = {};
  let primaryTotalRevenue = 0;
  revenueByCurrencyRaw.forEach((r) => {
    revenueByCurrency[r._id] = {
      gross: r.totalGross,
      transactionCount: r.count,
    };
    primaryTotalRevenue += r.totalGross;
  });

  // Calculate Funnel Rates
  const views = funnelCounters[0]?.totalViews || 0;
  const clicks = funnelCounters[0]?.totalClicks || 0;
  const apps = funnelCounters[0]?.totalApplications || 0;
  const ctr = views > 0 ? Number(((clicks / views) * 100).toFixed(2)) : 0;
  const applyRate = clicks > 0 ? Number(((apps / clicks) * 100).toFixed(2)) : 0;

  const report = {
    filters: {
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      country: countryFilter || 'ALL',
      interval: queryParams.interval || 'day',
    },
    metrics: {
      totalUsers,
      newUsersInPeriod,
      totalEmployers,
      approvedEmployers,
      newEmployersInPeriod,
      totalJobs,
      activeJobs,
      newJobsInPeriod,
      totalApplications,
      newApplicationsInPeriod,
      totalRevenue: primaryTotalRevenue,
      revenueByCurrency,
    },
    laborMarketInsights: {
      topCategories: topCategories.map((c) => ({ category: c._id, count: c.count })),
      topSkills: topSkillsRaw.map((s) => ({ skill: s._id, count: s.count })),
      workplaceDistribution: workplaceStats.map((w) => ({
        type: w._id,
        count: w.count,
        percentage: activeJobs > 0 ? Number(((w.count / activeJobs) * 100).toFixed(1)) : 0,
      })),
      employmentTypeDistribution: employmentTypeStats.map((e) => ({
        type: e._id,
        count: e.count,
        percentage: activeJobs > 0 ? Number(((e.count / activeJobs) * 100).toFixed(1)) : 0,
      })),
      topHiringEmployers: topHiringCompanies.map((h) => ({
        companyId: h._id,
        name: h.name || 'Unknown',
        countryCode: h.countryCode || '',
        activeJobs: h.activeJobs,
      })),
    },
    recruitmentFunnel: {
      totalViews: views,
      totalClicks: clicks,
      totalApplications: apps,
      clickThroughRatePercent: ctr,
      applicationConversionRatePercent: applyRate,
    },
    trends: {
      jobPostings: jobTrend.map((t) => ({ date: t._id, count: t.count })),
      applications: appTrend.map((t) => ({ date: t._id, count: t.count })),
    },
    metricsByCountry: metricsByCountryRaw.map((m) => ({
      countryCode: m._id,
      totalEmployers: m.totalEmployers,
      verifiedEmployers: m.verifiedEmployers,
    })),
  };

  // Cache for 60 seconds
  try {
    await cache.set(cacheKey, JSON.stringify(report), 60);
  } catch (err) {
    logger.warn('Failed to write executive report to cache', { error: err.message });
  }

  return report;
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
 * Get audit logs trail with filtering options.
 */
async function getAuditLogs(queryParams) {
  const filter = {};
  if (queryParams.action) filter.action = queryParams.action;
  if (queryParams.targetModel) filter.targetModel = queryParams.targetModel;
  if (queryParams.performedBy) filter.performedBy = queryParams.performedBy;
  if (queryParams.dateFrom || queryParams.dateTo) {
    filter.createdAt = {};
    if (queryParams.dateFrom) filter.createdAt.$gte = new Date(queryParams.dateFrom);
    if (queryParams.dateTo) filter.createdAt.$lte = new Date(queryParams.dateTo);
  }

  return paginateQuery(AuditLog, filter, queryParams, {
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
  getAllUsers,
  getPendingEmployers,
  getEmployerById,
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
  getAllJobs,
  getJobById,
  updateJobStatus,
  bulkJobAction,
  getAllEmployers,
  getEmployerJobs,
  getAllTransactions,
  getTransactionById,
};
