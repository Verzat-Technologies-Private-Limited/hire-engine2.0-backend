const mongoose = require('mongoose');

const taxonomySchema = new mongoose.Schema(
  {
    // Type of taxonomy entry
    type: {
      type: String,
      enum: ['skill', 'category', 'industry', 'job_title'],
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, 'Taxonomy name is required'],
      trim: true,
    },

    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Taxonomy',
      default: null,
    },

    // For skills: related/alternative names
    aliases: [{ type: String, trim: true }],

    isActive: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
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

taxonomySchema.index({ type: 1, name: 1 }, { unique: true });
taxonomySchema.index({ type: 1, isActive: 1, sortOrder: 1 });
taxonomySchema.index({ slug: 1 });

// ── Pre-save: Generate slug ─────────────────────
taxonomySchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

const Taxonomy = mongoose.model('Taxonomy', taxonomySchema);

module.exports = Taxonomy;
