const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const { paginateQuery } = require('../utils/pagination');

async function getUserNotifications(userId, queryParams) {
  const filter = { user: userId };
  if (queryParams.unread === 'true') {
    filter.isRead = false;
  }

  const result = await paginateQuery(Notification, filter, queryParams, {
    sort: '-createdAt',
  });

  const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });
  result.meta.unreadCount = unreadCount;

  return result;
}

async function markNotificationAsRead(notificationId, userId) {
  const notification = await Notification.findOne({ _id: notificationId, user: userId });
  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return notification.toJSON();
}

async function markAllNotificationsAsRead(userId) {
  await Notification.updateMany(
    { user: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
}

module.exports = {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
