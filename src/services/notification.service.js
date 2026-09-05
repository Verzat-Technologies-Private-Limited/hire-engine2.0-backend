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

/**
 * Create a single notification for a user.
 * @param {string} userId
 * @param {object} data - { type, title, message, relatedModel, relatedId, actionUrl }
 * @returns {Promise<object>}
 */
async function createNotification(userId, data) {
  return Notification.create({
    user: userId,
    type: data.type,
    title: data.title,
    message: data.message,
    relatedModel: data.relatedModel || '',
    relatedId: data.relatedId || null,
    actionUrl: data.actionUrl || '',
  });
}

/**
 * Broadcast a notification to all administrators.
 * Used for SLA alerts, new employer registrations pending review, etc.
 * @param {string} type
 * @param {string} title
 * @param {string} message
 * @param {object} [meta] - { relatedModel, relatedId, actionUrl }
 * @returns {Promise<Array>}
 */
async function notifyAdmins(type, title, message, meta = {}) {
  try {
    const User = require('../models/User');
    const logger = require('../config/logger');
    const admins = await User.find({ role: 'admin' }, '_id');
    if (!admins || admins.length === 0) return [];

    const docs = admins.map((admin) => ({
      user: admin._id,
      type,
      title,
      message,
      relatedModel: meta.relatedModel || '',
      relatedId: meta.relatedId || null,
      actionUrl: meta.actionUrl || '',
    }));

    return await Notification.insertMany(docs);
  } catch (err) {
    const logger = require('../config/logger');
    logger.error('Failed to broadcast notification to admins', { error: err.message });
    return [];
  }
}

module.exports = {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
  notifyAdmins,
};
