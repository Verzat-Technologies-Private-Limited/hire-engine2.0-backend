const Application = require('../models/Application');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const CandidateNote = require('../models/CandidateNote');
const Company = require('../models/Company');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const { paginateQuery } = require('../utils/pagination');
const emailService = require('./email.service');
const logger = require('../config/logger');

/**
 * Apply to a job listing (Easy Apply or full application with screening answers).
 * @param {string} applicantId
 * @param {string} jobId
 * @param {object} applicationData
 * @returns {Promise<object>}
 */
async function applyToJob(applicantId, jobId, applicationData) {
  const { resumeId, coverLetter, screeningAnswers, isEasyApply } = applicationData;

  const job = await Job.findById(jobId);
  if (!job || job.status !== 'active') {
    throw ApiError.notFound('Job posting is not available for applications');
  }

  // Verify resume belongs to applicant
  const resume = await Resume.findOne({ _id: resumeId, user: applicantId });
  if (!resume) {
    throw ApiError.badRequest('Selected resume not found or does not belong to you');
  }

  // Check if already applied
  const existingApp = await Application.findOne({ job: jobId, applicant: applicantId });
  if (existingApp) {
    throw ApiError.conflict('You have already applied to this job position');
  }

  const application = await Application.create({
    job: jobId,
    applicant: applicantId,
    resume: resumeId,
    coverLetter: coverLetter || '',
    screeningAnswers: screeningAnswers || [],
    isEasyApply: !!isEasyApply,
    status: 'submitted',
    pipelineStage: 'New',
  });

  // Increment application count on job atomically
  await Job.findByIdAndUpdate(jobId, { $inc: { applicationCount: 1 } });

  // Create notification for employer
  const company = await Company.findById(job.company);
  if (company) {
    Notification.create({
      user: company.owner,
      type: 'application_received',
      title: 'New Job Application Received',
      message: `A candidate has applied for "${job.title}".`,
      relatedModel: 'Application',
      relatedId: application._id,
      actionUrl: `/employer/applications/${application._id}`,
    }).catch((err) => logger.error('Failed to create notification', { error: err.message }));
  }

  return application.toJSON();
}

/**
 * Get centralized application history for job seeker.
 * @param {string} applicantId
 * @param {object} queryParams
 * @returns {Promise<object>}
 */
async function getSeekerApplications(applicantId, queryParams) {
  const filter = { applicant: applicantId };
  if (queryParams.status) {
    filter.status = queryParams.status;
  }

  return paginateQuery(Application, filter, queryParams, {
    populate: [
      { path: 'job', populate: { path: 'company', select: 'name logoUrl city state country' } },
      { path: 'resume', select: 'title fileUrl fileType' },
    ],
    sort: '-appliedAt',
  });
}

/**
 * Get applications for a specific job (Employer view).
 * @param {string} jobId
 * @param {string} employerId
 * @param {object} queryParams
 * @returns {Promise<object>}
 */
async function getJobApplications(jobId, employerId, queryParams) {
  const job = await Job.findById(jobId);
  if (!job) {
    throw ApiError.notFound('Job posting not found');
  }

  const company = await Company.findById(job.company);
  if (!company || !company.isTeamMember(employerId)) {
    throw ApiError.forbidden('You do not have access to view applications for this job');
  }

  const filter = { job: jobId };
  if (queryParams.status) filter.status = queryParams.status;
  if (queryParams.stage) filter.pipelineStage = queryParams.stage;
  if (queryParams.minRating) filter.rating = { $gte: Number(queryParams.minRating) };

  let sort = '-appliedAt';
  if (queryParams.sort === 'rating') sort = '-rating -appliedAt';

  return paginateQuery(Application, filter, queryParams, {
    populate: [
      { path: 'applicant', select: 'firstName lastName email phone location headline skills' },
      { path: 'resume' },
    ],
    sort,
  });
}

/**
 * Move candidate through customizable pipeline stages and update status.
 * @param {string} applicationId
 * @param {string} employerId
 * @param {object} updateData - { status, pipelineStage, note }
 * @returns {Promise<object>}
 */
