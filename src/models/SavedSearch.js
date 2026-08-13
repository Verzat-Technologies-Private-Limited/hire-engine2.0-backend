const mongoose = require('mongoose');
const { AlertFrequency } = require('../utils/constants');

const savedSearchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, 'Search name is required'],
      trim: true,
      maxlength: [100, 'Search name cannot exceed 100 characters'],
    },

    // ★ Saved filter criteria (flexible schema)
    filters: {
      keywords: { type: String, default: '' },
      jobTitle: { type: String, default: '' },
      companyName: { type: String, default: '' },
      location: { type: String, default: '' },
      radius: { type: Number, default: 0 }, // miles
      coordinates: { type: [Number], default: undefined },
      salaryMin: { type: Number, default: 0 },
      salaryMax: { type: Number, default: 0 },
      employmentType: [{ type: String }],
      workplaceType: [{ type: String }],
      experienceLevel: [{ type: String }],
      skills: [{ type: String }],
      datePosted: { type: String, default: '' }, // 'today', '3days', '7days', '30days'
      // Resume search specific filters (for employers)
      yearsOfExperience: { min: { type: Number }, max: { type: Number } },
      education: { type: String, default: '' },
    },

    // Search type: job search or resume database search
    searchType: {
      type: String,
      enum: ['jobs', 'resumes'],
      default: 'jobs',
    },

    // ★ Alert preferences
    emailAlert: {
      type: Boolean,
      default: true,
    },

    smsAlert: {
      type: Boolean,
      default: false,
    },

    frequency: {
      type: String,
      enum: Object.values(AlertFrequency),
      default: AlertFrequency.DAILY,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastNotifiedAt: {
      type: Date,
      default: null,
    },

    lastResultCount: {
      type: Number,
      default: 0,
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
savedSearchSchema.index({ user: 1, searchType: 1 });
savedSearchSchema.index({ isActive: 1, frequency: 1, lastNotifiedAt: 1 });

const SavedSearch = mongoose.model('SavedSearch', savedSearchSchema);

module.exports = SavedSearch;
