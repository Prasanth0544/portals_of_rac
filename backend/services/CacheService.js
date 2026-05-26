// backend/services/CacheService.js
// Caching layer — uses Redis when available, falls back to node-cache (in-memory)

const NodeCache = require('node-cache');

// In-memory fallback config
const cacheConfig = {
    trainState: { stdTTL: 30, checkperiod: 60 },
    passengers: { stdTTL: 60, checkperiod: 120 },
    reallocation: { stdTTL: 120, checkperiod: 180 },
    stats: { stdTTL: 15, checkperiod: 30 },
    eligibility: { stdTTL: 120, checkperiod: 180 }
};

// TTL values in seconds for Redis
const redisTTL = {
    trainState: 30,
    passengers: 60,
    reallocation: 120,
    stats: 15,
    eligibility: 120
};

class CacheService {
    constructor() {
        // In-memory fallback caches
        this._memTrainState = new NodeCache(cacheConfig.trainState);
        this._memPassengers = new NodeCache(cacheConfig.passengers);
        this._memReallocation = new NodeCache(cacheConfig.reallocation);
        this._memStats = new NodeCache(cacheConfig.stats);
        this._memEligibility = new NodeCache(cacheConfig.eligibility);

        this._redis = null;
        this.metrics = { hits: 0, misses: 0, sets: 0, deletes: 0 };
        console.log('📦 CacheService initialized');
    }

    /** Call once after Redis connects. Safe to skip — falls back to node-cache. */
    attachRedis(redisClient) {
        this._redis = redisClient;
        if (redisClient) console.log('📦 CacheService: Redis backend attached');
    }

    _getRedis() {
        if (!this._redis) {
            try {
                const rc = require('../config/redisClient');
                if (rc.isAvailable()) this._redis = rc.getClient();
            } catch { /* ignore */ }
        }
        return this._redis;
    }

    generateKey(module, entity, identifier) {
        return `cache:${module}:${entity}:${identifier}`;
    }

    // ═══════ Generic get/set with dual backend ═══════

    async _get(memCache, key) {
        const redis = this._getRedis();
        if (redis) {
            try {
                const val = await redis.get(key);
                if (val !== null) { this.metrics.hits++; return JSON.parse(val); }
                this.metrics.misses++;
                return null;
            } catch { /* fall through to memory */ }
        }
        const val = memCache.get(key);
        if (val !== undefined) { this.metrics.hits++; return val; }
        this.metrics.misses++;
        return null;
    }

    async _set(memCache, key, data, ttl) {
        this.metrics.sets++;
        memCache.set(key, data);
        const redis = this._getRedis();
        if (redis) {
            try { await redis.set(key, JSON.stringify(data), 'EX', ttl); } catch { /* ignore */ }
        }
    }

    async _del(memCache, key) {
        this.metrics.deletes++;
        memCache.del(key);
        const redis = this._getRedis();
        if (redis) {
            try { await redis.del(key); } catch { /* ignore */ }
        }
    }

    async _delPattern(memCache, pattern) {
        const memKeys = memCache.keys().filter(k => k.includes(pattern));
        memKeys.forEach(k => memCache.del(k));
        this.metrics.deletes += memKeys.length;
        const redis = this._getRedis();
        if (redis) {
            try {
                const keys = await redis.keys(`*${pattern}*`);
                if (keys.length > 0) await redis.del(...keys);
            } catch { /* ignore */ }
        }
    }

    // ═══════ Train State Cache ═══════

    getTrainState(trainNo) {
        const key = this.generateKey('train', 'state', trainNo);
        // Sync path for backward compat — check memory first
        const val = this._memTrainState.get(key);
        if (val !== undefined) { this.metrics.hits++; return val; }
        this.metrics.misses++;
        return null;
    }

    setTrainState(trainNo, data) {
        const key = this.generateKey('train', 'state', trainNo);
        this._set(this._memTrainState, key, data, redisTTL.trainState);
    }

    invalidateTrainState(trainNo) {
        const key = this.generateKey('train', 'state', trainNo);
        this._del(this._memTrainState, key);
    }

    // ═══════ Passenger Cache ═══════

    getPassengers(trainNo, filter = 'all') {
        const key = this.generateKey('passengers', trainNo, filter);
        const val = this._memPassengers.get(key);
        if (val !== undefined) { this.metrics.hits++; return val; }
        this.metrics.misses++;
        return null;
    }

    setPassengers(trainNo, filter, data) {
        const key = this.generateKey('passengers', trainNo, filter);
        this._set(this._memPassengers, key, data, redisTTL.passengers);
    }

    invalidatePassengers(trainNo) {
        this._delPattern(this._memPassengers, `:${trainNo}:`);
    }

    // ═══════ Stats Cache ═══════

