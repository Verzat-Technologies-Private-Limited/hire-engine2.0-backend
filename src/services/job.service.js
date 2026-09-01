const Job = require('../models/Job');
const Company = require('../models/Company');
const Subscription = require('../models/Subscription');
const ApiError = require('../utils/ApiError');
const { paginateQuery } = require('../utils/pagination');
const { getQueueAdapter } = require('../adapters/queue');
const { generateJobEmbedding } = require('./embedding.service');
const { geocodeLocation } = require('../utils/geocode');
const logger = require('../config/logger');

const queueAdapter = getQueueAdapter();

/**
 * Create a new job posting for a company.
 * Jobs are always created in 'draft' status. Embedding and alert processing
 * happen only when the job is published (status → 'active') via updateJobStatus.
 * @param {string} userId
 * @param {object} jobData
 * @returns {Promise<object>}
 */
async function createJob(userId, jobData) {
  // Find company where user is owner or team member with manage_jobs permission
  const company = await Company.findById(jobData.companyId || jobData.company);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (!company.isTeamMember(userId)) {
    throw ApiError.forbidden('You do not have permission to post jobs for this company');
  }

  // Check subscription — an active (or past_due grace) subscription is required
  const subscription = await Subscription.findOne({
    company: company._id,
    status: { $in: ['active', 'past_due'] },
  });

  if (!subscription) {
    throw ApiError.forbidden(
      'An active subscription is required to post jobs. Please subscribe to a plan.'
    );
  }

  if (!subscription.hasJobPostQuota()) {
    throw ApiError.forbidden(
      'Job posting quota exceeded for your current subscription plan. Please upgrade.'
    );
  }

  // Auto-geocode location if coordinates are missing
  if (jobData.location) {
    try {
      jobData.location = await geocodeLocation(jobData.location);
    } catch (err) {
      logger.warn('Geocoding failed during job creation, proceeding without coordinates', {
        error: err.message,
      });
    }
  }

  // Always create job in 'draft' status — publisher flow handles activation
  const job = await Job.create({
    ...jobData,
    company: company._id,
    postedBy: userId,
    status: 'draft',
  });

  // Update subscription quota usage
  subscription.jobPostsUsed += 1;
  await subscription.save();

  // Build response with subscription warning if past_due
  const response = { job: job.toJSON() };

  if (subscription.status === 'past_due') {
    response.warning =
      'Your subscription payment is past due. Please update your payment method to avoid service interruption. Job posting is allowed during this grace period.';
  }

  return response;
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

  // Auto-geocode location if it was updated
  if (updateData.location) {
    try {
      updateData.location = await geocodeLocation(updateData.location);
    } catch (err) {
      logger.warn('Geocoding failed during job update, proceeding without coordinates', {
        error: err.message,
      });
    }
  }

  Object.assign(job, updateData);
  await job.save();

  // Fire-and-forget: regenerate embedding if content fields changed AND job is published
  // Skip for drafts — embedding will be generated when the job is published
  if (job.status === 'active') {
    const contentFields = ['title', 'description', 'skills', 'qualifications', 'responsibilities'];
    if (contentFields.some((f) => f in updateData)) {
      generateJobEmbedding(job._id).catch((err) => {
        logger.error('Failed to regenerate job embedding after update', {
          jobId: job._id,
          error: err.message,
        });
      });
    }
  }

  return job.toJSON();
}

/**
 * Update job status (active, paused, closed).
 * When a job transitions to 'active' (publishing), generates the semantic
 * search embedding and enqueues saved-search alert matching.
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

  const previousStatus = job.status;
  job.status = status;
  await job.save();

  // When publishing a job (transitioning to 'active'), perform expensive operations
  if (status === 'active' && previousStatus !== 'active') {
    // Enqueue job match alert processing asynchronously
    queueAdapter.addJob('alertWorker', 'matchSavedSearches', { jobId: job._id }).catch((err) => {
      logger.error('Failed to enqueue job alert match task', { error: err.message });
    });

    // Fire-and-forget: generate semantic search embedding
    generateJobEmbedding(job._id).catch((err) => {
      logger.error('Failed to generate job embedding after publish', {
        jobId: job._id,
        error: err.message,
      });
    });
  }

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
