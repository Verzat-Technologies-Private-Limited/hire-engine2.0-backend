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

  if (companyData.phone) {
    if (typeof plugin.validatePhoneNumber === 'function') {
      const phoneValidation = plugin.validatePhoneNumber(companyData.phone);
      if (!phoneValidation.valid) {
        throw ApiError.badRequest(phoneValidation.message || 'Invalid business phone number');
      }
    }
  } else if (verificationRules.requiresPhoneVerification) {
    throw ApiError.badRequest(`Business phone number is required to register a company in ${plugin.name}`);
  }

  // Check if owner already owns a company
  const existingOwnerCompany = await Company.findOne({ owner: ownerId });
  if (existingOwnerCompany) {
    throw ApiError.conflict('User already owns a registered company profile');
  }

  // Gap 11: Fraud & Duplicate company name check (delegated to country plugin)
  if (typeof plugin.checkDuplicateCompanyName === 'function') {
    await plugin.checkDuplicateCompanyName(companyData.name, Company);
  } else {
    const trimmedName = companyData.name ? companyData.name.trim() : '';
    if (trimmedName) {
      const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingNamedCompany = await Company.findOne({
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      });
      if (existingNamedCompany) {
        throw ApiError.conflict(`A company with the name "${trimmedName}" is already registered`);
      }
    }
  }

  // Gap 11: Fraud & Duplicate registration numbers check (delegated to country plugin)
  if (registrationDetails && typeof plugin.checkDuplicateRegistration === 'function') {
    await plugin.checkDuplicateRegistration(registrationDetails, Company);
  }

  // Corporate domain auto-matching check: Prevent duplicate company registration with the same corporate website domain
  if (companyData.website) {
    const { extractDomain, isFreeEmailProvider } = require('../utils/emailDomain');
    const websiteDomain = extractDomain(companyData.website);
    if (websiteDomain && !isFreeEmailProvider(`test@${websiteDomain}`)) {
      const escapedDomain = websiteDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingDomainCompany = await Company.findOne({
        website: { $regex: new RegExp(`(^|://)(www\\.)?${escapedDomain}(/|$)`, 'i') },
      });
      if (existingDomainCompany && existingDomainCompany.owner.toString() !== ownerId.toString()) {
        throw ApiError.conflict(
          `A company profile with the domain "${websiteDomain}" (${existingDomainCompany.name}) is already registered. Please request to join your company team or contact support.`
        );
      }
    }
  }

  // Gap 3: Phone number and optional instant OTP verification
  let isPhoneVerified = false;
  if (companyData.phone && companyData.phoneOtp) {
    const smsService = require('./sms.service');
    smsService.verifyOtp(companyData.phone, companyData.phoneOtp);
    isPhoneVerified = true;
  }

  // Gap 9: SLA Review deadline (driven by Country Plugin SLA contract, e.g. 48h for IN, 24h for US)
  const slaHours =
    (typeof plugin.getVerificationSLAHours === 'function'
      ? plugin.getVerificationSLAHours()
      : verificationRules.slaHours) || 48;
  const reviewDeadlineAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

  // Create company
  const company = await Company.create({
    ...companyData,
    owner: ownerId,
    countryCode: plugin.code,
    verificationStatus: 'pending',
    phone: companyData.phone,
    contactName: companyData.contactName || '',
    isPhoneVerified,
    verifiedPhone: isPhoneVerified,
    reviewDeadlineAt,
  });

  // Link company to User
  await User.findByIdAndUpdate(ownerId, { company: company._id, role: 'employer' });

  // Create default ATS Pipeline for company
  await Pipeline.createDefaultPipeline(company._id);

  // Gap 9: Admin Notification / Dashboard Alert for New Pending Employers
  const { notifyAdmins } = require('./notification.service');
  const { NotificationType } = require('../utils/constants');
  notifyAdmins(
    NotificationType.COMPANY_PENDING_REVIEW,
    'New Employer Registration Pending Review',
    `Company "${company.name}" has registered and is awaiting verification review.`,
    {
      relatedModel: 'Company',
      relatedId: company._id,
      actionUrl: `/admin/employers/${company._id}`,
    }
  ).catch((err) => logger.error('Failed to notify admins of new company registration', { error: err.message }));

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

  await User.findByIdAndUpdate(memberUserId, {
    company: null,
    role: 'jobseeker',
    $unset: { refreshToken: 1 },
  });
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

/**
 * Send OTP to a phone number for company verification.
 * @param {string} phone
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function sendCompanyPhoneOtp(phone) {
  const smsService = require('./sms.service');
  return smsService.generateAndSendOtp(phone);
}

/**
 * Verify OTP and mark company phone as verified.
 * @param {string} companyId
 * @param {string} userId
 * @param {string} phone
 * @param {string} otp
 * @returns {Promise<object>}
 */
