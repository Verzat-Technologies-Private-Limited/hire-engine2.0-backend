const mongoose = require('mongoose');
const { FlagStatus, FlagReason } = require('../utils/constants');

const flagSchema = new mongoose.Schema(
  {
    // What is being flagged
    targetModel: {
      type: String,
      enum: ['Job', 'User', 'Company'],
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // Who flagged it
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    reason: {
      type: String,
      enum: Object.values(FlagReason),
      required: [true, 'Flag reason is required'],
    },

    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },

    status: {
      type: String,
      enum: Object.values(FlagStatus),
      default: FlagStatus.PENDING,
      index: true,
    },

    // Admin resolution
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    resolutionNote: {
      type: String,
      default: '',
    },

    actionTaken: {
      type: String,
      enum: ['none', 'removed', 'suspended', 'warned', ''],
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

flagSchema.index({ status: 1, createdAt: -1 });
flagSchema.index({ targetModel: 1, targetId: 1 });
flagSchema.index({ reportedBy: 1 });

const Flag = mongoose.model('Flag', flagSchema);

module.exports = Flag;
