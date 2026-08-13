const mongoose = require('mongoose');
const { NotificationType } = require('../utils/constants');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },

    title: {
      type: String,
      required: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    message: {
      type: String,
      required: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },

    // Reference to the related resource
    relatedModel: {
      type: String,
      enum: ['Job', 'Application', 'Company', 'User', ''],
      default: '',
    },

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Link to navigate to in the frontend
    actionUrl: {
      type: String,
      default: '',
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
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

// ── Indexes ─────────────────────────────────────────
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // Auto-delete after 90 days

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