async function verifyCompanyPhoneOtp(companyId, userId, phone, otp) {
  const company = await Company.findById(companyId);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (!company.isTeamMember(userId)) {
    throw ApiError.forbidden('You do not have permission to verify phone for this company');
  }

  const smsService = require('./sms.service');
  smsService.verifyOtp(phone, otp);

  company.phone = phone;
  company.isPhoneVerified = true;
  company.verifiedPhone = true;
  await company.save();

  return company.toJSON();
}

/**
 * Invite a team member to collaborate on a company profile.
 * Generates an invitation record with token and dispatches an invitation email.
 * @param {string} companyId
 * @param {string} inviterId
 * @param {object} inviteData - { email, permissions }
 * @returns {Promise<object>}
 */
async function inviteTeamMember(companyId, inviterId, inviteData) {
  const CompanyInvitation = require('../models/CompanyInvitation');
  const crypto = require('crypto');
  const emailService = require('./email.service');

  const company = await Company.findById(companyId);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (company.owner.toString() !== inviterId.toString()) {
    throw ApiError.forbidden('Only the company owner can invite team members');
  }

  const { email, permissions } = inviteData;
  const normalizedEmail = email.toLowerCase().trim();

  // Check if existing user is already owner or member
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser && company.isTeamMember(existingUser._id)) {
    throw ApiError.conflict('User is already a team member or owner of this company');
  }

  // Token expires in 7 days
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // If there is an existing pending invite, revoke it
  await CompanyInvitation.updateMany(
    { company: companyId, email: normalizedEmail, status: 'pending' },
    { status: 'revoked' }
  );

  const invitation = await CompanyInvitation.create({
    company: companyId,
    email: normalizedEmail,
    permissions: permissions || [],
    invitedBy: inviterId,
    token,
    expiresAt,
    status: 'pending',
  });

  const inviter = await User.findById(inviterId);
  emailService
    .sendTeamInvitationEmail({
      email: normalizedEmail,
      companyName: company.name,
      inviterName: inviter?.getFullName ? inviter.getFullName() : 'Administrator',
      inviteToken: token,
      permissions,
    })
    .catch((err) => logger.error('Failed to send team invitation email', { error: err.message }));

  return invitation.toJSON();
}

/**
 * Get pending team invitations for a company.
 * @param {string} companyId
 * @param {string} requesterId
 * @returns {Promise<Array<object>>}
 */
async function getCompanyInvitations(companyId, requesterId) {
  const CompanyInvitation = require('../models/CompanyInvitation');

  const company = await Company.findById(companyId);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (!company.isTeamMember(requesterId)) {
    throw ApiError.forbidden('You do not have access to view this company invitations');
  }

  const invitations = await CompanyInvitation.find({
    company: companyId,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })
    .populate('invitedBy', 'firstName lastName email')
    .sort({ createdAt: -1 });

  return invitations;
}

/**
 * Revoke a pending team invitation.
 * @param {string} companyId
 * @param {string} ownerId
 * @param {string} inviteId
 * @returns {Promise<object>}
 */
async function revokeInvitation(companyId, ownerId, inviteId) {
  const CompanyInvitation = require('../models/CompanyInvitation');

  const company = await Company.findById(companyId);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (company.owner.toString() !== ownerId.toString()) {
    throw ApiError.forbidden('Only the company owner can revoke team invitations');
  }

  const invitation = await CompanyInvitation.findOneAndUpdate(
    { _id: inviteId, company: companyId, status: 'pending' },
    { status: 'revoked' },
    { new: true }
  );

  if (!invitation) {
    throw ApiError.notFound('Pending invitation not found');
  }

  return invitation.toJSON();
}

/**
 * Get invitation details by secure token (publicly accessible).
 * @param {string} token
 * @returns {Promise<object>}
 */
async function getInvitationByToken(token) {
  const CompanyInvitation = require('../models/CompanyInvitation');

  const invitation = await CompanyInvitation.findOne({ token, status: 'pending' })
    .populate('company', 'name slug logoUrl countryCode verificationStatus')
    .populate('invitedBy', 'firstName lastName email');

  if (!invitation || invitation.isExpired()) {
    throw ApiError.badRequest('This team invitation is invalid or has expired');
  }

  return invitation.toJSON();
}

/**
 * Accept a team invitation and join the company.
 * If user does not exist, registers the user account.
 * If user exists, associates with company and assigns permissions.
 * @param {string} token
 * @param {object} [userData] - { firstName, lastName, password } if user is not already registered
 * @param {object} [currentUser] - Authenticated user if already logged in
 * @returns {Promise<object>}
 */
