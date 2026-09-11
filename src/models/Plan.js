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

    // Multi-country / Multi-currency price matrix (in smallest unit of currency, e.g., { USD: 29900, INR: 1999900 })
    prices: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

// ── Instance Methods ────────────────────────────────

/**
 * Get the price for a specific currency in smallest unit.
 * Uses currency-specific price if defined; otherwise performs parity conversion.
 * @param {string} currency - 'USD', 'INR', etc.
 * @returns {number} Amount in smallest unit (cents, paise, etc.)
 */
planSchema.methods.getPriceForCurrency = function (currency = 'USD') {
  const curr = currency.toUpperCase();
  if (this.prices && this.prices instanceof Map && this.prices.has(curr)) {
    return this.prices.get(curr);
  }
  if (this.prices && typeof this.prices === 'object' && this.prices[curr] !== undefined) {
    return this.prices[curr];
  }

  // If currency is USD, return the base price
  if (curr === 'USD') {
    return this.price;
  }

  // Parity fallback: if INR and no INR price specified, convert based on standard reference rate (1 USD ~ 83 INR)
  if (curr === 'INR') {
    return Math.round((this.price / 100) * 83 * 100); // dollars to INR paise
  }

  return this.price;
};

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;
