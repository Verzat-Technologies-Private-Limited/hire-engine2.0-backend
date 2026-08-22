const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      required: [true, 'Plan ID is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'Plan ID must be lowercase alphanumeric with hyphens only'],
    },

    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      maxlength: [200, 'Plan name cannot exceed 200 characters'],
    },

    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },

    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },

    jobQuota: {
      type: Number,
      default: 0, // 0 = unlimited
      min: [0, 'Job quota cannot be negative'],
    },

    resumeQuota: {
      type: Number,
      default: 0, // 0 = unlimited
      min: [0, 'Resume quota cannot be negative'],
    },

    hasResumeDB: {
      type: Boolean,
      default: false,
    },

    durationMonths: {
      type: Number,
      required: [true, 'Duration in months is required'],
      min: [1, 'Duration must be at least 1 month'],
      default: 1,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
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
planSchema.index({ planId: 1 }, { unique: true });
planSchema.index({ isActive: 1 });

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;
