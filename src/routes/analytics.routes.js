const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(authenticate, authorize('employer', 'admin'));

router.get('/jobs/:jobId', analyticsController.getJobAnalytics);
router.get('/jobs/:jobId/demographics', analyticsController.getDemographics);
router.get('/company/overview', analyticsController.getCompanyOverview);

module.exports = router;
