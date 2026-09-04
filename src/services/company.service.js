const Company = require('../models/Company');
const User = require('../models/User');
const Pipeline = require('../models/Pipeline');
const ApiError = require('../utils/ApiError');
const { getCountryPlugin } = require('../plugins/countries');
const logger = require('../config/logger');

/**
 * Register a new employer company profile.
 * Validates country-specific registration details using the Country Plugin system.
 * @param {string} ownerId
 * @param {object} companyData
 * @param {object} [countryPlugin] - Resolved country plugin
 * @returns {Promise<object>}
 */
async function registerCompany(ownerId, companyData, countryPlugin) {
  const { countryCode, registrationDetails } = companyData;

  // Use resolved country plugin or fetch by countryCode
  const plugin = countryPlugin || getCountryPlugin(countryCode);

  // 1. Verify owner account eligibility according to country plugin rules
  const owner = await User.findById(ownerId);
  if (!owner) {
    throw ApiError.notFound('User not found');
  }

  const verificationRules = plugin.getVerificationRules();

  // Gap 1: Email verification check
  if (verificationRules.requiresEmailVerification && !owner.isEmailVerified) {
    throw ApiError.forbidden(
      'Email verification is required before registering an employer company profile. Please verify your email address first.'
    );
  }

  // Gap 2: Corporate email domain check
  const emailValidation = plugin.validateEmployerEmail(owner.email, companyData);
  if (!emailValidation.valid) {
    throw ApiError.badRequest(
      emailValidation.message ||
        `A business/corporate email address is required to register an employer profile in ${plugin.name}. Free email providers are not permitted.`
    );
  }

  // 2. Validate registration details against Country Plugin Joi schema
  const regSchema = plugin.getCompanyRegistrationSchema();
  if (regSchema && registrationDetails) {
    const { error } = regSchema.validate(registrationDetails, { abortEarly: false });
    if (error) {
      const details = error.details.map((d) => ({
        field: `registrationDetails.${d.path.join('.')}`,
        message: d.message.replace(/"/g, ''),
      }));
      throw ApiError.badRequest(`Company registration validation failed for ${plugin.name}`, details);
    }
  }

  // 3. Perform country-specific business validation
  const customValidation = plugin.validateCompanyRegistration({
    ...companyData,
    ...registrationDetails,
  });
  if (!customValidation.valid) {
    throw ApiError.badRequest(`Business verification validation failed for ${plugin.name}`, customValidation.errors);
  }

  // Check if owner already owns a company
  const existingOwnerCompany = await Company.findOne({ owner: ownerId });
  if (existingOwnerCompany) {
    throw ApiError.conflict('User already owns a registered company profile');
  }

  // Create company
  const company = await Company.create({
    ...companyData,
    owner: ownerId,
    countryCode: plugin.code,
    verificationStatus: 'pending',
  });

  // Link company to User
  await User.findByIdAndUpdate(ownerId, { company: company._id, role: 'employer' });

  // Create default ATS Pipeline for company
  await Pipeline.createDefaultPipeline(company._id);

  return company.toJSON();
}

/**
 * Get company profile by ID.
 * @param {string} companyId
 * @returns {Promise<object>}
 */
async function getCompanyById(companyId) {
  const company = await Company.findById(companyId)
    .populate('owner', 'firstName lastName email')
    .populate('teamMembers.user', 'firstName lastName email role');
  if (!company) {
    throw ApiError.notFound('Company not found');
  }
  return company.toJSON();
}

/**
 * Update company profile details.
 * @param {string} companyId
 * @param {string} userId
 * @param {object} updateData
 * @returns {Promise<object>}
 */
async function updateCompany(companyId, userId, updateData) {
  const company = await Company.findById(companyId);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (!company.isTeamMember(userId)) {
    throw ApiError.forbidden('You do not have permission to update this company profile');
  }

  // Protect sensitive fields
  delete updateData.owner;
  delete updateData.verificationStatus;
  delete updateData.countryCode;

  Object.assign(company, updateData);
  await company.save();

  return company.toJSON();
}

/**
 * Add a team member (sub-account) to the company with granular permissions.
 * @param {string} companyId
 * @param {string} ownerId
 * @param {object} memberData - { email, permissions }
 * @returns {Promise<object>}
 */
async function addTeamMember(companyId, ownerId, memberData) {
  const company = await Company.findById(companyId);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (company.owner.toString() !== ownerId.toString()) {
    throw ApiError.forbidden('Only the company owner can add team members');
  }

  const { email, permissions } = memberData;
  const targetUser = await User.findOne({ email: email.toLowerCase() });
  if (!targetUser) {
    throw ApiError.notFound('User with specified email not found');
  }

  if (company.isTeamMember(targetUser._id)) {
    throw ApiError.conflict('User is already a team member of this company');
  }

  company.teamMembers.push({
    user: targetUser._id,
    permissions: permissions || [],
  });

  await company.save();

  // Update target user role & company reference
  targetUser.company = company._id;
  targetUser.role = 'employer';
  await targetUser.save();

  return company.toJSON();
}

/**
 * Update a team member's permissions.
 * @param {string} companyId
 * @param {string} ownerId
 * @param {string} memberUserId
 * @param {Array<string>} permissions
 * @returns {Promise<object>}
 */
async function updateTeamMemberPermissions(companyId, ownerId, memberUserId, permissions) {
  const company = await Company.findById(companyId);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (company.owner.toString() !== ownerId.toString()) {
    throw ApiError.forbidden('Only the company owner can modify team member permissions');
  }

  const member = company.teamMembers.find((m) => m.user.toString() === memberUserId.toString());
  if (!member) {
    throw ApiError.notFound('Team member not found in this company');
  }

  member.permissions = permissions;
  await company.save();

  return company.toJSON();
}

/**
 * Remove a team member from company sub-accounts.
 * @param {string} companyId
 * @param {string} ownerId
 * @param {string} memberUserId
 */
async function removeTeamMember(companyId, ownerId, memberUserId) {
  const company = await Company.findById(companyId);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (company.owner.toString() !== ownerId.toString()) {
    throw ApiError.forbidden('Only the company owner can remove team members');
  }

  company.teamMembers = company.teamMembers.filter(
    (m) => m.user.toString() !== memberUserId.toString()
  );
  await company.save();

  await User.findByIdAndUpdate(memberUserId, { company: null, role: 'jobseeker' });
}

/**
 * Upload a verification document for a company.
 * Dynamically validates against the company's country plugin.
 * @param {string} companyId
 * @param {string} userId
 * @param {object} file - Multer uploaded file object
 * @param {object} docData - { type, label }
 * @returns {Promise<object>}
 */
async function uploadCompanyDocument(companyId, userId, file, docData) {
  if (!file) {
    throw ApiError.badRequest('Document file is required for upload');
  }

  const company = await Company.findById(companyId);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (!company.isTeamMember(userId)) {
    throw ApiError.forbidden('You do not have permission to upload documents for this company');
  }

  const plugin = getCountryPlugin(company.countryCode);
  const recognizedDocs = plugin.getRequiredCompanyDocuments() || [];
  const recognizedTypes = recognizedDocs.map((d) => d.type);

  // Validate that document type is valid for this country plugin (if plugin defines recognized types)
  if (recognizedTypes.length > 0 && !recognizedTypes.includes(docData.type)) {
    throw ApiError.badRequest(
      `Invalid document type "${docData.type}" for ${plugin.name}. Allowed types: ${recognizedTypes.join(', ')}`
    );
  }

  const matchedMeta = recognizedDocs.find((d) => d.type === docData.type);
  const label = docData.label || matchedMeta?.label || docData.type;

  const newDoc = {
    type: docData.type,
    label,
    fileUrl: file.path || file.secure_url || file.url || '',
    publicId: file.filename || file.public_id || '',
    uploadedAt: new Date(),
  };

  // If document of same type was already uploaded, replace it
  const existingDocIndex = company.documents.findIndex((d) => d.type === docData.type);
  if (existingDocIndex >= 0) {
    const oldPublicId = company.documents[existingDocIndex].publicId;
    if (oldPublicId) {
      const { deleteCloudinaryFile } = require('../middlewares/upload.middleware');
      deleteCloudinaryFile(oldPublicId).catch(() => {});
    }
    company.documents[existingDocIndex] = newDoc;
  } else {
    company.documents.push(newDoc);
  }

  await company.save();

  return {
    document: newDoc,
    documents: company.documents,
  };
}

/**
 * Get uploaded documents and dynamic country verification checklist for a company.
 * @param {string} companyId
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getCompanyDocuments(companyId, userId) {
  const company = await Company.findById(companyId);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (!company.isTeamMember(userId)) {
    throw ApiError.forbidden('You do not have permission to view documents for this company');
  }

  const plugin = getCountryPlugin(company.countryCode);
  const requiredDocs = plugin.getRequiredCompanyDocuments() || [];

  const checklist = requiredDocs.map((reqDoc) => {
    const uploaded = company.documents.find((d) => d.type === reqDoc.type);
    return {
      type: reqDoc.type,
      label: reqDoc.label,
      description: reqDoc.description,
      required: reqDoc.required,
      isUploaded: Boolean(uploaded),
      uploadedDocument: uploaded || null,
    };
  });

  const totalRequired = requiredDocs.filter((d) => d.required).length;
  const uploadedRequired = checklist.filter((d) => d.required && d.isUploaded).length;

  return {
    companyId: company._id,
    countryCode: company.countryCode,
    countryName: plugin.name,
    verificationStatus: company.verificationStatus,
    checklist,
    isComplete: uploadedRequired >= totalRequired,
    documents: company.documents,
  };
}

module.exports = {
  registerCompany,
  getCompanyById,
  updateCompany,
  addTeamMember,
  updateTeamMemberPermissions,
  removeTeamMember,
  uploadCompanyDocument,
  getCompanyDocuments,
};
