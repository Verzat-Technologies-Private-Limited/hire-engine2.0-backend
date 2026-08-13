const CacheAdapter = require('./cache.adapter');
const logger = require('../../config/logger');

/**
 * In-memory cache adapter (stub).
 * Uses a Map with setTimeout-based TTL expiration.
 * Suitable for development and testing — NOT for multi-instance production.
 */
class MemoryCacheAdapter extends CacheAdapter {
  constructor() {
    super();
    /** @type {Map<string, { value: *, timer: NodeJS.Timeout|null }>} */
    this._store = new Map();
    logger.info('Cache adapter initialized: in-memory (stub)');
  }

  async get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    return entry.value;
  }

  async set(key, value, ttlSeconds) {
    // Clear any existing timer for this key
    const existing = this._store.get(key);
    if (existing?.timer) {
      clearTimeout(existing.timer);
    }

    let timer = null;
    if (ttlSeconds && ttlSeconds > 0) {
      timer = setTimeout(() => {
        this._store.delete(key);
      }, ttlSeconds * 1000);

      // Don't let the timer prevent Node from exiting
      if (timer.unref) timer.unref();
    }

    this._store.set(key, { value, timer });
  }

  async del(key) {
    const entry = this._store.get(key);
    if (entry?.timer) {
      clearTimeout(entry.timer);
    }
    this._store.delete(key);
  }

  async exists(key) {
    return this._store.has(key);
  }

  async flushPattern(pattern) {
    // Convert glob pattern to regex (simple: only supports trailing *)
    const regexStr = `^${pattern.replace(/\*/g, '.*')}$`;
    const regex = new RegExp(regexStr);

    for (const key of this._store.keys()) {
      if (regex.test(key)) {
        const entry = this._store.get(key);
        if (entry?.timer) clearTimeout(entry.timer);
        this._store.delete(key);
      }
    }
  }

  async disconnect() {
    // Clear all timers
    for (const entry of this._store.values()) {
      if (entry?.timer) clearTimeout(entry.timer);
    }
    this._store.clear();
    logger.info('In-memory cache cleared and disconnected');
  }
}

module.exports = MemoryCacheAdapter;
