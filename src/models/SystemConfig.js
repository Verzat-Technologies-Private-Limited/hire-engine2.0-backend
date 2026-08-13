const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    description: {
      type: String,
      default: '',
    },

    category: {
      type: String,
      enum: ['rate_limits', 'thresholds', 'features', 'general'],
      default: 'general',
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

systemConfigSchema.index({ key: 1 }, { unique: true });
systemConfigSchema.index({ category: 1 });

// ── Statics ─────────────────────────────────────────

/**
 * Get a config value by key with optional default.
 * @param {string} key
 * @param {*} defaultValue
 * @returns {Promise<*>}
 */
systemConfigSchema.statics.getValue = async function (key, defaultValue = null) {
  const config = await this.findOne({ key }).lean();
  return config ? config.value : defaultValue;
};

/**
 * Set a config value (upsert).
 * @param {string} key
 * @param {*} value
 * @param {object} [options]
 * @returns {Promise<Document>}
 */
systemConfigSchema.statics.setValue = function (key, value, options = {}) {
  return this.findOneAndUpdate(
    { key },
    {
      value,
      ...(options.description && { description: options.description }),
      ...(options.category && { category: options.category }),
      ...(options.updatedBy && { updatedBy: options.updatedBy }),
    },
    { upsert: true, new: true }
  );
};

const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);

module.exports = SystemConfig;
