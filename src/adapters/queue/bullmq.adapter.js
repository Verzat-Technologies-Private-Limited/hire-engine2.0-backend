const QueueAdapter = require('./queue.adapter');
const logger = require('../../config/logger');
const config = require('../../config');

/**
 * BullMQ queue adapter.
 * Uses BullMQ with Redis for production job processing.
 *
 * This adapter is loaded only when QUEUE_DRIVER=bullmq.
 * Requires: npm install bullmq ioredis
 */
class BullMQAdapter extends QueueAdapter {
  constructor() {
    super();
    let BullMQ;
    try {
      BullMQ = require('bullmq');
    } catch {
      throw new Error(
        'BullMQ adapter requires "bullmq" and "ioredis" packages. ' +
          'Install them with: npm install bullmq ioredis'
      );
    }

    this._BullMQ = BullMQ;
    this._connection = { url: config.cache.redisUrl };
    /** @type {Map<string, import('bullmq').Queue>} */
    this._queues = new Map();
    /** @type {Array<import('bullmq').Worker>} */
    this._workers = [];

    logger.info('Queue adapter initialized: BullMQ');
  }

  /**
   * Get or create a BullMQ Queue instance for the given name.
   * @param {string} queueName
   * @returns {import('bullmq').Queue}
   */
  _getQueue(queueName) {
    if (!this._queues.has(queueName)) {
      const queue = new this._BullMQ.Queue(queueName, {
        connection: this._connection,
      });
      this._queues.set(queueName, queue);
    }
    return this._queues.get(queueName);
  }

  async addJob(queueName, jobName, data, options = {}) {
    const queue = this._getQueue(queueName);

    const jobOptions = {};
    if (options.delay) jobOptions.delay = options.delay;
    if (options.attempts) {
      jobOptions.attempts = options.attempts;
      jobOptions.backoff = options.backoff || { type: 'exponential', delay: 1000 };
    }
    if (options.priority) jobOptions.priority = options.priority;

    const job = await queue.add(jobName, data, jobOptions);
    logger.debug(`[BullMQ] Job added: ${queueName}/${jobName} (id: ${job.id})`);
    return { id: job.id };
  }

  async processJobs(queueName, handler) {
    const worker = new this._BullMQ.Worker(
      queueName,
      async (job) => {
        await handler({ id: job.id, name: job.name, data: job.data });
      },
      {
        connection: this._connection,
        concurrency: 5,
      }
    );

    worker.on('completed', (job) => {
      logger.debug(`[BullMQ] Job completed: ${queueName}/${job.name} (id: ${job.id})`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`[BullMQ] Job failed: ${queueName}/${job?.name} (id: ${job?.id})`, {
        error: err.message,
      });
    });

    this._workers.push(worker);
    logger.info(`[BullMQ] Worker started for queue: ${queueName}`);
  }

  async shutdown() {
    // Close all workers
    await Promise.all(this._workers.map((w) => w.close()));
    // Close all queues
    await Promise.all([...this._queues.values()].map((q) => q.close()));
    this._workers = [];
    this._queues.clear();
    logger.info('BullMQ shut down');
  }
}

module.exports = BullMQAdapter;
