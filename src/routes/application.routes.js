const express = require('express');
const applicationController = require('../controllers/application.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { applicationLimiter } = require('../middlewares/rateLimiter.middleware');
const {
  applyJobSchema,
  updateApplicationStatusSchema,
  addNoteSchema,
  updateNoteSchema,
  noteParamsSchema,
  rateApplicationSchema,
  bulkEmailSchema,
} = require('../validators/application.validator');

const router = express.Router();

router.use(authenticate);

// Job seeker routes
router.post('/jobs/:jobId/apply', authorize('jobseeker'), applicationLimiter, validate(applyJobSchema), applicationController.apply);
router.get('/me', authorize('jobseeker'), applicationController.getSeekerApplications);

// Employer ATS routes
router.get('/jobs/:jobId/applications', authorize('employer', 'admin'), applicationController.getJobApplications);
router.get('/:id/fit', authorize('employer', 'admin'), applicationController.getFitAnalysis);
router.patch('/:id/status', authorize('employer', 'admin'), validate(updateApplicationStatusSchema), applicationController.updateStatus);

// Notes CRUD
router.post('/:id/notes', authorize('employer', 'admin'), validate(addNoteSchema), applicationController.addNote);
router.get('/:id/notes', authorize('employer', 'admin'), applicationController.getNotes);
router.put('/:id/notes/:noteId', authorize('employer', 'admin'), validate(updateNoteSchema), applicationController.updateNote);
router.delete('/:id/notes/:noteId', authorize('employer', 'admin'), validate(noteParamsSchema), applicationController.deleteNote);

// Rating
router.post('/:id/rate', authorize('employer', 'admin'), validate(rateApplicationSchema), applicationController.rateCandidate);
router.delete('/:id/rate', authorize('employer', 'admin'), applicationController.clearRating);

router.post('/bulk-email', authorize('employer', 'admin'), validate(bulkEmailSchema), applicationController.sendBulkEmail);

module.exports = router;
