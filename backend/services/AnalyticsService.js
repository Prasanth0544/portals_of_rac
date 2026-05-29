/**
 * AnalyticsService.js
 * Aggregates KPIs from journey_history + upgrade_history into the 'analytics' collection (rac DB).
 *
 * Aggregation modes:
 *  - Daily:  one doc per calendar day — total upgrades, no-shows, journeys completed, success rate
 *  - Weekly: one doc per ISO week — rolled-up daily data
 *
 * Triggered:
 *  - On server startup (runs for yesterday if today's doc is missing)
 *  - Every 24h via a lightweight setInterval (no external cron dep needed)
 *  - Manually via POST /api/analytics/aggregate (admin only)
 */

const db = require('../config/db');
const { COLLECTIONS } = require('../config/collections');

async function _getDb() {
    return db.getDb();
}

// ── ISO week helper ──────────────────────────────────────────────────────────
function _isoWeekStart(date) {
    const d = new Date(date);
    const day = d.getUTCDay() || 7;          // Mon=1 … Sun=7
    d.setUTCDate(d.getUTCDate() - day + 1);  // Monday of this week
    return d.toISOString().slice(0, 10);     // 'YYYY-MM-DD'
}

function _dateStr(d = new Date()) {
    return new Date(d).toISOString().slice(0, 10);
}

