const { getEmailAdapter } = require('../adapters/email');
const config = require('../config');
const logger = require('../config/logger');

/**
 * Service for handling application transactional emails.
 * Delegates actual delivery to the configured EmailAdapter (SendGrid or Console stub).
 */

const emailAdapter = getEmailAdapter();

/**
 * Send welcome / email verification email.
 * @param {object} user - User document
 * @param {string} token - Verification token
 */
async function sendVerificationEmail(user, token) {
  const verifyUrl = `${config.clientUrl}/verify-email?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to Hire Engine, ${user.firstName}!</h2>
      <p>Please verify your email address to complete your registration and activate your account.</p>
      <div style="margin: 30px 0;">
        <a href="${verifyUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link will expire in 24 hours.</p>
    </div>
  `;

  return emailAdapter.sendEmail({
    to: user.email,
    subject: 'Verify your email address - Hire Engine',
    html,
    text: `Welcome to Hire Engine! Please verify your email by opening this link: ${verifyUrl}`,
  });
}

/**
 * Send password reset email.
 * @param {object} user - User document
 * @param {string} token - Password reset token
 */
async function sendPasswordResetEmail(user, token) {
  const resetUrl = `${config.clientUrl}/reset-password?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>Hello ${user.firstName},</p>
      <p>We received a request to reset your Hire Engine password. Click the button below to set a new password:</p>
      <div style="margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request a password reset, please ignore this email.</p>
    </div>
  `;

  return emailAdapter.sendEmail({
    to: user.email,
    subject: 'Reset your password - Hire Engine',
    html,
    text: `Reset your password by opening this link: ${resetUrl}`,
  });
}

/**
 * Send bulk email using a template or raw content.
 * @param {Array<{email: string, name?: string, substitutions?: object}>} recipients
 * @param {string} subject
 * @param {string} html
 */
async function sendBulkNotification(recipients, subject, html) {
  return emailAdapter.sendBulkEmail({
    recipients,
    subject,
    html,
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendBulkNotification,
};
