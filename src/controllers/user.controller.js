const userService = require('../services/user.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getProfile = asyncHandler(async (req, res) => {
  const profile = await userService.getUserProfile(req.user._id);
  ApiResponse.ok('Profile retrieved successfully', profile).send(res);
});

const updateProfile = asyncHandler(async (req, res) => {
  const updatedProfile = await userService.updateProfile(req.user._id, req.body);
  ApiResponse.ok('Profile updated successfully', updatedProfile).send(res);
});

const toggleVisibility = asyncHandler(async (req, res) => {
  const { visibility } = req.body;
  const updatedProfile = await userService.toggleVisibility(req.user._id, visibility);
  ApiResponse.ok(`Profile visibility set to ${visibility}`, updatedProfile).send(res);
});

const deleteAccount = asyncHandler(async (req, res) => {
  const result = await userService.requestGdprDeletion(req.user._id);
  ApiResponse.ok(result.message, result).send(res);
});

module.exports = {
  getProfile,
  updateProfile,
  toggleVisibility,
  deleteAccount,
};
