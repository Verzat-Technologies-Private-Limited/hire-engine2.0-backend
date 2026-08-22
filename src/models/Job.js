const mongoose = require('mongoose');
const {
  JobStatus,
  EmploymentType,
  WorkplaceType,
  ScreeningQuestionType,
} = require('../utils/constants');

const jobSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company is required'],
      index: true,
    },

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Posted by user is required'],
    },

    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },

    description: {
      type: String,
      required: [true, 'Job description is required'],
      maxlength: [10000, 'Description cannot exceed 10000 characters'],
    },

    responsibilities: {
      type: String,
      default: '',
      maxlength: [5000, 'Responsibilities cannot exceed 5000 characters'],
    },

    qualifications: {
      type: String,
      default: '',
      maxlength: [5000, 'Qualifications cannot exceed 5000 characters'],
    },

    skills: [{
      type: String,
      trim: true,
    }],

    category: {
      type: String,
      trim: true,
      default: '',
    },

    salaryRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      currency: { type: String, default: 'USD', uppercase: true },
      period: {
        type: String,
        enum: ['hourly', 'monthly', 'annually', ''],
        default: 'annually',
      },
      isVisible: { type: Boolean, default: true },
    },

    employmentType: {
      type: String,
      enum: Object.values(EmploymentType),
      required: [true, 'Employment type is required'],
    },

    workplaceType: {
      type: String,
      enum: Object.values(WorkplaceType),
      required: [true, 'Workplace type is required'],
    },

    location: {
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
      },
    },

    status: {
      type: String,
      enum: Object.values(JobStatus),
      default: JobStatus.DRAFT,
      index: true,
    },

    // ★ Promotion / Sponsorship
    isSponsored: {
      type: Boolean,
      default: false,
      index: true,
    },

    sponsorBudget: {
      dailyBudget: { type: Number, default: 0 },
      totalBudget: { type: Number, default: 0 },
      spent: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },

    // ★ Screening Questions
    screeningQuestions: [
      {
        question: { type: String, required: true },
        type: {
          type: String,
          enum: Object.values(ScreeningQuestionType),
          default: ScreeningQuestionType.YES_NO,
        },
        required: { type: Boolean, default: false },
        options: [{ type: String }], // For multiple choice
        idealAnswer: { type: String, default: '' },
      },
    ],

    // ★ Analytics counters
    viewCount: { type: Number, default: 0 },
    clickCount: { type: Number, default: 0 },
    applicationCount: { type: Number, default: 0 },

    // Experience requirements
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead', 'executive', ''],
      default: '',
    },

    experienceYears: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },

    education: {
      type: String,
      enum: ['high_school', 'associate', 'bachelor', 'master', 'doctorate', 'any', ''],
      default: '',
    },

    benefits: [{ type: String, trim: true }],

    applicationDeadline: {
      type: Date,
      default: null,
    },

    // ★ Semantic search embedding vector (Gemini AI)
    embedding: {
      vector: { type: [Number], default: [] },
      model: { type: String, default: '' },
      generatedAt: { type: Date, default: null },
    },

    expiresAt: {
      type: Date,
      default: function () {
        // Default: 30 days from now
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      },
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

// ── Text Index for full-text search ─────────────────
jobSchema.index(
  {
    title: 'text',
    description: 'text',
    skills: 'text',
    category: 'text',
    'location.city': 'text',
    'location.state': 'text',
  },
  {
    weights: {
      title: 10,
      skills: 8,
      category: 5,
      description: 3,
      'location.city': 2,
      'location.state': 1,
    },
    name: 'job_text_search',
  }
);

// ── Compound indexes ────────────────────────────────
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ company: 1, status: 1 });
jobSchema.index({ 'location.coordinates': '2dsphere' });
jobSchema.index({ isSponsored: -1, createdAt: -1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ employmentType: 1, workplaceType: 1 });
jobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL: auto-delete expired jobs data

// ── Pre-save: Generate slug ─────────────────────────
jobSchema.pre('save', function () {
  if (this.isModified('title') || !this.slug) {
    const slugify = require('slugify');
    this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now().toString(36);
  }
});

// ── Statics ─────────────────────────────────────────

/**
 * Increment view count atomically.
 * @param {string} jobId
 */
jobSchema.statics.incrementViews = function (jobId) {
  return this.findByIdAndUpdate(jobId, { $inc: { viewCount: 1 } });
};

/**
 * Increment click count atomically.
 * @param {string} jobId
 */
jobSchema.statics.incrementClicks = function (jobId) {
  return this.findByIdAndUpdate(jobId, { $inc: { clickCount: 1 } });
};

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;

