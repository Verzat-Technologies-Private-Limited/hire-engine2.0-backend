const express = require('express');
const searchController = require('../controllers/search.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { searchLimiter } = require('../middlewares/rateLimiter.middleware');
const {
  jobSearchSchema,
  resumeSearchSchema,
  saveSearchSchema,
} = require('../validators/search.validator');

const router = express.Router();

// Public job search
router.get('/jobs', searchLimiter, validate(jobSearchSchema), searchController.searchJobs);

// Recruiter resume database search
router.get('/resumes', authenticate, authorize('employer', 'admin'), searchLimiter, validate(resumeSearchSchema), searchController.searchResumes);

// Saved search criteria & alerts
router.post('/saved', authenticate, validate(saveSearchSchema), searchController.saveSearch);
router.get('/saved', authenticate, searchController.getSavedSearches);
router.delete('/saved/:id', authenticate, searchController.deleteSavedSearch);

module.exports = router;
