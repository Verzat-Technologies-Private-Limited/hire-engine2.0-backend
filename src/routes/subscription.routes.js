const express = require('express');
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

const router = express.Router();

// Public plan listing
router.get('/plans', subscriptionController.getPlans);

// Webhook endpoint (Raw body processing for signature verification)
router.post('/webhooks/:provider', express.raw({ type: 'application/json' }), subscriptionController.handleWebhook);

// Protected routes for employers
router.use(authenticate);
router.post('/', authorize('employer', 'admin'), subscriptionController.subscribe);
router.delete('/', authorize('employer', 'admin'), subscriptionController.cancel);
router.get('/transactions', authorize('employer', 'admin'), subscriptionController.getTransactions);

module.exports = router;
