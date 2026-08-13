const QueueAdapter = require('./queue.adapter');
const logger = require('../../config/logger');

/**
 * In-memory queue adapter (stub).
 * Processes jobs synchronously via setTimeout.
 * Suitable for development — NOT for production multi-instance deployments.
 */
class MemoryQueueAdapter extends QueueAdapter {
  constructor() {
    super();
    /** @type {Map<string, Function>} */
    this._handlers = new Map();
    /** @type {Array<NodeJS.Timeout>} */
    this._timers = [];
    this._jobCounter = 0;
    logger.info('Queue adapter initialized: in-memory (stub)');
  }

  async addJob(queueName, jobName, data, options = {}) {
    const jobId = `mem_job_${++this._jobCounter}`;
    const delay = options.delay || 0;

    logger.debug(`[MemoryQueue] Job added: ${queueName}/${jobName} (id: ${jobId})`, {
      delay,
      dataKeys: Object.keys(data),
    });

    const handler = this._handlers.get(queueName);

    if (handler) {
      const timer = setTimeout(async () => {
        try {
          logger.debug(`[MemoryQueue] Processing job: ${queueName}/${jobName} (id: ${jobId})`);
          await handler({ id: jobId, name: jobName, data });
          logger.debug(`[MemoryQueue] Job completed: ${jobId}`);
        } catch (error) {
          logger.error(`[MemoryQueue] Job failed: ${jobId}`, {
            error: error.message,
            queueName,
            jobName,
          });
        }
      }, delay);

      if (timer.unref) timer.unref();
      this._timers.push(timer);
    } else {
      logger.warn(`[MemoryQueue] No handler registered for queue: ${queueName}. Job ${jobId} dropped.`);
    }

    return { id: jobId };
  }

  async processJobs(queueName, handler) {
    this._handlers.set(queueName, handler);
    logger.info(`[MemoryQueue] Handler registered for queue: ${queueName}`);
  }

  async shutdown() {
    for (const timer of this._timers) {
      clearTimeout(timer);
    }
    this._timers = [];
    this._handlers.clear();
    logger.info('In-memory queue shut down');
  }
}

module.exports = MemoryQueueAdapter;
