const { getQueueAdapter } = require('../adapters/queue');
const SavedSearch = require('../models/SavedSearch');
const Job = require('../models/Job');
const User = require('../models/User');
const emailService = require('../services/email.service');
const logger = require('../config/logger');

const queueAdapter = getQueueAdapter();

/**
 * Worker handler for saved search alert matching.
 */
async function registerAlertWorker() {
  await queueAdapter.processJobs('alertWorker', async (job) => {
    logger.info(`[alertWorker] Processing alert job: ${job.name} (id: ${job.id})`);

    if (job.name === 'matchSavedSearches') {
      const { jobId } = job.data;
      const newJob = await Job.findById(jobId).populate('company');
      if (!newJob || newJob.status !== 'active') return;

      // Find active saved searches with instant or daily alerts
      const savedSearches = await SavedSearch.find({
        isActive: true,
        searchType: 'jobs',
        emailAlert: true,
      }).populate('user');

      for (const search of savedSearches) {
        if (!search.user) continue;

        // Check keyword match
        let isMatch = true;
        if (search.filters?.keywords) {
          const keyword = search.filters.keywords.toLowerCase();
          const titleMatch = newJob.title.toLowerCase().includes(keyword);
          const descMatch = newJob.description.toLowerCase().includes(keyword);
          if (!titleMatch && !descMatch) isMatch = false;
        }

        if (isMatch) {
          // Send notification email
          const html = `
            <h3>New Job Alert Match: ${newJob.title}</h3>
            <p><strong>Company:</strong> ${newJob.company?.name || 'Company'}</p>
            <p><strong>Location:</strong> ${newJob.location?.city || ''}, ${newJob.location?.country || ''}</p>
            <p>${newJob.description.substring(0, 300)}...</p>
          `;
          await emailService.sendBulkNotification(
            [{ email: search.user.email }],
            `New Job Alert: ${newJob.title}`,
            html
          );

          search.lastNotifiedAt = new Date();
          await search.save();
        }
      }
    }
  });

  logger.info('Saved search alert background worker registered');
}

module.exports = { registerAlertWorker };
