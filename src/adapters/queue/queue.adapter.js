/**
 * Queue adapter interface (abstract base class).
 * All queue implementations must extend this class.
 *
 * Implementations:
 * - MemoryQueueAdapter: In-memory stub with setTimeout processing
 * - BullMQAdapter: BullMQ + Redis (production)
 */
class QueueAdapter {
  /**
   * Add a job to a named queue.
   * @param {string} queueName - Queue identifier
   * @param {string} jobName - Job type/name
   * @param {object} data - Job payload
   * @param {object} [options] - Job options
   * @param {number} [options.delay] - Delay in ms before processing
   * @param {number} [options.attempts] - Number of retry attempts
   * @param {object} [options.backoff] - Backoff strategy { type, delay }
   * @param {string} [options.priority] - Job priority
   * @returns {Promise<{ id: string }>} Job identifier
   */
  async addJob(_queueName, _jobName, _data, _options) {
    throw new Error('QueueAdapter.addJob() must be implemented');
  }

  /**
   * Register a processor for a named queue.
   * @param {string} queueName - Queue to process
   * @param {Function} handler - async (job) => {} — receives { name, data }
   * @returns {Promise<void>}
   */
  async processJobs(_queueName, _handler) {
    throw new Error('QueueAdapter.processJobs() must be implemented');
  }

  /**
   * Gracefully shut down all queues and workers.
   * @returns {Promise<void>}
   */
  async shutdown() {
    // Default no-op
  }
}

module.exports = QueueAdapter;
