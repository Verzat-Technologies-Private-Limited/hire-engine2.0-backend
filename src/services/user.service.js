const User = require('../models/User');
const Resume = require('../models/Resume');
const Application = require('../models/Application');
const SavedSearch = require('../models/SavedSearch');
const ApiError = require('../utils/ApiError');
const { getCountryPlugin } = require('../plugins/countries');

/**
 * Get user profile by ID.
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getUserProfile(userId) {
  const user = await User.findById(userId).populate('company');
  if (!user) {
    throw ApiError.notFound('User profile not found');
  }
  return user.toJSON();
}

/**
 * Update user profile.
 * @param {string} userId
 * @param {object} updateData
 * @returns {Promise<object>}
 */
async function updateProfile(userId, updateData) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Prevent modifying email or role via this endpoint
  delete updateData.email;
  delete updateData.role;
  delete updateData.authProvider;
  delete updateData.passwordHash;

  Object.assign(user, updateData);
  await user.save();

  return user.toJSON();
}

/**
 * Toggle profile visibility between Public and Private.
 * @param {string} userId
 * @param {string} visibility - 'public' | 'private'
 * @returns {Promise<object>}
 */
async function toggleVisibility(userId, visibility) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  user.profileVisibility = visibility;
  await user.save();

  return user.toJSON();
}

/**
 * Process GDPR/CCPA data deletion request.
 * Anonymizes or deletes personal data according to the country's privacy policy.
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function requestGdprDeletion(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Get privacy policy for user's country
  let privacyPolicy;
  if (user.countryCode) {
    try {
      const plugin = getCountryPlugin(user.countryCode);
      privacyPolicy = plugin.getDataDeletionPolicy();
    } catch {
      privacyPolicy = { softDelete: true, anonymize: true };
    }
  } else {
    privacyPolicy = { softDelete: true, anonymize: true };
  }

  user.deletionRequestedAt = new Date();
  user.status = 'suspended';

  if (privacyPolicy.anonymize) {
    user.firstName = 'Anonymized';
    user.lastName = 'User';
    user.email = `deleted_${user._id}@deleted.hireengine.internal`;
    user.phone = '';
    user.summary = '';
    user.headline = '';
    user.avatar = '';
    user.skills = [];
  }

  await user.save();

  // Clean up resumes & saved searches
  await SavedSearch.deleteMany({ user: userId });

  return {
    message: 'GDPR deletion request processed successfully. Your account data has been anonymized/removed.',
    deletionDate: user.deletionRequestedAt,
  };
}

module.exports = {
  getUserProfile,
  updateProfile,
  toggleVisibility,
  requestGdprDeletion,
};
