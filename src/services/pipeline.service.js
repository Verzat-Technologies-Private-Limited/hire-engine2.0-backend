const Pipeline = require('../models/Pipeline');
const Company = require('../models/Company');
const ApiError = require('../utils/ApiError');

async function createPipeline(userId, companyId, pipelineData) {
  const company = await Company.findById(companyId);
  if (!company || !company.isTeamMember(userId)) {
    throw ApiError.forbidden('Permission denied');
  }

  const pipeline = await Pipeline.create({
    company: companyId,
    name: pipelineData.name,
    stages: pipelineData.stages || [],
    isDefault: !!pipelineData.isDefault,
  });

  return pipeline.toJSON();
}

async function getCompanyPipelines(companyId) {
  return Pipeline.find({ company: companyId }).sort({ isDefault: -1, createdAt: -1 });
}

async function updatePipeline(pipelineId, userId, updateData) {
  const pipeline = await Pipeline.findById(pipelineId);
  if (!pipeline) {
    throw ApiError.notFound('Pipeline not found');
  }

  const company = await Company.findById(pipeline.company);
  if (!company || !company.isTeamMember(userId)) {
    throw ApiError.forbidden('Permission denied');
  }

  if (updateData.name) pipeline.name = updateData.name;
  if (updateData.stages) pipeline.stages = updateData.stages;
  if (typeof updateData.isDefault === 'boolean') pipeline.isDefault = updateData.isDefault;

  await pipeline.save();
  return pipeline.toJSON();
}

async function deletePipeline(pipelineId, userId) {
  const pipeline = await Pipeline.findById(pipelineId);
  if (!pipeline) {
    throw ApiError.notFound('Pipeline not found');
  }

  const company = await Company.findById(pipeline.company);
  if (!company || !company.isTeamMember(userId)) {
    throw ApiError.forbidden('Permission denied');
  }

  if (pipeline.isDefault) {
    throw ApiError.badRequest('Cannot delete the default company ATS pipeline');
  }

  await pipeline.deleteOne();
}

module.exports = {
  createPipeline,
  getCompanyPipelines,
  updatePipeline,
  deletePipeline,
};
