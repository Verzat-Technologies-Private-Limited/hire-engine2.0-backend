const mongoose = require('mongoose');
const { DefaultPipelineStages } = require('../utils/constants');

const pipelineSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, 'Pipeline name is required'],
      trim: true,
      maxlength: [100, 'Pipeline name cannot exceed 100 characters'],
    },

    stages: [
      {
        name: { type: String, required: true },
        order: { type: Number, required: true },
        color: { type: String, default: '#6B7280' },
        description: { type: String, default: '' },
      },
    ],

    isDefault: {
      type: Boolean,
      default: false,
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
pipelineSchema.index({ company: 1, isDefault: 1 });

// ── Pre-save: Ensure only one default pipeline per company ──
pipelineSchema.pre('save', async function () {
  if (this.isModified('isDefault') && this.isDefault) {
    await this.constructor.updateMany(
      { company: this.company, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
});

// ── Statics ─────────────────────────────────────────

/**
 * Create default pipeline for a new company.
 * @param {string} companyId
 * @returns {Promise<Document>}
 */
pipelineSchema.statics.createDefaultPipeline = function (companyId) {
  return this.create({
    company: companyId,
    name: 'Default Pipeline',
    stages: DefaultPipelineStages.map((s, i) => ({
      ...s,
      color: ['#3B82F6', '#F59E0B', '#8B5CF6', '#10B981', '#059669'][i] || '#6B7280',
    })),
    isDefault: true,
  });
};

const Pipeline = mongoose.model('Pipeline', pipelineSchema);

module.exports = Pipeline;
