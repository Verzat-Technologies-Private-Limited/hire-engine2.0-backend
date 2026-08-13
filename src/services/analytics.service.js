const Job = require('../models/Job');
const Application = require('../models/Application');
const Company = require('../models/Company');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Get job post performance analytics (views, clicks, conversion rates).
 * @param {string} jobId
 * @param {string} employerId
 * @returns {Promise<object>}
 */
async function getJobAnalytics(jobId, employerId) {
  const job = await Job.findById(jobId);
  if (!job) {
    throw ApiError.notFound('Job not found');
  }

  const company = await Company.findById(job.company);
  if (!company || !company.isTeamMember(employerId)) {
    throw ApiError.forbidden('Permission denied');
  }

  const applicationCount = await Application.countDocuments({ job: jobId });
  const conversionRate = job.viewCount > 0 ? ((applicationCount / job.viewCount) * 100).toFixed(2) : 0;
  const clickThroughRate = job.viewCount > 0 ? ((job.clickCount / job.viewCount) * 100).toFixed(2) : 0;

  return {
    jobId: job._id,
    title: job.title,
    views: job.viewCount,
    clicks: job.clickCount,
    applications: applicationCount,
    conversionRate: `${conversionRate}%`,
    clickThroughRate: `${clickThroughRate}%`,
    isSponsored: job.isSponsored,
    sponsorBudget: job.sponsorBudget,
  };
}

/**
 * Get applicant demographics breakdown (location, role, skills).
 * @param {string} jobId
 * @param {string} employerId
 * @returns {Promise<object>}
 */
async function getApplicantDemographics(jobId, employerId) {
  const job = await Job.findById(jobId);
  if (!job) {
    throw ApiError.notFound('Job not found');
  }

  const company = await Company.findById(job.company);
  if (!company || !company.isTeamMember(employerId)) {
    throw ApiError.forbidden('Permission denied');
  }

  const applications = await Application.find({ job: jobId }).populate('applicant', 'location headline skills');

  const locations = {};
  const skillCount = {};

  for (const app of applications) {
    const applicant = app.applicant;
    if (!applicant) continue;

    // Location breakdown
    const locKey = applicant.location?.city || applicant.location?.country || 'Unknown';
    locations[locKey] = (locations[locKey] || 0) + 1;

    // Skills breakdown
    if (applicant.skills && Array.isArray(applicant.skills)) {
      for (const skill of applicant.skills) {
        skillCount[skill] = (skillCount[skill] || 0) + 1;
      }
    }
  }

  return {
    totalApplicants: applications.length,
    locationBreakdown: locations,
    topSkills: Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
  };
}

/**
 * Get overall recruitment ROI dashboard metrics for a company.
 * @param {string} employerId
 * @returns {Promise<object>}
 */
async function getCompanyOverview(employerId) {
  const company = await Company.findOne({
    $or: [{ owner: employerId }, { 'teamMembers.user': employerId }],
  });

  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  const jobStats = await Job.aggregate([
    { $match: { company: company._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalViews: { $sum: '$viewCount' },
        totalClicks: { $sum: '$clickCount' },
      },
    },
  ]);

  const totalApplications = await Application.countDocuments({
    job: { $in: await Job.find({ company: company._id }).distinct('_id') },
  });

  return {
    companyId: company._id,
    name: company.name,
    jobStats,
    totalApplications,
  };
}

module.exports = {
  getJobAnalytics,
  getApplicantDemographics,
  getCompanyOverview,
};
