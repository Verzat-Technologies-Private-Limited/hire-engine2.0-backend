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

// Public job search (keyword, semantic, or hybrid)
router.get('/jobs', searchLimiter, validate(jobSearchSchema), searchController.searchJobs);

// Recruiter resume database search (Boolean keyword + Semantic AI, hybrid by default)
router.get('/resumes', authenticate, authorize('employer', 'admin'), searchLimiter, validate(resumeSearchSchema), searchController.searchResumes);

// ── Semantic AI Search Endpoints ──────────────────────

// Find jobs similar to a given job
router.get('/jobs/similar/:jobId', searchLimiter, searchController.getSimilarJobs);

// Find resumes similar to a given resume (recruiter only)
router.get('/resumes/similar/:resumeId', authenticate, authorize('employer', 'admin'), searchLimiter, searchController.getSimilarResumes);

// AI-rank all candidate resumes against a specific job posting (recruiter only)
router.get('/resumes/rank-by-job/:jobId', authenticate, authorize('employer', 'admin'), searchLimiter, searchController.getRankedResumesByJob);

// ── Saved Searches & Alerts ───────────────────────────

// Saved search criteria & alerts
router.post('/saved', authenticate, validate(saveSearchSchema), searchController.saveSearch);
router.get('/saved', authenticate, searchController.getSavedSearches);
router.delete('/saved/:id', authenticate, searchController.deleteSavedSearch);

module.exports = router;
