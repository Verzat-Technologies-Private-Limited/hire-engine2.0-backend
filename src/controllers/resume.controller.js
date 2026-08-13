const resumeService = require('../services/resume.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const upload = asyncHandler(async (req, res) => {
  const result = await resumeService.uploadResume(req.user._id, req.file, req.body.title);
  ApiResponse.created('Resume uploaded and parsed successfully', result).send(res);
});

const listResumes = asyncHandler(async (req, res) => {
  const resumes = await resumeService.getUserResumes(req.user._id);
  ApiResponse.ok('Resumes retrieved successfully', resumes).send(res);
});

const getResume = asyncHandler(async (req, res) => {
  const resume = await resumeService.getResumeById(req.params.id, req.user._id);
  ApiResponse.ok('Resume retrieved successfully', resume).send(res);
});

const updateResume = asyncHandler(async (req, res) => {
  const updated = await resumeService.updateResume(req.params.id, req.user._id, req.body);
  ApiResponse.ok('Resume updated successfully', updated).send(res);
});

const deleteResume = asyncHandler(async (req, res) => {
  await resumeService.deleteResume(req.params.id, req.user._id);
  ApiResponse.ok('Resume deleted successfully').send(res);
});

module.exports = {
  upload,
  listResumes,
  getResume,
  updateResume,
  deleteResume,
};
