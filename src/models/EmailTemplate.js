const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [100, 'Template name cannot exceed 100 characters'],
    },

    subject: {
      type: String,
      required: [true, 'Subject is required'],
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },

    body: {
      type: String,
      required: [true, 'Body is required'],
      maxlength: [10000, 'Body cannot exceed 10000 characters'],
    },

    // Template type
    category: {
      type: String,
      enum: ['rejection', 'interview_invitation', 'offer', 'follow_up', 'general'],
      default: 'general',
    },

    // Available placeholder variables
    variables: [{
      type: String, // e.g., '{{candidateName}}', '{{jobTitle}}', '{{companyName}}'
    }],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

emailTemplateSchema.index({ company: 1, category: 1 });

const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);

module.exports = EmailTemplate;