    getStats(trainNo) {
        const key = this.generateKey('stats', 'train', trainNo);
        const val = this._memStats.get(key);
        if (val !== undefined) { this.metrics.hits++; return val; }
        this.metrics.misses++;
        return null;
    }

    setStats(trainNo, data) {
        const key = this.generateKey('stats', 'train', trainNo);
        this._set(this._memStats, key, data, redisTTL.stats);
    }

    invalidateStats(trainNo) {
        const key = this.generateKey('stats', 'train', trainNo);
        this._del(this._memStats, key);
    }

    // ═══════ Reallocation Cache ═══════

    getReallocation(trainNo, stationCode) {
        const key = this.generateKey('reallocation', trainNo, stationCode);
        const val = this._memReallocation.get(key);
        if (val !== undefined) { this.metrics.hits++; return val; }
        this.metrics.misses++;
        return null;
    }

    setReallocation(trainNo, stationCode, data) {
        const key = this.generateKey('reallocation', trainNo, stationCode);
        this._set(this._memReallocation, key, data, redisTTL.reallocation);
    }

    invalidateReallocation(trainNo) {
        this._delPattern(this._memReallocation, `:${trainNo}:`);
    }

    // ═══════ Eligibility Cache ═══════

    getEligibility(trainNo, stationCode) {
        const key = this.generateKey('eligibility', trainNo, stationCode);
        const val = this._memEligibility.get(key);
        if (val !== undefined) { this.metrics.hits++; return val; }
        this.metrics.misses++;
        return null;
    }

    setEligibility(trainNo, stationCode, data) {
        const key = this.generateKey('eligibility', trainNo, stationCode);
        this._set(this._memEligibility, key, data, redisTTL.eligibility);
    }

    invalidateEligibility(trainNo) {
        this._delPattern(this._memEligibility, `:${trainNo}:`);
    }

    // ═══════ Bulk Invalidation ═══════

    invalidateAllForTrain(trainNo) {
        this.invalidateTrainState(trainNo);
        this.invalidatePassengers(trainNo);
        this.invalidateStats(trainNo);
        this.invalidateReallocation(trainNo);
        this.invalidateEligibility(trainNo);
        console.log(`🗑️ Cache invalidated for train ${trainNo}`);
    }

    flushAll() {
        this._memTrainState.flushAll();
        this._memPassengers.flushAll();
        this._memReallocation.flushAll();
        this._memStats.flushAll();
        this._memEligibility.flushAll();
        const redis = this._getRedis();
        if (redis) {
            redis.keys('cache:*').then(keys => {
                if (keys.length > 0) redis.del(...keys);
            }).catch(() => {});
        }
        console.log('🗑️ All caches flushed');
    }

    // ═══════ Metrics ═══════

    getMetrics() {
        const hitRatio = this.metrics.hits + this.metrics.misses > 0
            ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses) * 100).toFixed(2)
            : 0;
        return {
            ...this.metrics,
            hitRatio: `${hitRatio}%`,
            backend: this._getRedis() ? 'redis' : 'node-cache',
            caches: {
                trainState: this._memTrainState.getStats(),
                passengers: this._memPassengers.getStats(),
                reallocation: this._memReallocation.getStats(),
                stats: this._memStats.getStats(),
                eligibility: this._memEligibility.getStats()
            }
        };
    }

    resetMetrics() {
        this.metrics = { hits: 0, misses: 0, sets: 0, deletes: 0 };
    }

    // ═══════ Cache Warming ═══════

    async warmCache(db) {
        console.log('🔥 Starting cache warming...');
        const startTime = Date.now();
        try {
            if (global.RAC_CONFIG?.trainNo && db) {
                const trainNo = global.RAC_CONFIG.trainNo;
                const passengersCollection = db.collection(global.RAC_CONFIG.passengersCollection);
                if (passengersCollection) {
                    const passengerCounts = await passengersCollection.aggregate([
                        { $group: { _id: '$PNR_Status', count: { $sum: 1 } } }
                    ]).toArray();
                    this.setStats(trainNo, { counts: passengerCounts, warmedAt: new Date().toISOString() });
                    console.log(`  ✓ Cached passenger stats for train ${trainNo}`);

                    const racPassengers = await passengersCollection.find({
                        PNR_Status: 'RAC'
                    }).project({
                        PNR_Number: 1, Name: 1, Boarding_Station: 1,
                        Deboarding_Station: 1, Assigned_Coach: 1, Assigned_Berth: 1
                    }).toArray();
                    this.setPassengers(trainNo, 'rac', racPassengers);
                    console.log(`  ✓ Cached ${racPassengers.length} RAC passengers`);
                }
            }
            const duration = Date.now() - startTime;
            console.log(`🔥 Cache warming complete in ${duration}ms`);
            return { success: true, duration };
        } catch (error) {
            console.error('⚠️ Cache warming failed:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new CacheService();
