const notificationService = require('../services/notification.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getUserNotifications(req.user._id, req.query);
  ApiResponse.ok('Notifications retrieved', result.docs, result.meta).send(res);
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markNotificationAsRead(req.params.id, req.user._id);
  ApiResponse.ok('Notification marked as read', notification).send(res);
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllNotificationsAsRead(req.user._id);
  ApiResponse.ok('All notifications marked as read').send(res);
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
