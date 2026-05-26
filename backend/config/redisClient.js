// backend/config/redisClient.js
// ──────────────────────────────────────────────────────────────────────────────
// Singleton Redis client with graceful fallback.
// If REDIS_URL is not set or Redis is unreachable, all operations return null
// and the server continues using in-memory state (no hard crash).
//
// Usage:
//   const redis = require('./config/redisClient');
//   const client = redis.getClient();      // for GET/SET/DEL
//   const pub    = redis.getPublisher();    // dedicated pub connection
//   const sub    = redis.getSubscriber();   // dedicated sub connection
//   const ok     = redis.isAvailable();     // boolean health check
// ──────────────────────────────────────────────────────────────────────────────

let Redis;
try {
  Redis = require('ioredis');
} catch {
  Redis = null;
}

class RedisClient {
  constructor() {
    this._client = null;
    this._publisher = null;
    this._subscriber = null;
    this._available = false;
    this._connecting = false;
  }

  /**
   * Connect to Redis. Safe to call multiple times (idempotent).
   * @returns {Promise<boolean>} true if connected, false if unavailable
   */
  async connect() {
    if (this._available) return true;
    if (this._connecting) return false;

    const url = process.env.REDIS_URL;
    if (!url) {
      console.log('ℹ️  REDIS_URL not set — Redis disabled (using in-memory fallback)');
      return false;
    }

    if (!Redis) {
      console.warn('⚠️  ioredis package not installed — Redis disabled');
      return false;
    }

    this._connecting = true;

    try {
      const opts = {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 5) {
            console.warn('⚠️  Redis: max retries exceeded, giving up');
            return null; // stop retrying
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
        enableReadyCheck: true,
        connectTimeout: 5000,
      };

      this._client = new Redis(url, opts);
      this._publisher = new Redis(url, opts);
      this._subscriber = new Redis(url, opts);

      // Connect all three
      await Promise.all([
        this._client.connect(),
        this._publisher.connect(),
        this._subscriber.connect(),
      ]);

      // Verify connectivity
      await this._client.ping();

      this._available = true;
      this._connecting = false;

      // Handle disconnect/reconnect
      this._client.on('error', (err) => {
        console.error('❌ Redis client error:', err.message);
        this._available = false;
      });
      this._client.on('ready', () => {
        this._available = true;
      });

      console.log('');
      console.log('╔════════════════════════════════════════════╗');
      console.log('║   ✅ Redis Connected                      ║');
      console.log('╚════════════════════════════════════════════╝');
      console.log(`   URL: ${url.replace(/\/\/.*@/, '//<credentials>@')}`);
      console.log('');

      return true;
    } catch (err) {
      console.warn(`⚠️  Redis connection failed: ${err.message}`);
      console.warn('   Falling back to in-memory state');
      this._cleanup();
      this._connecting = false;
      return false;
    }
  }

  /** @returns {import('ioredis').Redis | null} */
  getClient() {
    return this._available ? this._client : null;
  }

  /** @returns {import('ioredis').Redis | null} */
  getPublisher() {
    return this._available ? this._publisher : null;
  }

  /** @returns {import('ioredis').Redis | null} */
  getSubscriber() {
    return this._available ? this._subscriber : null;
  }

  /** @returns {boolean} */
  isAvailable() {
    return this._available;
  }

  /**
   * Graceful shutdown — call from SIGINT/SIGTERM handlers
   */
  async close() {
    this._available = false;
    this._cleanup();
    console.log('🔌 Redis connections closed');
  }

  _cleanup() {
    const conns = [this._client, this._publisher, this._subscriber];
    for (const conn of conns) {
      if (conn) {
        try { conn.disconnect(); } catch { /* ignore */ }
      }
    }
    this._client = null;
    this._publisher = null;
    this._subscriber = null;
    this._available = false;
  }
}

// Export singleton
module.exports = new RedisClient();
