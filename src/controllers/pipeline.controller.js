const pipelineService = require('../services/pipeline.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const createPipeline = asyncHandler(async (req, res) => {
  const { companyId, ...data } = req.body;
  const pipeline = await pipelineService.createPipeline(req.user._id, companyId, data);
  ApiResponse.created('Pipeline created successfully', pipeline).send(res);
});

const getPipelines = asyncHandler(async (req, res) => {
  const pipelines = await pipelineService.getCompanyPipelines(req.query.companyId);
  ApiResponse.ok('Pipelines retrieved successfully', pipelines).send(res);
});

const updatePipeline = asyncHandler(async (req, res) => {
  const updated = await pipelineService.updatePipeline(req.params.id, req.user._id, req.body);
  ApiResponse.ok('Pipeline updated successfully', updated).send(res);
});

const deletePipeline = asyncHandler(async (req, res) => {
  await pipelineService.deletePipeline(req.params.id, req.user._id);
  ApiResponse.ok('Pipeline deleted successfully').send(res);
});

module.exports = {
  createPipeline,
  getPipelines,
  updatePipeline,
  deletePipeline,
};
