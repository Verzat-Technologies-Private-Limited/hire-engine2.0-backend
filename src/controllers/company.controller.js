const companyService = require('../services/company.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const registerCompany = asyncHandler(async (req, res) => {
  const company = await companyService.registerCompany(req.user._id, req.body, req.countryPlugin);
  ApiResponse.created('Company registered successfully. Pending business verification.', company).send(res);
});

const getCompany = asyncHandler(async (req, res) => {
  const company = await companyService.getCompanyById(req.params.id);
  ApiResponse.ok('Company profile retrieved successfully', company).send(res);
});

const updateCompany = asyncHandler(async (req, res) => {
  const updated = await companyService.updateCompany(req.params.id, req.user._id, req.body);
  ApiResponse.ok('Company profile updated successfully', updated).send(res);
});

const addTeamMember = asyncHandler(async (req, res) => {
  const company = await companyService.addTeamMember(req.params.id, req.user._id, req.body);
  ApiResponse.created('Team member added successfully', company).send(res);
});

const updateTeamMemberPermissions = asyncHandler(async (req, res) => {
  const { permissions } = req.body;
  const company = await companyService.updateTeamMemberPermissions(
    req.params.id,
    req.user._id,
    req.params.userId,
    permissions
  );
  ApiResponse.ok('Team member permissions updated successfully', company).send(res);
});

const removeTeamMember = asyncHandler(async (req, res) => {
  await companyService.removeTeamMember(req.params.id, req.user._id, req.params.userId);
  ApiResponse.ok('Team member removed successfully').send(res);
});

const uploadDocument = asyncHandler(async (req, res) => {
  const result = await companyService.uploadCompanyDocument(
    req.params.id,
    req.user._id,
    req.file,
    req.body
  );
  ApiResponse.created('Company document uploaded successfully', result).send(res);
});

const getDocuments = asyncHandler(async (req, res) => {
  const result = await companyService.getCompanyDocuments(req.params.id, req.user._id);
  ApiResponse.ok('Company documents and verification checklist retrieved', result).send(res);
});

const sendPhoneOtp = asyncHandler(async (req, res) => {
  const result = await companyService.sendCompanyPhoneOtp(req.body.phone);
  ApiResponse.ok(result.message, result).send(res);
});

const verifyPhoneOtp = asyncHandler(async (req, res) => {
  const updated = await companyService.verifyCompanyPhoneOtp(
    req.params.id,
    req.user._id,
    req.body.phone,
    req.body.otp
  );
  ApiResponse.ok('Company phone verified successfully', updated).send(res);
});

const inviteTeamMember = asyncHandler(async (req, res) => {
  const invitation = await companyService.inviteTeamMember(req.params.id, req.user._id, req.body);
  ApiResponse.created('Team invitation sent successfully', invitation).send(res);
});

const getInvitations = asyncHandler(async (req, res) => {
  const invitations = await companyService.getCompanyInvitations(req.params.id, req.user._id);
  ApiResponse.ok('Company invitations retrieved successfully', invitations).send(res);
});

const revokeInvitation = asyncHandler(async (req, res) => {
  const invitation = await companyService.revokeInvitation(req.params.id, req.user._id, req.params.inviteId);
  ApiResponse.ok('Invitation revoked successfully', invitation).send(res);
});

const getInvitationByToken = asyncHandler(async (req, res) => {
  const invitation = await companyService.getInvitationByToken(req.params.token);
  ApiResponse.ok('Invitation retrieved successfully', invitation).send(res);
});

const acceptInvitation = asyncHandler(async (req, res) => {
  const result = await companyService.acceptInvitation(req.params.token, req.body, req.user);
  ApiResponse.ok('Invitation accepted successfully', result).send(res);
});

const matchDomain = asyncHandler(async (req, res) => {
  const result = await companyService.matchCompanyByDomain(req.query.domain);
  ApiResponse.ok('Domain lookup result', result).send(res);
});

const requestJoin = asyncHandler(async (req, res) => {
  const result = await companyService.requestToJoinCompany(req.params.id, req.user._id);
  ApiResponse.ok(result.message, result).send(res);
});

module.exports = {
  registerCompany,
  getCompany,
  updateCompany,
  addTeamMember,
  updateTeamMemberPermissions,
  removeTeamMember,
  inviteTeamMember,
  getInvitations,
  revokeInvitation,
  getInvitationByToken,
  acceptInvitation,
  matchDomain,
  requestJoin,
  uploadDocument,
  getDocuments,
  sendPhoneOtp,
  verifyPhoneOtp,
};
