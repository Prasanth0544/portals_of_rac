// backend/utils/startupCleanup.js
// Safe startup cleanup — only removes stale session data, not active production data

const { COLLECTIONS } = require('../config/collections');

/**
 * Maximum age (in hours) for session data to be considered "stale".
 * Data newer than this threshold is preserved across restarts.
 */
const DEFAULT_STALE_THRESHOLD_HOURS = 24;

/**
 * Clean up old session data on server startup.
 *
 * In production, only removes documents older than STALE_THRESHOLD_HOURS.
 * In development, clears everything (original behavior) for a clean slate.
 *
 * Set STARTUP_CLEANUP=false in env to skip cleanup entirely.
 *
 * @param {import('mongodb').Db} db - MongoDB database instance
 * @returns {Promise<{skipped: boolean, reallocations: number, notifications: number}>}
 */
async function cleanupStaleSessionData(db) {
    // Allow disabling cleanup entirely via env
    if (process.env.STARTUP_CLEANUP === 'false') {
        console.log('⏭️  Startup cleanup disabled via STARTUP_CLEANUP=false');
        return { skipped: true, reallocations: 0, notifications: 0 };
    }

    const isProd = process.env.NODE_ENV === 'production';
    const thresholdHours = parseInt(process.env.STALE_THRESHOLD_HOURS, 10) || DEFAULT_STALE_THRESHOLD_HOURS;

    let filter = {};

    if (isProd) {
        // In production, only remove data older than the threshold
        const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);
        filter = { createdAt: { $lt: cutoff } };
        console.log(`🧹 Production cleanup: removing data older than ${thresholdHours}h (before ${cutoff.toISOString()})`);
    } else {
        console.log('🧹 Development cleanup: clearing all old session data');
    }

    let reallocationsDeleted = 0;
    let notificationsDeleted = 0;

    try {
        const stationReallocations = db.collection(COLLECTIONS.STATION_REALLOCATIONS);
        const reallocResult = await stationReallocations.deleteMany(filter);
        reallocationsDeleted = reallocResult.deletedCount;
        if (reallocationsDeleted > 0) {
            console.log(`🗑️  Cleared ${reallocationsDeleted} old reallocations`);
        }
    } catch (err) {
        console.warn('⚠️ Could not clear old reallocations:', err.message);
    }

    try {
        const upgradeNotifications = db.collection(COLLECTIONS.UPGRADE_NOTIFICATIONS);
        const notifResult = await upgradeNotifications.deleteMany(filter);
        notificationsDeleted = notifResult.deletedCount;
        if (notificationsDeleted > 0) {
            console.log(`🗑️  Cleared ${notificationsDeleted} old notifications`);
        }
    } catch (err) {
        console.warn('⚠️ Could not clear old notifications:', err.message);
    }

    if (reallocationsDeleted === 0 && notificationsDeleted === 0) {
        console.log('✅ No stale session data to clean');
    } else {
        console.log('✅ Startup cleanup complete');
    }

    return {
        skipped: false,
        reallocations: reallocationsDeleted,
        notifications: notificationsDeleted
    };
}

module.exports = { cleanupStaleSessionData };
