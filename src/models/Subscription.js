const mongoose = require('mongoose');
const { SubscriptionPlan, SubscriptionStatus, PaymentProvider } = require('../utils/constants');

const subscriptionSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      unique: true, // One active subscription per company
    },

    plan: {
      type: String,
      enum: Object.values(SubscriptionPlan),
      required: [true, 'Subscription plan is required'],
    },

    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.ACTIVE,
      index: true,
    },

    // ★ Provider-agnostic fields
    paymentProvider: {
      type: String,
      enum: Object.values(PaymentProvider),
      required: true,
    },

    externalSubscriptionId: {
      type: String,
      default: '',
    },

    externalCustomerId: {
      type: String,
      default: '',
    },

    // ★ Plan quotas
    jobPostQuota: {
      type: Number,
      default: 0, // 0 = unlimited
    },

    jobPostsUsed: {
      type: Number,
      default: 0,
    },

    resumeSearchQuota: {
      type: Number,
      default: 0,
    },

    resumeSearchesUsed: {
      type: Number,
      default: 0,
    },

    hasResumeDBAccess: {
      type: Boolean,
      default: false,
    },

    // Billing period
    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },

    currentPeriodEnd: {
      type: Date,
      required: true,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ─────────────────────────────────────────
subscriptionSchema.index({ company: 1 }, { unique: true });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

// ── Instance Methods ────────────────────────────────

/**
 * Check if the subscription has remaining job post quota.
 * @returns {boolean}
 */
subscriptionSchema.methods.hasJobPostQuota = function () {
  if (this.jobPostQuota === 0) return true; // 0 = unlimited
  return this.jobPostsUsed < this.jobPostQuota;
};

/**
 * Check if the subscription has remaining resume search quota.
 * @returns {boolean}
 */
subscriptionSchema.methods.hasResumeSearchQuota = function () {
  if (this.resumeSearchQuota === 0) return true;
  return this.resumeSearchesUsed < this.resumeSearchQuota;
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
