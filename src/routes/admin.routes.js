const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  verifyEmployerSchema,
  suspendUserSchema,
  resolveFlagSchema,
  updateConfigSchema,
  taxonomySchema,
  processRefundSchema,
  createPlanSchema,
  updatePlanSchema,
  adminGetJobsSchema,
  adminJobStatusSchema,
  adminBulkJobActionSchema,
  adminGetEmployersSchema,
  adminGetTransactionsSchema,
  adminExecutiveReportSchema,
} = require('../validators/admin.validator');

const router = express.Router();

// All admin routes require authentication and internal 'admin' role
router.use(authenticate, authorize('admin'));

// User & Compliance Management
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/suspend', validate(suspendUserSchema), adminController.suspendUser);

// Gap 4: Full Employer Directory & Verifications
router.get('/employers', validate(adminGetEmployersSchema), adminController.getAllEmployers);
router.get('/employers/pending', adminController.getPendingEmployers);
router.get('/employers/:id/jobs', adminController.getEmployerJobs);
router.get('/employers/:id', adminController.getEmployerById);
router.patch('/employers/:id/verify', validate(verifyEmployerSchema), adminController.verifyEmployer);

// Gap 1, 2, 3: Global Job Moderation, Force Status & Bulk Operations
router.get('/jobs', validate(adminGetJobsSchema), adminController.getAllJobs);
router.post('/jobs/bulk-action', validate(adminBulkJobActionSchema), adminController.bulkJobAction);
router.get('/jobs/:id', adminController.getJobById);
router.patch('/jobs/:id/status', validate(adminJobStatusSchema), adminController.updateJobStatus);

// Content Moderation
router.get('/flags', adminController.getFlags);
router.patch('/flags/:id', validate(resolveFlagSchema), adminController.resolveFlag);

// Taxonomy Management
router.get('/taxonomy', adminController.getTaxonomy);
router.post('/taxonomy', validate(taxonomySchema), adminController.createTaxonomyEntry);
router.patch('/taxonomy/:id', validate(taxonomySchema), adminController.updateTaxonomyEntry);

// System Configuration
router.get('/config', adminController.getSystemConfigs);
router.patch('/config', validate(updateConfigSchema), adminController.updateSystemConfig);

// Gap 6: Reports & Monster Platform Insights
router.get('/reports/overview', validate(adminExecutiveReportSchema), adminController.getExecutiveReport);

// Gap 5: Financial Transactions & Refunds
router.get('/transactions', validate(adminGetTransactionsSchema), adminController.getAllTransactions);
router.get('/transactions/:id', adminController.getTransactionById);
router.post('/transactions/:id/refund', validate(processRefundSchema), adminController.processRefund);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

// Subscription Plan Management
router.get('/plans', adminController.getPlans);
router.post('/plans', validate(createPlanSchema), adminController.createPlan);
router.patch('/plans/:id', validate(updatePlanSchema), adminController.updatePlan);
router.delete('/plans/:id', adminController.deletePlan);

module.exports = router;
