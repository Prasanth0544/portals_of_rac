/**
 * initPhase2Collections.js
 * Creates all MongoDB indexes for Phase 2 collections in the 'rac' database.
 *
 * Run once after deployment:
 *   node backend/scripts/initPhase2Collections.js
 *
 * Safe to run multiple times — uses `{ background: true }` and gracefully
 * ignores IndexKeySpecsConflict / IndexAlreadyExists errors.
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
const RAC_DB    = 'rac';

async function createIndexes() {
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const racDb = client.db(RAC_DB);

        // ── upgrade_history ───────────────────────────────────────────────────
        const upgradeHistory = racDb.collection('upgrade_history');
        console.log('\n📑 upgrade_history indexes:');

        await upgradeHistory.createIndex(
            { train_number: 1, journey_date: 1 },
            { name: 'idx_uh_train_date', background: true }
        );
        console.log('  ✅ { train_number, journey_date }');

        await upgradeHistory.createIndex(
            { passenger_pnr: 1 },
            { name: 'idx_uh_pnr', background: true }
        );
        console.log('  ✅ { passenger_pnr }');

        await upgradeHistory.createIndex(
            { upgrade_type: 1 },
            { name: 'idx_uh_type', background: true }
        );
        console.log('  ✅ { upgrade_type }');

        await upgradeHistory.createIndex(
            { approval_status: 1 },
            { name: 'idx_uh_status', background: true }
        );
        console.log('  ✅ { approval_status }');

        await upgradeHistory.createIndex(
            { created_at: -1 },
            { name: 'idx_uh_created', background: true }
        );
        console.log('  ✅ { created_at }');

        // ── journey_history ───────────────────────────────────────────────────
        const journeyHistory = racDb.collection('journey_history');
        console.log('\n📑 journey_history indexes:');

        await journeyHistory.createIndex(
            { train_number: 1, journey_date: 1 },
            { name: 'idx_jh_train_date', unique: true, background: true }
        );
        console.log('  ✅ { train_number, journey_date } [unique]');

        await journeyHistory.createIndex(
            { status: 1 },
            { name: 'idx_jh_status', background: true }
        );
        console.log('  ✅ { status }');

        await journeyHistory.createIndex(
            { completed_at: -1 },
            { name: 'idx_jh_completed', background: true }
        );
        console.log('  ✅ { completed_at }');

        // ── analytics ─────────────────────────────────────────────────────────
        const analytics = racDb.collection('analytics');
        console.log('\n📑 analytics indexes:');

        await analytics.createIndex(
            { period: 1, date: -1 },
            { name: 'idx_an_period_date', unique: true, background: true }
        );
        console.log('  ✅ { period, date } [unique]');

        // ── train_schedule_cache ───────────────────────────────────────────────
        const trainCache = racDb.collection('train_schedule_cache');
        console.log('\n📑 train_schedule_cache indexes:');

        await trainCache.createIndex(
            { train_number: 1 },
            { name: 'idx_tsc_train', unique: true, background: true }
        );
        console.log('  ✅ { train_number } [unique]');

        await trainCache.createIndex(
            { expires_at: 1 },
            { name: 'idx_tsc_ttl', expireAfterSeconds: 0, background: true }
        );
        console.log('  ✅ { expires_at } [TTL]');

        // ── system_config ─────────────────────────────────────────────────────
        const sysConfig = racDb.collection('system_config');
        console.log('\n📑 system_config indexes:');

        await sysConfig.createIndex(
            { key: 1 },
            { name: 'idx_sc_key', unique: true, background: true }
        );
        console.log('  ✅ { key } [unique]');

        // ── Summary ───────────────────────────────────────────────────────────
        console.log('\n════════════════════════════════════════════');
        console.log('  ✅ Phase 2 indexes created successfully!  ');
        console.log('════════════════════════════════════════════\n');

    } catch (err) {
        // Ignore "index already exists" — safe to re-run
        if (err.codeName === 'IndexKeySpecsConflict' || err.code === 85 || err.code === 86) {
            console.warn('⚠️  Some indexes already exist — skipping (safe).');
        } else {
            console.error('❌ Error creating indexes:', err.message);
            process.exit(1);
        }
    } finally {
        await client.close();
        console.log('MongoDB connection closed.');
    }
}

createIndexes();
