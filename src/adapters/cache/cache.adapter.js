/**
 * Cache adapter interface (abstract base class).
 * All cache implementations must extend this class.
 *
 * Implementations:
 * - MemoryCacheAdapter: In-memory Map with TTL (default/stub)
 * - RedisCacheAdapter: Redis via ioredis (production)
 */
class CacheAdapter {
  /**
   * Get a value by key.
   * @param {string} key
   * @returns {Promise<*>} Parsed value or null
   */
  async get(_key) {
    throw new Error('CacheAdapter.get() must be implemented');
  }

  /**
   * Set a key-value pair with optional TTL.
   * @param {string} key
   * @param {*} value - Will be JSON-serialized
   * @param {number} [ttlSeconds] - Time to live in seconds
   * @returns {Promise<void>}
   */
  async set(_key, _value, _ttlSeconds) {
    throw new Error('CacheAdapter.set() must be implemented');
  }

  /**
   * Delete a key.
   * @param {string} key
   * @returns {Promise<void>}
   */
  async del(_key) {
    throw new Error('CacheAdapter.del() must be implemented');
  }

  /**
   * Check if a key exists.
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async exists(_key) {
    throw new Error('CacheAdapter.exists() must be implemented');
  }

  /**
   * Delete all keys matching a pattern.
   * @param {string} pattern - Glob pattern (e.g., 'user:*')
   * @returns {Promise<void>}
   */
  async flushPattern(_pattern) {
    throw new Error('CacheAdapter.flushPattern() must be implemented');
  }

  /**
   * Gracefully close the connection.
   * @returns {Promise<void>}
   */
  async disconnect() {
    // Default no-op — override in implementations that hold connections
  }
}

module.exports = CacheAdapter;
