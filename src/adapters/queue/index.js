const config = require('../../config');

/**
 * Queue adapter factory.
 * Returns a singleton queue adapter based on QUEUE_DRIVER env var.
 *
 * Supported drivers:
 * - 'memory' (default): In-memory stub
 * - 'bullmq': BullMQ + Redis (production)
 */

let instance = null;

/**
 * Get the queue adapter singleton.
 * @returns {import('./queue.adapter')}
 */
function getQueueAdapter() {
  if (instance) return instance;

  const driver = config.queue.driver;

  switch (driver) {
    case 'bullmq': {
      const BullMQAdapter = require('./bullmq.adapter');
      instance = new BullMQAdapter();
      break;
    }
    case 'memory':
    default: {
      const MemoryQueueAdapter = require('./memory.adapter');
      instance = new MemoryQueueAdapter();
      break;
    }
  }

  return instance;
}

module.exports = { getQueueAdapter };
