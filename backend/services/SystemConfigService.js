/**
 * SystemConfigService.js
 * Key-value configuration store backed by the 'system_config' collection in the 'rac' DB.
 *
 * Features:
 *  - In-memory cache with 60s TTL (avoids hitting DB on every algorithm tick)
 *  - Idempotent seedDefaults() — safe to call on every server startup
 *  - set() invalidates cache immediately so changes are reflected in next get()
 *
 * Usage:
 *   const SystemConfigService = require('./SystemConfigService');
 *   const val = await SystemConfigService.get('rac_settings');
 *   await SystemConfigService.set('rac_settings', { ... }, 'admin@rac');
 */

const db = require('../config/db');
const { COLLECTIONS } = require('../config/collections');

// Default values seeded on first startup
const DEFAULTS = [
    {
        key: 'rac_settings',
        value: {
            MIN_JOURNEY_DISTANCE_KM:   50,    // Min km remaining for a RAC→CNF upgrade
            LOOK_AHEAD_SEGMENTS:        3,     // Stations ahead to look for RAC eligibility
            NO_SHOW_TIMEOUT_MINUTES:   30,    // Minutes after departure to auto-mark no-show
            MAX_AUTO_UPGRADES_PER_STATION: 10, // Safety cap on auto-upgrades per station
            ENABLE_CROSS_CLASS_UPGRADE: false, // Allow upgrades across coach classes
        },
        description: 'Core RAC algorithm parameters',
    },
    {
        key: 'app_version',
        value: { version: '2.0.0', phase: 2, releaseDate: '2026-05-28' },
        description: 'Current application version metadata',
    },
    {
        key: 'maintenance_mode',
        value: { enabled: false, message: '' },
        description: 'Toggle maintenance mode and set a user-facing message',
    },
    {
        key: 'allowed_origins',
        value: [
            'http://localhost:3000',
            'http://localhost:5174',
            'http://localhost:5175',
        ],
        description: 'CORS allowed origins (supplementary to .env)',
    },
    {
        key: 'analytics_config',
        value: {
            dailyCronEnabled: true,
            retentionDays: 90,
            aggregationMode: 'full', // 'full' or 'incremental'
        },
        description: 'Analytics aggregation job settings',
    },
];

// ─── In-memory cache ───────────────────────────────────────────────────────────
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const _cache = new Map(); // key → { value, expiresAt }

function _getCached(key) {
    const entry = _cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        _cache.delete(key);
        return null;
    }
    return entry.value;
}

function _setCache(key, value) {
    _cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function _invalidateCache(key) {
    if (key) _cache.delete(key);
    else _cache.clear();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function _getCollection() {
    const racDb = await db.getDb();
    return racDb.collection(COLLECTIONS.SYSTEM_CONFIG);
}

// ─── Public API ───────────────────────────────────────────────────────────────
const SystemConfigService = {

    /**
     * Get a config value by key.
     * Returns the cached value if fresh, otherwise hits MongoDB.
     * @param {string} key
     * @returns {Promise<any>} The stored value, or null if key doesn't exist.
     */
    async get(key) {
        const cached = _getCached(key);
        if (cached !== null) return cached;

        const col = await _getCollection();
        const doc = await col.findOne({ key });
        if (!doc) return null;

        _setCache(key, doc.value);
        return doc.value;
    },

    /**
     * Set (upsert) a config value.
     * Immediately invalidates the cache entry for this key.
     * @param {string} key
     * @param {*}      value
     * @param {string} [updatedBy='system']
     */
    async set(key, value, updatedBy = 'system') {
        const col = await _getCollection();
        await col.updateOne(
            { key },
            {
                $set: {
                    key,
                    value,
                    updatedBy,
                    updatedAt: new Date(),
                },
                $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true }
        );
        _invalidateCache(key);
        console.log(`⚙️  SystemConfig: '${key}' updated by ${updatedBy}`);
    },

    /**
     * Get all config documents (for admin panel).
     * @returns {Promise<Array>}
     */
    async getAll() {
        const col = await _getCollection();
        return col.find({}).sort({ key: 1 }).toArray();
    },

    /**
     * Idempotent seed of default values.
     * Uses $setOnInsert so existing admin customisations are NEVER overwritten.
     * Safe to call on every server startup.
     */
    async seedDefaults() {
        try {
            const col = await _getCollection();
            const ops = DEFAULTS.map(({ key, value, description }) => ({
                updateOne: {
                    filter: { key },
                    update: {
                        $setOnInsert: {
                            key,
                            value,
                            description,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            updatedBy: 'system:seed',
                        },
                    },
                    upsert: true,
                },
            }));

            const result = await col.bulkWrite(ops, { ordered: false });
            console.log(`✅ SystemConfig seeded — ${result.upsertedCount} new default(s) inserted.`);
        } catch (err) {
            console.warn('⚠️  SystemConfigService.seedDefaults() failed (non-critical):', err.message);
        }
    },

    /**
     * Flush the entire in-memory cache (useful in tests).
     */
    clearCache() {
        _invalidateCache(null);
    },
};

module.exports = SystemConfigService;
