const config = require('../../config');

/**
 * Cache adapter factory.
 * Returns a singleton cache adapter instance based on CACHE_DRIVER env var.
 *
 * Supported drivers:
 * - 'memory' (default): In-memory Map with TTL — for dev/test
 * - 'redis': ioredis-backed — for production
 */

let instance = null;

/**
 * Get the cache adapter singleton.
 * @returns {import('./cache.adapter')}
 */
function getCacheAdapter() {
  if (instance) return instance;

  const driver = config.cache.driver;

  switch (driver) {
    case 'redis': {
      const RedisCacheAdapter = require('./redis.adapter');
      instance = new RedisCacheAdapter(config.cache.redisUrl);
      break;
    }
    case 'memory':
    default: {
      const MemoryCacheAdapter = require('./memory.adapter');
      instance = new MemoryCacheAdapter();
      break;
    }
  }

  return instance;
}

module.exports = { getCacheAdapter };