// ─── Core aggregation ─────────────────────────────────────────────────────────
const AnalyticsService = {

    /**
     * Compute and upsert a daily analytics document for the given date.
     * Safe to re-run (upsert with full recalculation).
     * @param {string} [date] - 'YYYY-MM-DD', defaults to today
     */
    async aggregateDaily(date) {
        const targetDate = date || _dateStr();
        try {
            const racDb      = await _getDb();
            const journeyCol = racDb.collection(COLLECTIONS.JOURNEY_HISTORY);
            const upgradeCol = racDb.collection(COLLECTIONS.UPGRADE_HISTORY);
            const analyticsCol = racDb.collection(COLLECTIONS.ANALYTICS);

            // Pull journeys completed on this date
            const journeys = await journeyCol
                .find({ journey_date: targetDate })
                .toArray();

            // Pull all upgrade events on this date
            const upgrades = await upgradeCol
                .find({ journey_date: targetDate })
                .toArray();

            // Compute KPIs
            const totalJourneys       = journeys.length;
            const totalPassengers     = journeys.reduce((s, j) => s + (j.total_passengers   || 0), 0);
            const totalNoShows        = journeys.reduce((s, j) => s + (j.total_no_shows     || 0), 0);
            const totalUpgradesJourney = journeys.reduce((s, j) => s + (j.total_upgrades   || 0), 0);

            const totalUpgradeEvents  = upgrades.length;
            const approvedUpgrades    = upgrades.filter(u => u.approval_status === 'APPROVED').length;
            const rejectedUpgrades    = upgrades.filter(u => u.approval_status === 'REJECTED').length;
            const autoUpgrades        = upgrades.filter(u => u.approval_status === 'AUTO_COMMITTED').length;

            // Upgrade types breakdown
            const byType = {};
            upgrades.forEach(u => {
                byType[u.upgrade_type] = (byType[u.upgrade_type] || 0) + 1;
            });

            // Average upgrade rate per journey
            const avgUpgradeRate = totalPassengers > 0
                ? +((totalUpgradesJourney / totalPassengers) * 100).toFixed(2)
                : 0;

            const doc = {
                period:               'daily',
                date:                 targetDate,
                week_start:           _isoWeekStart(targetDate),

                total_journeys:       totalJourneys,
                total_passengers:     totalPassengers,
                total_no_shows:       totalNoShows,
                total_upgrades:       totalUpgradesJourney,
                avg_upgrade_rate_pct: avgUpgradeRate,

                upgrade_events: {
                    total:         totalUpgradeEvents,
                    approved:      approvedUpgrades,
                    rejected:      rejectedUpgrades,
                    auto_committed: autoUpgrades,
                    by_type:       byType,
                },

                computed_at: new Date(),
            };

            await analyticsCol.updateOne(
                { period: 'daily', date: targetDate },
                { $set: doc, $setOnInsert: { created_at: new Date() } },
                { upsert: true }
            );

            console.log(`📊 Analytics: daily doc upserted for ${targetDate} (${totalJourneys} journeys, ${totalUpgradesJourney} upgrades)`);
            return doc;
        } catch (err) {
            console.warn('⚠️  AnalyticsService.aggregateDaily() failed:', err.message);
        }
    },

    /**
     * Compute and upsert a weekly analytics document.
     * @param {string} [weekStart] - 'YYYY-MM-DD' (Monday), defaults to current week
     */
    async aggregateWeekly(weekStart) {
        const targetWeek = weekStart || _isoWeekStart(new Date());
        try {
            const racDb      = await _getDb();
            const journeyCol = racDb.collection(COLLECTIONS.JOURNEY_HISTORY);
            const upgradeCol = racDb.collection(COLLECTIONS.UPGRADE_HISTORY);
            const analyticsCol = racDb.collection(COLLECTIONS.ANALYTICS);

            // Compute week end (Sunday)
            const weekEnd = new Date(targetWeek);
            weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
            const weekEndStr = _dateStr(weekEnd);

            const journeys = await journeyCol
                .find({ journey_date: { $gte: targetWeek, $lte: weekEndStr } })
                .toArray();

            const upgrades = await upgradeCol
                .find({ journey_date: { $gte: targetWeek, $lte: weekEndStr } })
                .toArray();

            const totalJourneys   = journeys.length;
            const totalPassengers = journeys.reduce((s, j) => s + (j.total_passengers || 0), 0);
            const totalNoShows    = journeys.reduce((s, j) => s + (j.total_no_shows   || 0), 0);
            const totalUpgrades   = journeys.reduce((s, j) => s + (j.total_upgrades   || 0), 0);

            const avgUpgradeRate  = totalPassengers > 0
                ? +((totalUpgrades / totalPassengers) * 100).toFixed(2)
                : 0;

            const doc = {
                period:               'weekly',
                date:                 targetWeek,       // Used as unique key
                week_start:           targetWeek,
                week_end:             weekEndStr,

                total_journeys:       totalJourneys,
                total_passengers:     totalPassengers,
                total_no_shows:       totalNoShows,
                total_upgrades:       totalUpgrades,
                avg_upgrade_rate_pct: avgUpgradeRate,

                upgrade_events: {
                    total:    upgrades.length,
                    approved: upgrades.filter(u => u.approval_status === 'APPROVED').length,
                    rejected: upgrades.filter(u => u.approval_status === 'REJECTED').length,
                },

                computed_at: new Date(),
            };

            await analyticsCol.updateOne(
                { period: 'weekly', date: targetWeek },
                { $set: doc, $setOnInsert: { created_at: new Date() } },
                { upsert: true }
            );

            console.log(`📊 Analytics: weekly doc upserted for week of ${targetWeek}`);
            return doc;
        } catch (err) {
            console.warn('⚠️  AnalyticsService.aggregateWeekly() failed:', err.message);
        }
    },

    /**
     * Get the latest N analytics docs for a given period.
     * @param {'daily'|'weekly'} period
     * @param {number} [n=7]
     * @returns {Promise<Array>}
     */
    async getLatest(period = 'daily', n = 7) {
        const racDb = await _getDb();
        const col   = racDb.collection(COLLECTIONS.ANALYTICS);
        return col
            .find({ period })
            .sort({ date: -1 })
            .limit(n)
            .toArray();
    },

    /**
     * Trigger daily (and weekly) aggregation non-blocking.
     * Called on server startup and by the 24h interval.
     */
    triggerDailyAggregation() {
        const today     = _dateStr();
        const yesterday = _dateStr(Date.now() - 86400000);

        // Run in background — never await, never throw to caller
        Promise.allSettled([
            this.aggregateDaily(today),
            this.aggregateDaily(yesterday),   // catch up if server was down overnight
            this.aggregateWeekly(),
        ]).then(results => {
            const failed = results.filter(r => r.status === 'rejected');
            if (failed.length) {
                console.warn(`⚠️  AnalyticsService: ${failed.length} aggregation(s) failed`);
            }
        });

        // Schedule next run in 24h (self-healing — no external cron needed)
        if (!AnalyticsService._cronHandle) {
            AnalyticsService._cronHandle = setInterval(() => {
                AnalyticsService.triggerDailyAggregation();
            }, 24 * 60 * 60 * 1000).unref(); // .unref() so it doesn't prevent Node exit
        }
    },

    _cronHandle: null,
};

module.exports = AnalyticsService;
