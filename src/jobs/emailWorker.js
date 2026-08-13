const { getQueueAdapter } = require('../adapters/queue');
const emailService = require('../services/email.service');
const logger = require('../config/logger');

const queueAdapter = getQueueAdapter();

/**
 * Worker handler for email delivery jobs.
 */
async function registerEmailWorker() {
  await queueAdapter.processJobs('emailWorker', async (job) => {
    logger.info(`[emailWorker] Processing email job: ${job.name} (id: ${job.id})`);
    
    if (job.name === 'sendEmail') {
      const { to, subject, html, text } = job.data;
      const { getEmailAdapter } = require('../adapters/email');
      const emailAdapter = getEmailAdapter();
      await emailAdapter.sendEmail({ to, subject, html, text });
    } else if (job.name === 'sendBulkEmail') {
      const { recipients, subject, html } = job.data;
      await emailService.sendBulkNotification(recipients, subject, html);
    }
  });

  logger.info('Email background worker registered');
}

module.exports = { registerEmailWorker };
