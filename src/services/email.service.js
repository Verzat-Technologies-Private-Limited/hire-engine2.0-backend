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

/**
 * Send company verification status decision email to the employer.
 * Driven by Country Plugin formatting and delivered via EmailAdapter.
 * @param {object} user - User document / recipient
 * @param {object} company - Company document
 * @param {string} status - VerificationStatus ('approved'|'rejected'|'information_required'|'under_review')
 * @param {string} [notes] - Admin notes / instructions
 * @param {object} [countryPlugin] - Optional Country Plugin
 */
async function sendCompanyVerificationDecision(user, company, status, notes = '', countryPlugin = null) {
  let plugin = countryPlugin;
  if (!plugin && company?.countryCode) {
    try {
      const { getCountryPlugin } = require('../plugins/countries');
      plugin = getCountryPlugin(company.countryCode);
    } catch {
      plugin = null;
    }
  }

  let formatted = null;
  if (plugin && typeof plugin.formatVerificationNotification === 'function') {
    formatted = plugin.formatVerificationNotification(status, notes, company);
  }

  const companyUrl = formatted?.actionUrl
    ? `${config.clientUrl}${formatted.actionUrl}`
    : `${config.clientUrl}/employer/company`;
  const companyName = company?.name || 'Your Company';
  const recipientName = user?.firstName || 'Employer';

  const subject = formatted?.emailSubject || `Company Verification Update - ${companyName}`;
  const title = formatted?.emailTitle || 'Company Verification Status Update';
  const message = formatted?.emailBody || `Your company verification status for ${companyName} has been updated to "${status}".`;
  const buttonText = formatted?.buttonText || 'Go to Employer Dashboard';
  const buttonColor = formatted?.buttonColor || '#2563EB';

  const notesHtml = notes
    ? `
      <div style="background-color: #F3F4F6; border-left: 4px solid ${buttonColor}; padding: 14px 18px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0 0 6px 0; font-weight: bold; color: #374151;">Compliance Officer Notes:</p>
        <p style="margin: 0; color: #4B5563; font-style: italic;">"${notes}"</p>
      </div>
    `
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1F2937;">
      <h2 style="color: #111827;">${title}</h2>
      <p style="font-size: 15px; line-height: 1.6;">${message}</p>
      ${notesHtml}
      <div style="margin: 30px 0;">
        <a href="${companyUrl}" style="background-color: ${buttonColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">${buttonText}</a>
      </div>
      <p style="font-size: 13px; color: #6B7280;">If you have questions, please reach out to our compliance and employer support team.</p>
    </div>
  `;

  return emailAdapter.sendEmail({
    to: user.email,
    subject,
    html,
    text: `${title}\n\n${message.replace(/<[^>]*>?/gm, '')}\n\n${notes ? `Notes: ${notes}\n\n` : ''}Access your dashboard: ${companyUrl}`,
  });
}

/**
 * Send job moderation status notification to employer / job poster.
 * Driven by country plugin formatting and dispatched via EmailAdapter.
 * @param {object} user - Job poster user
 * @param {object} job - Job document
 * @param {string} action - Moderation action ('active'|'paused'|'closed'|'expired'|'delete')
 * @param {string} reason - Admin rationale
 * @param {object} [countryPlugin] - Optional resolved CountryPlugin
 */
async function sendJobModerationNotice(user, job, action, reason = '', countryPlugin = null) {
  let plugin = countryPlugin;
  if (!plugin && job?.location?.country) {
    try {
      const { getCountryPlugin } = require('../plugins/countries');
      plugin = getCountryPlugin(job.location.country);
    } catch {
      plugin = null;
    }
  }

  const formatted =
    plugin && typeof plugin.formatJobModerationNotification === 'function'
      ? plugin.formatJobModerationNotification(action, reason, job)
      : null;

  const subject = formatted?.emailSubject || `Job Moderation Update - ${job.title}`;
  const title = formatted?.emailTitle || `Job Moderation Notice for "${job.title}"`;
  const bodyContent =
    formatted?.emailBody ||
    `<p>The status of your job listing <strong>${job.title}</strong> has been updated to <strong>${action}</strong>.</p>${
      reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''
    }`;
  const jobUrl = `${config.clientUrl}/employer/jobs/${job._id}`;
  const buttonText = formatted?.buttonText || 'View Job Listing';
  const buttonColor = formatted?.buttonColor || '#2563EB';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1F2937;">
      <h2 style="color: #111827;">${title}</h2>
      ${bodyContent}
      <div style="margin: 30px 0;">
        <a href="${jobUrl}" style="background-color: ${buttonColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">${buttonText}</a>
      </div>
      <p style="font-size: 13px; color: #6B7280;">If you believe this was done in error, please contact platform administration.</p>
    </div>
  `;

  return emailAdapter.sendEmail({
    to: user.email,
    subject,
    html,
    text: `${title}\n\nJob: ${job.title}\nStatus: ${action}\nReason: ${reason}\n\nView listing: ${jobUrl}`,
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendBulkNotification,
  sendCompanyVerificationDecision,
  sendJobModerationNotice,
};
