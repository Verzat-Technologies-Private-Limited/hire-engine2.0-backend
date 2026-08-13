const Job = require('../models/Job');
const Company = require('../models/Company');
const Subscription = require('../models/Subscription');
const ApiError = require('../utils/ApiError');
const { paginateQuery } = require('../utils/pagination');
const { getQueueAdapter } = require('../adapters/queue');
const logger = require('../config/logger');

const queueAdapter = getQueueAdapter();

/**
 * Create a new job posting for a company.
 * @param {string} userId
 * @param {object} jobData
 * @returns {Promise<object>}
 */
async function createJob(userId, jobData) {
  console.log(jobData.companyId);
  console.log({ userId });
  // Find company where user is owner or team member with manage_jobs permission
  const company = await Company.findById(jobData.companyId || jobData.company);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (!company.isTeamMember(userId)) {
    throw ApiError.forbidden('You do not have permission to post jobs for this company');
  }

  // Check subscription job post quota
  const subscription = await Subscription.findOne({ company: company._id, status: 'active' });
  if (subscription && !subscription.hasJobPostQuota()) {
    throw ApiError.forbidden(
      'Job posting quota exceeded for your current subscription plan. Please upgrade.'
    );
  }

  const job = await Job.create({
    ...jobData,
    company: company._id,
    postedBy: userId,
    status: jobData.status || 'active',
  });

  // Update subscription quota usage if subscription exists
  if (subscription) {
    subscription.jobPostsUsed += 1;
    await subscription.save();
  }

  // Enqueue job match alert processing asynchronously
  queueAdapter.addJob('alertWorker', 'matchSavedSearches', { jobId: job._id }).catch((err) => {
    logger.error('Failed to enqueue job alert match task', { error: err.message });
  });

  return job.toJSON();
}

/**
 * Get job details by ID.
 * @param {string} jobId
 * @param {boolean} [incrementViews=false]
 * @returns {Promise<object>}
 */
async function getJobById(jobId, incrementViews = false) {
  const job = await Job.findById(jobId).populate(
    'company',
    'name logoUrl industry size website countryCode verificationStatus'
  );
  if (!job) {
    throw ApiError.notFound('Job posting not found');
  }

  if (incrementViews) {
    Job.incrementViews(jobId).catch(() => {});
  }

  return job.toJSON();
}

/**
 * Update an existing job.
 * @param {string} jobId
 * @param {string} userId
 * @param {object} updateData
 * @returns {Promise<object>}
 */
async function updateJob(jobId, userId, updateData) {
  const job = await Job.findById(jobId);
  if (!job) {
    throw ApiError.notFound('Job posting not found');
  }

  const company = await Company.findById(job.company);
  if (!company || !company.isTeamMember(userId)) {
    throw ApiError.forbidden('You do not have permission to update this job posting');
  }

  Object.assign(job, updateData);
  await job.save();

  return job.toJSON();
}

/**
 * Update job status (active, paused, closed).
 * @param {string} jobId
 * @param {string} userId
 * @param {string} status
 * @returns {Promise<object>}
 */
async function updateJobStatus(jobId, userId, status) {
  const job = await Job.findById(jobId);
  if (!job) {
    throw ApiError.notFound('Job posting not found');
  }

  const company = await Company.findById(job.company);
  if (!company || !company.isTeamMember(userId)) {
    throw ApiError.forbidden('You do not have permission to update this job status');
  }

  job.status = status;
  await job.save();

  return job.toJSON();
}

/**
 * Promote/sponsor a job listing.
 * @param {string} jobId
 * @param {string} userId
 * @param {object} promotionData - { dailyBudget, totalBudget, durationDays }
 * @returns {Promise<object>}
 */
async function promoteJob(jobId, userId, promotionData) {
  console.log('userId in promoteJob: ', userId);
  const job = await Job.findById(jobId);
  if (!job) {
    throw ApiError.notFound('Job posting not found');
  }

  const company = await Company.findById(job.company);
  if (!company || !company.isTeamMember(userId)) {
    throw ApiError.forbidden('You do not have permission to promote this job');
  }

  const { dailyBudget, totalBudget, durationDays } = promotionData;
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  job.isSponsored = true;
  job.sponsorBudget = {
    dailyBudget,
    totalBudget,
    spent: 0,
    currency: 'USD',
    startDate,
    endDate,
  };

  await job.save();

  return job.toJSON();
}

/**
 * Get all job postings for a specific employer's company.
 * @param {string} userId
 * @param {object} queryParams
 * @returns {Promise<object>}
 */
async function getEmployerJobs(userId, queryParams) {
  const company = await Company.findOne({
    $or: [{ owner: userId }, { 'teamMembers.user': userId }],
  });

  if (!company) {
    return { docs: [], meta: { pagination: { totalDocs: 0, currentPage: 1, totalPages: 0 } } };
  }

  const filter = { company: company._id };
  if (queryParams.status) {
    filter.status = queryParams.status;
  }

  return paginateQuery(Job, filter, queryParams, {
    populate: 'company',
    sort: '-createdAt',
  });
}

module.exports = {
  createJob,
  getJobById,
  updateJob,
  updateJobStatus,
  promoteJob,
  getEmployerJobs,
};
