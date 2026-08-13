const EmailAdapter = require('./email.adapter');
const config = require('../../config');
const logger = require('../../config/logger');

/**
 * SendGrid email adapter.
 * Uses @sendgrid/mail for transactional email delivery.
 *
 * Requires: npm install @sendgrid/mail
 * (Already works via nodemailer with SendGrid SMTP, but the official SDK
 *  offers better bulk email support and template integration.)
 *
 * Falls back to nodemailer + SendGrid SMTP if the SDK is not available.
 */
class SendGridAdapter extends EmailAdapter {
  constructor() {
    super();
    this._useSdk = false;

    try {
      this._sgMail = require('@sendgrid/mail');
      this._sgMail.setApiKey(config.email.sendgridApiKey);
      this._useSdk = true;
      logger.info('Email adapter initialized: SendGrid (SDK)');
    } catch {
      // Fallback to nodemailer with SendGrid SMTP
      const nodemailer = require('nodemailer');
      this._transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: config.email.sendgridApiKey,
        },
      });
      logger.info('Email adapter initialized: SendGrid (SMTP via nodemailer)');
    }
  }

  async sendEmail({ to, subject, html, text, from, fromName, attachments }) {
    const sender = from || config.email.from;
    const senderName = fromName || config.email.fromName;

    if (this._useSdk) {
      const msg = {
        to,
        from: { email: sender, name: senderName },
        subject,
        html,
        text: text || '',
      };

      if (attachments?.length) {
        msg.attachments = attachments.map((a) => ({
          content: a.content.toString('base64'),
          filename: a.filename,
          disposition: 'attachment',
        }));
      }

      const [response] = await this._sgMail.send(msg);

      return {
        messageId: response?.headers?.['x-message-id'] || `sg_${Date.now()}`,
        status: 'sent',
      };
    }

    // Nodemailer fallback
    const mailOptions = {
      from: `${senderName} <${sender}>`,
      to,
      subject,
      html,
      text: text || '',
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    };

    const info = await this._transporter.sendMail(mailOptions);

    return {
      messageId: info.messageId,
      status: 'sent',
    };
  }

  async sendBulkEmail({ recipients, subject, html, text }) {
    let sent = 0;
    let failed = 0;

    if (this._useSdk) {
      // SendGrid SDK supports personalizations for bulk sending
      const messages = recipients.map((recipient) => {
        let personalizedSubject = subject;
        let personalizedHtml = html;
        let personalizedText = text || '';

        // Replace {{variable}} placeholders with substitution values
        if (recipient.substitutions) {
          for (const [key, value] of Object.entries(recipient.substitutions)) {
            const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            personalizedSubject = personalizedSubject.replace(placeholder, value);
            personalizedHtml = personalizedHtml.replace(placeholder, value);
            personalizedText = personalizedText.replace(placeholder, value);
          }
        }

        return {
          to: recipient.email,
          from: { email: config.email.from, name: config.email.fromName },
          subject: personalizedSubject,
          html: personalizedHtml,
          text: personalizedText,
        };
      });

      // SendGrid allows up to 1000 messages per API call
      const batchSize = 1000;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        try {
          await this._sgMail.send(batch);
          sent += batch.length;
        } catch (error) {
          logger.error('SendGrid bulk email batch failed', {
            batchStart: i,
            batchSize: batch.length,
            error: error.message,
          });
          failed += batch.length;
        }
      }
    } else {
      // Nodemailer fallback — send one by one
      for (const recipient of recipients) {
        try {
          await this.sendEmail({
            to: recipient.email,
            subject,
            html,
            text,
          });
          sent++;
        } catch (error) {
          logger.error('Bulk email send failed for recipient', {
            email: recipient.email,
            error: error.message,
          });
          failed++;
        }
      }
    }

    return { sent, failed };
  }
}

module.exports = SendGridAdapter;
