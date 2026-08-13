const express = require('express');
const jobController = require('../controllers/job.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createJobSchema,
  updateJobSchema,
  updateJobStatusSchema,
  promoteJobSchema,
} = require('../validators/job.validator');

const router = express.Router();

// Employer routes (Protected)
router.post('/', authenticate, authorize('employer', 'admin'), validate(createJobSchema), jobController.createJob);
router.get('/employer/my-jobs', authenticate, authorize('employer', 'admin'), jobController.getEmployerJobs);
router.patch('/:id', authenticate, authorize('employer', 'admin'), validate(updateJobSchema), jobController.updateJob);
router.patch('/:id/status', authenticate, authorize('employer', 'admin'), validate(updateJobStatusSchema), jobController.updateStatus);
router.post('/:id/promote', authenticate, authorize('employer', 'admin'), validate(promoteJobSchema), jobController.promoteJob);

// Public / Candidate route (with optional auth to record user activity if logged in)
router.get('/:id', optionalAuth, jobController.getJob);

module.exports = router;
