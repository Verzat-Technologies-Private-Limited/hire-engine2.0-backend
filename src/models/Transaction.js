const mongoose = require('mongoose');
const { TransactionType, TransactionStatus, PaymentProvider } = require('../utils/constants');

const transactionSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
    },

    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'USD',
    },

    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
      index: true,
    },

    // ★ Provider-agnostic
    paymentProvider: {
      type: String,
      enum: Object.values(PaymentProvider),
      required: true,
    },

    externalPaymentId: {
      type: String,
      default: '',
    },

    // ★ Store the raw provider response for audit
    providerMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    description: {
      type: String,
      default: '',
    },

    // For refunds
    refundReason: {
      type: String,
      default: '',
    },

    refundedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },

    // Tax breakdown
    taxAmount: {
      type: Number,
      default: 0,
    },

    taxBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Invoice reference
    invoiceNumber: {
      type: String,
      default: '',
    },

    processedBy: {
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

// ── Indexes ─────────────────────────────────────────
transactionSchema.index({ company: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ externalPaymentId: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
