const mongoose = require('mongoose');
const { VerificationStatus, TeamPermission } = require('../utils/constants');

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true, // [lng, lat]
    },
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Company owner is required'],
      index: true,
    },

    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters'],
    },

    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },

    website: {
      type: String,
      trim: true,
      default: '',
    },

    industry: {
      type: String,
      trim: true,
      default: '',
    },

    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+', ''],
      default: '',
    },

    description: {
      type: String,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
      default: '',
    },

    logoUrl: {
      type: String,
      default: '',
    },

    logoPublicId: {
      type: String,
      default: '',
    },

    // ★ Country code — drives plugin selection
    countryCode: {
      type: String,
      required: [true, 'Country code is required'],
      uppercase: true,
      index: true,
    },

    // ★ Verification
    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING,
      index: true,
    },

    verificationNotes: {
      type: String,
      default: '',
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    infoRequestedAt: {
      type: Date,
      default: null,
    },

    infoRequestedNotes: {
      type: String,
      default: '',
    },

    reviewDeadlineAt: {
      type: Date,
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      default: '',
    },

    contactName: {
      type: String,
      trim: true,
      default: '',
    },

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    verifiedPhone: {
      type: Boolean,
      default: false,
    },

    // ★ Country-specific registration details (flexible schema)
    registrationDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ★ Company verification documents
    documents: [
      {
        type: { type: String, required: true }, // e.g., 'gst_certificate', 'ein_letter'
        label: { type: String, required: true },
        fileUrl: { type: String, required: true },
        publicId: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // ★ Team members with permissions
    teamMembers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        permissions: [
          {
            type: String,
            enum: Object.values(TeamPermission),
          },
        ],
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: '' },
      coordinates: {
        type: pointSchema,
        default: undefined,
      },
    },

    socialLinks: {
      linkedin: { type: String, default: '' },
      twitter: { type: String, default: '' },
      facebook: { type: String, default: '' },
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
companySchema.index({ slug: 1 }, { unique: true });
companySchema.index({ verificationStatus: 1, createdAt: -1 });
companySchema.index({ 'teamMembers.user': 1 });
companySchema.index({ 'address.coordinates': '2dsphere' });

// Gap 11: Fraud & Duplicate prevention indexes on registration identifiers
companySchema.index({ 'registrationDetails.gstNumber': 1 }, { sparse: true });
companySchema.index({ 'registrationDetails.panNumber': 1 }, { sparse: true });
companySchema.index({ 'registrationDetails.cinNumber': 1 }, { sparse: true });
companySchema.index({ 'registrationDetails.einNumber': 1 }, { sparse: true });

// ── Pre-save: Generate slug ─────────────────────────
companySchema.pre('save', function () {
  if (this.isModified('name') || !this.slug) {
    const slugify = require('slugify');
    this.slug = slugify(this.name, { lower: true, strict: true }) + '-' + Date.now().toString(36);
  }
});

// ── Pre-save: Sanitize address coordinates ───────────
// Ensures invalid GeoJSON never reaches the 2dsphere index on the address field.
companySchema.pre('save', function () {
  const coords = this.address?.coordinates;
  if (!coords) return;

  const arr = coords.coordinates;
  const isValid =
    Array.isArray(arr) &&
    arr.length === 2 &&
    typeof arr[0] === 'number' && isFinite(arr[0]) &&
    typeof arr[1] === 'number' && isFinite(arr[1]) &&
    !(arr[0] === 0 && arr[1] === 0) &&
    arr[1] >= -90 && arr[1] <= 90 &&
    arr[0] >= -180 && arr[0] <= 180;

  if (!isValid) {
    this.address.coordinates = undefined;
  }
});

// ── Instance Methods ────────────────────────────────

/**
 * Check if a user is a team member.
 * @param {string|ObjectId} userId
 * @returns {boolean}
 */
companySchema.methods.isTeamMember = function (userId) {
  const uid = userId.toString();
  if (this.owner.toString() === uid) {
    return true;
  }

  return this.teamMembers.some((member) => member.user.toString() === uid);
};

/**
 * Get a team member's permissions.
 * @param {string|ObjectId} userId
 * @returns {string[]|null} Permissions array or null if not a member
 */
companySchema.methods.getMemberPermissions = function (userId) {
  const uid = userId.toString();
  if (this.owner.toString() === uid) return Object.values(TeamPermission); // Owner has all
  const member = this.teamMembers.find((m) => m.user.toString() === uid);
  return member ? member.permissions : null;
};

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
