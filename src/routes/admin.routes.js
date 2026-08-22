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
} = require('../validators/admin.validator');

const router = express.Router();

// All admin routes require authentication and internal 'admin' role
router.use(authenticate, authorize('admin'));

// User & Compliance Management
router.get('/employers/pending', adminController.getPendingEmployers);
router.patch('/employers/:id/verify', validate(verifyEmployerSchema), adminController.verifyEmployer);
router.patch('/users/:id/suspend', validate(suspendUserSchema), adminController.suspendUser);

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

// Reports & Insights
router.get('/reports/overview', adminController.getExecutiveReport);

// Financial Refunds
router.post('/transactions/:id/refund', validate(processRefundSchema), adminController.processRefund);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

// Subscription Plan Management
router.get('/plans', adminController.getPlans);
router.post('/plans', validate(createPlanSchema), adminController.createPlan);
router.patch('/plans/:id', validate(updatePlanSchema), adminController.updatePlan);
router.delete('/plans/:id', adminController.deletePlan);

module.exports = router;
