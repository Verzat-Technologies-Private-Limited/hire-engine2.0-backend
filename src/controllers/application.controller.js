const applicationService = require('../services/application.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const apply = asyncHandler(async (req, res) => {
  const application = await applicationService.applyToJob(req.user._id, req.params.jobId, req.body);
  ApiResponse.created('Application submitted successfully', application).send(res);
});

const getSeekerApplications = asyncHandler(async (req, res) => {
  const result = await applicationService.getSeekerApplications(req.user._id, req.query);
  ApiResponse.ok('Submitted applications retrieved successfully', result.docs, result.meta).send(res);
});

const getJobApplications = asyncHandler(async (req, res) => {
  const result = await applicationService.getJobApplications(req.params.jobId, req.user._id, req.query);
  ApiResponse.ok('Job applications retrieved successfully', result.docs, result.meta).send(res);
});

const updateStatus = asyncHandler(async (req, res) => {
  const updated = await applicationService.updateApplicationStatus(req.params.id, req.user._id, req.body);
  ApiResponse.ok('Application status updated successfully', updated).send(res);
});

const addNote = asyncHandler(async (req, res) => {
  const note = await applicationService.addCandidateNote(req.params.id, req.user._id, req.body);
  ApiResponse.created('Candidate note added successfully', note).send(res);
});

const rateCandidate = asyncHandler(async (req, res) => {
  const { rating } = req.body;
  const updated = await applicationService.rateCandidate(req.params.id, req.user._id, rating);
  ApiResponse.ok('Candidate rated successfully', updated).send(res);
});

const sendBulkEmail = asyncHandler(async (req, res) => {
  const result = await applicationService.sendBulkEmailToApplicants(req.user._id, req.body);
  ApiResponse.ok('Bulk email process completed', result).send(res);
});

module.exports = {
  apply,
  getSeekerApplications,
  getJobApplications,
  updateStatus,
  addNote,
  rateCandidate,
  sendBulkEmail,
};
