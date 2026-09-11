const express = require('express');
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  subscribeSchema,
  verifyPaymentSchema,
  cancelSubscriptionSchema,
  currentSubscriptionSchema,
  getTransactionsSchema,
  getPlansSchema,
} = require('../validators/subscription.validator');

const router = express.Router();

// Public plan listing
router.get('/plans', validate(getPlansSchema), subscriptionController.getPlans);

// Webhook endpoint (Raw body processing for signature verification)
router.post(
  '/webhooks/:provider',
  express.raw({ type: 'application/json' }),
  subscriptionController.handleWebhook
);

// Protected routes for employers & admins
router.use(authenticate);

// Step 1: Create subscription order (status: pending)
router.post('/', authorize('employer', 'admin'), validate(subscribeSchema), subscriptionController.subscribe);

// Step 2: Cryptographically verify payment and activate subscription
router.post(
  '/verify',
  authorize('employer', 'admin'),
  validate(verifyPaymentSchema),
  subscriptionController.verifyPayment
);

// Get recruiter's active subscription, status & quota progress
router.get(
  '/current',
  authorize('employer', 'admin'),
  validate(currentSubscriptionSchema),
  subscriptionController.getCurrentSubscription
);

// Cancel active subscription
router.delete(
  '/',
  authorize('employer', 'admin'),
  validate(cancelSubscriptionSchema),
  subscriptionController.cancel
);

// Get transaction history with tenant isolation, pagination & filters
router.get(
  '/transactions',
  authorize('employer', 'admin'),
  validate(getTransactionsSchema),
  subscriptionController.getTransactions
);

// Get tax-compliant B2B invoice details for a transaction
router.get(
  '/transactions/:id/invoice',
  authorize('employer', 'admin'),
  subscriptionController.getInvoice
);

module.exports = router;
