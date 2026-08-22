const searchService = require('../services/search.service');
const {
  findSimilarJobs,
  findSimilarResumes,
  rankResumesByJob,
} = require('../services/embedding.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const searchJobs = asyncHandler(async (req, res) => {
  const result = await searchService.searchJobs(req.query);
  ApiResponse.ok('Job search results retrieved', result.docs, result.meta).send(res);
});

const searchResumes = asyncHandler(async (req, res) => {
  const result = await searchService.searchResumes(req.query);
  ApiResponse.ok('Resume search results retrieved', result.docs, result.meta).send(res);
});

const saveSearch = asyncHandler(async (req, res) => {
  const saved = await searchService.saveSearch(req.user._id, req.body);
  ApiResponse.created('Search criteria saved successfully', saved).send(res);
});

const getSavedSearches = asyncHandler(async (req, res) => {
  const searches = await searchService.getSavedSearches(req.user._id);
  ApiResponse.ok('Saved searches retrieved successfully', searches).send(res);
});

const deleteSavedSearch = asyncHandler(async (req, res) => {
  await searchService.deleteSavedSearch(req.params.id, req.user._id);
  ApiResponse.ok('Saved search deleted successfully').send(res);
});

// ── Semantic Search Endpoints ─────────────────────────

const getSimilarJobs = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const docs = await findSimilarJobs(req.params.jobId, limit);
  ApiResponse.ok('Similar jobs retrieved', docs).send(res);
});

const getSimilarResumes = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const docs = await findSimilarResumes(req.params.resumeId, limit);
  ApiResponse.ok('Similar resumes retrieved', docs).send(res);
});

const getRankedResumesByJob = asyncHandler(async (req, res) => {
  const result = await rankResumesByJob(req.params.jobId, req.query);
  ApiResponse.ok('Resumes ranked by job fit', result.docs, result.meta).send(res);
});

module.exports = {
  searchJobs,
  searchResumes,
  saveSearch,
  getSavedSearches,
  deleteSavedSearch,
  getSimilarJobs,
  getSimilarResumes,
  getRankedResumesByJob,
};
