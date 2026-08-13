const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // Who performed the action
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Action type
    action: {
      type: String,
      required: true,
      enum: [
        'user.created', 'user.updated', 'user.suspended', 'user.banned', 'user.deleted',
        'company.created', 'company.verified', 'company.rejected',
        'job.created', 'job.updated', 'job.closed', 'job.flagged', 'job.removed',
        'subscription.created', 'subscription.cancelled',
        'refund.processed',
        'config.updated',
        'taxonomy.created', 'taxonomy.updated',
        'flag.resolved',
        'gdpr.deletion_requested', 'gdpr.deletion_completed',
        'admin.login',
      ],
    },

    // What was affected
    targetModel: {
      type: String,
      enum: ['User', 'Company', 'Job', 'Application', 'Subscription', 'Transaction', 'SystemConfig', 'Taxonomy', 'Flag', ''],
      default: '',
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Details of the change
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Request metadata
    ipAddress: {
      type: String,
      default: '',
    },

    userAgent: {
      type: String,
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

// ── Indexes ─────────────────────────────────────────
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetModel: 1, targetId: 1 });
auditLogSchema.index({ createdAt: -1 });

// ── Statics ─────────────────────────────────────────

/**
 * Log an admin action.
 * @param {object} params
 * @returns {Promise<Document>}
 */
auditLogSchema.statics.log = function ({ performedBy, action, targetModel, targetId, details, req }) {
  return this.create({
    performedBy,
    action,
    targetModel: targetModel || '',
    targetId: targetId || null,
    details: details || {},
    ipAddress: req?.ip || '',
    userAgent: req?.headers?.['user-agent'] || '',
  });
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
