const analyticsService = require('../services/analytics.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getJobAnalytics = asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getJobAnalytics(req.params.jobId, req.user._id);
  ApiResponse.ok('Job performance analytics retrieved', analytics).send(res);
});

const getDemographics = asyncHandler(async (req, res) => {
  const demographics = await analyticsService.getApplicantDemographics(req.params.jobId, req.user._id);
  ApiResponse.ok('Applicant demographics breakdown retrieved', demographics).send(res);
});

const getCompanyOverview = asyncHandler(async (req, res) => {
  const overview = await analyticsService.getCompanyOverview(req.user._id);
  ApiResponse.ok('Company recruitment metrics overview retrieved', overview).send(res);
});

module.exports = {
  getJobAnalytics,
  getDemographics,
  getCompanyOverview,
};
