const mongoose = require('mongoose');
const { ApplicationStatus } = require('../utils/constants');

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job reference is required'],
      index: true,
    },

    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Applicant reference is required'],
      index: true,
    },

    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: [true, 'Resume is required for application'],
    },

    coverLetter: {
      type: String,
      maxlength: [5000, 'Cover letter cannot exceed 5000 characters'],
      default: '',
    },

    // ★ Screening question answers
    screeningAnswers: [
      {
        questionIndex: { type: Number, required: true },
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],

    status: {
      type: String,
      enum: Object.values(ApplicationStatus),
      default: ApplicationStatus.SUBMITTED,
      index: true,
    },

    // ★ ATS pipeline stage (custom per company)
    pipelineStage: {
      type: String,
      default: 'New',
    },

    // ★ Recruiter rating (1-5)
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      default: null,
    },

    // Status change history
    statusHistory: [
      {
        status: { type: String, required: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],

    // Was this an "Easy Apply"?
    isEasyApply: {
      type: Boolean,
      default: false,
    },

    viewedAt: {
      type: Date,
      default: null,
    },

    appliedAt: {
      type: Date,
      default: Date.now,
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
// Prevent duplicate applications: one application per job per user
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ applicant: 1, status: 1, appliedAt: -1 });
applicationSchema.index({ job: 1, status: 1, appliedAt: -1 });
applicationSchema.index({ job: 1, rating: -1 });

// ── Pre-save: Track status changes ──────────────────
applicationSchema.pre('save', async function () {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
    });
  }
});

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
