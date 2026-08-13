const searchService = require('../services/search.service');
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

module.exports = {
  searchJobs,
  searchResumes,
  saveSearch,
  getSavedSearches,
  deleteSavedSearch,
};
