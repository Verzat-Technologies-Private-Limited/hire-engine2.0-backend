const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },

    title: {
      type: String,
      required: [true, 'Resume title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },

    // ★ Cloudinary file info
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },

    publicId: {
      type: String,
      required: [true, 'Cloudinary public ID is required'],
    },

    fileType: {
      type: String,
      enum: ['pdf', 'docx', 'doc', 'txt'],
      required: true,
    },

    fileSize: {
      type: Number, // bytes
      default: 0,
    },

    originalFileName: {
      type: String,
      default: '',
    },

    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ★ Parsed data from resume parser (stub)
    parsedData: {
      personalInfo: {
        name: { type: String, default: '' },
        email: { type: String, default: '' },
        phone: { type: String, default: '' },
        location: { type: String, default: '' },
      },
      experience: [
        {
          company: { type: String },
          title: { type: String },
          startDate: { type: String },
          endDate: { type: String },
          description: { type: String },
          current: { type: Boolean, default: false },
        },
      ],
      education: [
        {
          institution: { type: String },
          degree: { type: String },
          field: { type: String },
          graduationYear: { type: Number },
        },
      ],
      skills: [{ type: String }],
      totalYearsOfExperience: { type: Number, default: 0 },
      rawText: { type: String, default: '' },
      _parserMeta: {
        engine: { type: String, default: 'stub' },
        version: { type: String, default: '1.0.0' },
        parsedAt: { type: Date, default: null },
        confidence: { type: Number, default: 0 },
      },
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
resumeSchema.index({ user: 1, isDefault: 1 });
resumeSchema.index({ user: 1, createdAt: -1 });
// Text index on parsed content for resume database search
resumeSchema.index(
  {
    'parsedData.rawText': 'text',
    'parsedData.skills': 'text',
    title: 'text',
  },
  {
    weights: {
      'parsedData.skills': 10,
      title: 5,
      'parsedData.rawText': 1,
    },
    name: 'resume_text_search',
  }
);

// ── Pre-save: Ensure only one default resume per user ──
resumeSchema.pre('save', async function (next) {
  if (this.isModified('isDefault') && this.isDefault) {
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
});

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;
