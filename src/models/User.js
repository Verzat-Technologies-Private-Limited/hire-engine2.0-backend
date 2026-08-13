const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { UserRole, AuthProvider, UserStatus, ProfileVisibility } = require('../utils/constants');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },

    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    passwordHash: {
      type: String,
      required: function () {
        return this.authProvider === 'local';
      },
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password by default
    },

    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.JOB_SEEKER,
      index: true,
    },

    authProvider: {
      type: String,
      enum: Object.values(AuthProvider),
      default: AuthProvider.LOCAL,
    },

    authProviderId: {
      type: String,
      default: null,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
      index: true,
    },

    profileVisibility: {
      type: String,
      enum: Object.values(ProfileVisibility),
      default: ProfileVisibility.PUBLIC,
    },

    avatar: {
      type: String,
      default: '',
    },

    phone: {
      type: String,
      default: '',
      trim: true,
    },

    headline: {
      type: String,
      maxlength: [200, 'Headline cannot exceed 200 characters'],
      default: '',
    },

    summary: {
      type: String,
      maxlength: [2000, 'Summary cannot exceed 2000 characters'],
      default: '',
    },

    skills: [{
      type: String,
      trim: true,
    }],

    location: {
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
      },
    },

    countryCode: {
      type: String,
      uppercase: true,
      default: '',
      index: true,
    },

    // Company reference (for employers)
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },

    // Refresh token for JWT rotation (hashed)
    refreshToken: {
      type: String,
      select: false,
    },

    // GDPR / Data deletion
    deletionRequestedAt: {
      type: Date,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ─────────────────────────────────────────
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'location.coordinates': '2dsphere' });
userSchema.index({ skills: 1 });
userSchema.index({ createdAt: -1 });

// ── Pre-save: Hash password ─────────────────────────
userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash') || !this.passwordHash) return ;
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// ── Instance Methods ────────────────────────────────

/**
 * Compare a candidate password with the stored hash.
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Get the user's full name.
 * @returns {string}
 */
userSchema.methods.getFullName = function () {
  return `${this.firstName} ${this.lastName}`.trim();
};

// ── Statics ─────────────────────────────────────────

/**
 * Find a user by email, including the password hash.
 * @param {string} email
 * @returns {Promise<Document|null>}
 */
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email: email.toLowerCase() }).select('+passwordHash');
};

/**
 * Check if an email is already taken.
 * @param {string} email
 * @returns {Promise<boolean>}
 */
userSchema.statics.isEmailTaken = async function (email) {
  const user = await this.findOne({ email: email.toLowerCase() });
  return !!user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