async function acceptInvitation(token, userData = {}, currentUser = null) {
  const CompanyInvitation = require('../models/CompanyInvitation');
  const { generateTokenPair } = require('../utils/tokens');

  const invitation = await CompanyInvitation.findOne({ token, status: 'pending' });
  if (!invitation || invitation.isExpired()) {
    throw ApiError.badRequest('This team invitation is invalid or has expired');
  }

  const company = await Company.findById(invitation.company);
  if (!company) {
    throw ApiError.notFound('Company associated with this invitation no longer exists');
  }

  let user = currentUser;

  if (!user) {
    const userQuery = User.findOne({ email: invitation.email.toLowerCase() });
    user = typeof userQuery?.select === 'function' ? await userQuery.select('+passwordHash') : await userQuery;
    if (!user) {
      if (!userData.password) {
        throw ApiError.badRequest('Password is required to create your account');
      }

      user = await User.create({
        firstName: userData.firstName || 'Team',
        lastName: userData.lastName || 'Member',
        email: invitation.email.toLowerCase(),
        passwordHash: userData.password,
        role: 'employer',
        company: company._id,
        countryCode: company.countryCode || '',
        isEmailVerified: true,
        authProvider: 'local',
      });
    }
  }

  // Add user to company.teamMembers if not already a member
  if (!company.isTeamMember(user._id)) {
    company.teamMembers.push({
      user: user._id,
      permissions: invitation.permissions || [],
    });
    await company.save();
  }

  // Update user's company and role
  user.company = company._id;
  user.role = 'employer';
  user.isEmailVerified = true;
  await user.save();

  // Mark invitation as accepted
  invitation.status = 'accepted';
  await invitation.save();

  // Generate tokens for immediate login
  const tokens = generateTokenPair(user);
  if (typeof User.hashToken === 'function') {
    user.refreshToken = User.hashToken(tokens.refreshToken);
    await user.save();
  }

  return {
    user: user.toJSON(),
    company: company.toJSON(),
    tokens,
  };
}

/**
 * Auto-match an existing company by corporate domain or email.
 * @param {string} domainOrEmail
 * @returns {Promise<{ matched: boolean, company?: object, reason?: string }>}
 */
async function matchCompanyByDomain(domainOrEmail) {
  const { extractDomain, isFreeEmailProvider } = require('../utils/emailDomain');

  if (!domainOrEmail || typeof domainOrEmail !== 'string') {
    throw ApiError.badRequest('Domain or corporate email address is required');
  }

  const domain = extractDomain(domainOrEmail);
  if (!domain) {
    return { matched: false, reason: 'invalid_domain' };
  }

  if (isFreeEmailProvider(`test@${domain}`)) {
    return { matched: false, reason: 'consumer_domain' };
  }

  const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const company = await Company.findOne({
    website: { $regex: new RegExp(`(^|://)(www\\.)?${escapedDomain}(/|$)`, 'i') },
  }).select('_id name slug logoUrl countryCode verificationStatus owner');

  if (!company) {
    return { matched: false };
  }

  return {
    matched: true,
    company: {
      _id: company._id,
      name: company.name,
      slug: company.slug,
      logoUrl: company.logoUrl || '',
      countryCode: company.countryCode,
      verificationStatus: company.verificationStatus,
    },
  };
}

/**
 * Request to join a company when corporate domains match.
 * Dispatches an email notification to the company owner.
 * @param {string} companyId
 * @param {string} userId
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function requestToJoinCompany(companyId, userId) {
  const emailService = require('./email.service');

  const company = await Company.findById(companyId);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (company.isTeamMember(user._id)) {
    throw ApiError.conflict('You are already a team member or owner of this company');
  }

  const owner = await User.findById(company.owner);
  if (!owner) {
    throw ApiError.notFound('Company owner could not be found');
  }

  emailService
    .sendJoinRequestNotification({
      ownerEmail: owner.email,
      companyName: company.name,
      requesterName: user.getFullName ? user.getFullName() : `${user.firstName} ${user.lastName}`,
      requesterEmail: user.email,
    })
    .catch((err) => logger.error('Failed to dispatch join request notification', { error: err.message }));

  return {
    success: true,
    message: `A request to join ${company.name} has been sent to the company administrator.`,
  };
}

module.exports = {
  registerCompany,
  getCompanyById,
  updateCompany,
  addTeamMember,
  updateTeamMemberPermissions,
  removeTeamMember,
  inviteTeamMember,
  getCompanyInvitations,
  revokeInvitation,
  getInvitationByToken,
  acceptInvitation,
  matchCompanyByDomain,
  requestToJoinCompany,
  uploadCompanyDocument,
  getCompanyDocuments,
  sendCompanyPhoneOtp,
  verifyCompanyPhoneOtp,
};
