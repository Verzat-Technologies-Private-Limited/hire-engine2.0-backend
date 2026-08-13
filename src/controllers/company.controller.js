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

module.exports = {
  registerCompany,
  getCompany,
  updateCompany,
  addTeamMember,
  updateTeamMemberPermissions,
  removeTeamMember,
};
