const jobService = require('../services/job.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const createJob = asyncHandler(async (req, res) => {
  console.log('req.body from createJob: ', req.body);
  const job = await jobService.createJob(req.user._id, req.body);
  ApiResponse.created('Job posting created successfully', job).send(res);
});

const getJob = asyncHandler(async (req, res) => {
  const job = await jobService.getJobById(req.params.id, true);
  ApiResponse.ok('Job details retrieved successfully', job).send(res);
});

const updateJob = asyncHandler(async (req, res) => {
  const updated = await jobService.updateJob(req.params.id, req.user._id, req.body);
  ApiResponse.ok('Job updated successfully', updated).send(res);
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const updated = await jobService.updateJobStatus(req.params.id, req.user._id, status);
  ApiResponse.ok(`Job status updated to ${status}`, updated).send(res);
});

const promoteJob = asyncHandler(async (req, res) => {
  const result = await jobService.promoteJob(req.params.id, req.user._id, req.body);
  ApiResponse.ok('Job promoted successfully', result).send(res);
});

const getEmployerJobs = asyncHandler(async (req, res) => {
  const result = await jobService.getEmployerJobs(req.user._id, req.query);
  ApiResponse.ok('Employer jobs retrieved successfully', result.docs, result.meta).send(res);
});

module.exports = {
  createJob,
  getJob,
  updateJob,
  updateStatus,
  promoteJob,
  getEmployerJobs,
};