async function updateApplicationStatus(applicationId, employerId, updateData) {
  const application = await Application.findById(applicationId).populate('job');
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  const company = await Company.findById(application.job.company);
  if (!company || !company.isTeamMember(employerId)) {
    throw ApiError.forbidden('You do not have permission to modify this application');
  }

  const { status, pipelineStage, note } = updateData;
  if (status) application.status = status;
  if (pipelineStage) application.pipelineStage = pipelineStage;

  if (note) {
    await CandidateNote.create({
      application: applicationId,
      author: employerId,
      content: note,
    });
  }

  await application.save();

  // Notify applicant of status update
  Notification.create({
    user: application.applicant,
    type: 'application_status_update',
    title: 'Application Status Update',
    message: `Your application status for "${application.job.title}" has been updated to ${status}.`,
    relatedModel: 'Application',
    relatedId: application._id,
    actionUrl: `/seeker/applications`,
  }).catch((err) => logger.error('Failed to notify applicant', { error: err.message }));

  return application.toJSON();
}

/**
 * Add an internal note to a candidate's application.
 * @param {string} applicationId
 * @param {string} authorId
 * @param {object} noteData
 * @returns {Promise<object>}
 */
async function addCandidateNote(applicationId, authorId, noteData) {
  const application = await Application.findById(applicationId).populate('job');
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  const note = await CandidateNote.create({
    application: applicationId,
    author: authorId,
    content: noteData.content,
    rating: noteData.rating || null,
    isPrivate: !!noteData.isPrivate,
  });

  if (noteData.rating) {
    application.rating = noteData.rating;
    await application.save();
  }

  return note.toJSON();
}

/**
 * Rate a candidate application.
 * @param {string} applicationId
 * @param {string} employerId
 * @param {number} rating
 */
async function rateCandidate(applicationId, employerId, rating) {
  const application = await Application.findById(applicationId).populate('job');
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  application.rating = rating;
  await application.save();

  return application.toJSON();
}

/**
 * Send bulk email to multiple applicants using pre-written templates or raw content.
 * @param {string} employerId
 * @param {object} bulkData - { applicationIds, subject, body }
 * @returns {Promise<object>}
 */
async function sendBulkEmailToApplicants(employerId, bulkData) {
  const { applicationIds, subject, body } = bulkData;

  const applications = await Application.find({ _id: { $in: applicationIds } })
    .populate('applicant', 'email firstName lastName')
    .populate('job', 'title');

  const recipients = applications.map((app) => ({
    email: app.applicant.email,
    substitutions: {
      candidateName: `${app.applicant.firstName} ${app.applicant.lastName}`,
      jobTitle: app.job?.title || 'Position',
    },
  }));

  const result = await emailService.sendBulkNotification(recipients, subject, body);
  return result;
}

/**
 * Generate AI fit analysis for a specific application.
 * @param {string} applicationId
 * @param {string} employerId
 * @returns {Promise<object>}
 */
async function getApplicationFitAnalysis(applicationId, employerId) {
  const application = await Application.findById(applicationId)
    .populate('job')
    .populate('resume')
    .populate('applicant', 'firstName lastName email');

  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  const company = await Company.findById(application.job.company);
  if (!company || !company.isTeamMember(employerId)) {
    throw ApiError.forbidden('You do not have permission to review this application');
  }

  const { calculateJobMatchScore } = require('../adapters/ai/gemini.adapter');
  const matchResult = await calculateJobMatchScore(application.resume?.parsedData, application.job);

  return {
    applicationId: application._id,
    candidateName: `${application.applicant.firstName} ${application.applicant.lastName}`,
    jobTitle: application.job.title,
    ...matchResult,
  };
}

module.exports = {
  applyToJob,
  getSeekerApplications,
  getJobApplications,
  getApplicationFitAnalysis,
  updateApplicationStatus,
  addCandidateNote,
  rateCandidate,
  sendBulkEmailToApplicants,
};
