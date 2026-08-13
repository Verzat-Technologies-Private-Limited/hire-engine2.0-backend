const CacheAdapter = require('./cache.adapter');
const logger = require('../../config/logger');

/**
 * Redis cache adapter.
 * Uses ioredis for production caching with full TTL support.
 *
 * This adapter is loaded only when CACHE_DRIVER=redis.
 * ioredis is a peer dependency — install it when ready for production Redis.
 */
class RedisCacheAdapter extends CacheAdapter {
  /**
   * @param {string} redisUrl - Redis connection URL
   */
  constructor(redisUrl) {
    super();
    // Lazy-require ioredis so the app doesn't crash when using memory adapter
    let IORedis;
    try {
      IORedis = require('ioredis');
    } catch {
      throw new Error(
        'Redis adapter requires "ioredis" package. Install it with: npm install ioredis'
      );
    }

    this._client = new IORedis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 5) return null; // Stop retrying
        return Math.min(times * 200, 2000);
      },
    });

    this._client.on('connect', () => logger.info('Redis cache connected'));
    this._client.on('error', (err) => logger.error('Redis cache error', { error: err.message }));
    this._client.on('reconnecting', () => logger.warn('Redis cache reconnecting...'));
  }

  async get(key) {
    const raw = await this._client.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  async set(key, value, ttlSeconds) {
    const serialized = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this._client.setex(key, ttlSeconds, serialized);
    } else {
      await this._client.set(key, serialized);
    }
  }

  async del(key) {
    await this._client.del(key);
  }

  async exists(key) {
    const result = await this._client.exists(key);
    return result === 1;
  }

  async flushPattern(pattern) {
    const keys = await this._client.keys(pattern);
    if (keys.length > 0) {
      await this._client.del(...keys);
    }
  }

  async disconnect() {
    await this._client.quit();
    logger.info('Redis cache disconnected');
  }
}

module.exports = RedisCacheAdapter;
