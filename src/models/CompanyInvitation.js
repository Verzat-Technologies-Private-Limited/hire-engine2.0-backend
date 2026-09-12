const mongoose = require('mongoose');
const { TeamPermission } = require('../utils/constants');

const companyInvitationSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company reference is required'],
      index: true,
    },

    email: {
      type: String,
      required: [true, 'Invited email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },

    permissions: [
      {
        type: String,
        enum: Object.values(TeamPermission),
      },
    ],

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inviter reference is required'],
    },

    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked', 'expired'],
      default: 'pending',
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

companyInvitationSchema.methods.isExpired = function () {
  return this.status === 'expired' || new Date() > this.expiresAt;
};

const CompanyInvitation = mongoose.model('CompanyInvitation', companyInvitationSchema);

module.exports = CompanyInvitation;
