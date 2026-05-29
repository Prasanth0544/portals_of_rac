/**
 * JourneyHistoryService.js
 * Writes one summary document per completed train journey into 'journey_history' (rac DB).
 *
 * Called from:
 *   trainController.js → moveToNextStation() when isJourneyComplete() returns true
 *
 * The summary is built from the trainState object that already holds all live stats.
 * It is a permanent record — once saved it is never updated.
 */

const db = require('../config/db');
const { COLLECTIONS } = require('../config/collections');

async function _getCollection() {
    const racDb = await db.getDb();
    return racDb.collection(COLLECTIONS.JOURNEY_HISTORY);
}

/**
 * Build a per-station event array from trainState.eventLog.
 * Only STATION_ARRIVAL events are included, giving a clean timeline.
 */
function _buildStationEvents(trainState) {
    if (!trainState.eventLog || !Array.isArray(trainState.eventLog)) return [];

    return trainState.eventLog
        .filter(e => e.type === 'STATION_ARRIVAL')
        .map(e => ({
            station_name:   e.data?.station     || null,
            station_code:   e.data?.stationCode || null,
            station_idx:    e.data?.stationIdx  ?? null,
            boarded:        e.data?.boarded     ?? 0,
            deboarded:      e.data?.deboarded   ?? 0,
            no_shows:       e.data?.noShows     ?? 0,
            rac_allocated:  e.data?.racAllocated ?? 0,
            timestamp:      e.timestamp         || null,
        }));
}

const JourneyHistoryService = {

    /**
     * Record a completed journey summary.
     * Non-blocking — never throws; logs a warning on failure.
     *
     * @param {object} trainState - Live trainState at journey completion
     */
    async recordCompletion(trainState) {
        try {
            const col = await _getCollection();

            const stats = trainState.stats || {};
            const journeyDate = trainState.journeyDate
                || new Date().toISOString().slice(0, 10);

            const doc = {
                train_number:        trainState.trainNo,
                train_name:          trainState.trainName       || null,
                journey_date:        journeyDate,

                // Route
                origin_station:      trainState.stations?.[0]?.name  || null,
                origin_code:         trainState.stations?.[0]?.code  || null,
                destination_station: trainState.stations?.slice(-1)[0]?.name || null,
                destination_code:    trainState.stations?.slice(-1)[0]?.code || null,
                total_stations:      trainState.stations?.length ?? 0,

                // Performance stats (aggregated by trainState)
                total_passengers:    stats.totalPassengers     ?? 0,
                total_boarded:       stats.totalBoarded        ?? 0,
                total_deboarded:     stats.totalDeboarded      ?? 0,
                total_no_shows:      stats.totalNoShows        ?? 0,
                total_upgrades:      stats.totalUpgrades       ?? 0,
                rac_passengers:      stats.racPassengers       ?? 0,

                // Derived KPI
                upgrade_success_rate: stats.totalPassengers
                    ? +(((stats.totalUpgrades || 0) / stats.totalPassengers) * 100).toFixed(2)
                    : 0,

                // Station-by-station timeline
                station_events: _buildStationEvents(trainState),

                // Timestamps
                journey_started_at:   trainState.journeyStartedAt  || null,
                completed_at:         new Date(),
                status:               'COMPLETED',
            };

            // Use upsert so re-running a recovery doesn't create duplicates
            await col.updateOne(
                { train_number: doc.train_number, journey_date: doc.journey_date },
                { $setOnInsert: doc },
                { upsert: true }
            );

            console.log(`📋 JourneyHistory recorded: Train ${doc.train_number} on ${doc.journey_date}`);
        } catch (err) {
            console.warn('⚠️  JourneyHistoryService.recordCompletion() failed (non-critical):', err.message);
        }
    },

    /**
     * Fetch paginated journey history for the Admin dashboard.
     * @param {object} filters
     * @param {string}  [filters.trainNumber]
     * @param {string}  [filters.fromDate]   - 'YYYY-MM-DD'
     * @param {string}  [filters.toDate]     - 'YYYY-MM-DD'
     * @param {number}  [filters.page=1]
     * @param {number}  [filters.limit=20]
     * @returns {Promise<{ total: number, journeys: Array }>}
     */
    async getAll({ trainNumber, fromDate, toDate, page = 1, limit = 20 } = {}) {
        const col = await _getCollection();
        const query = {};

        if (trainNumber) query.train_number = trainNumber;
        if (fromDate || toDate) {
            query.journey_date = {};
            if (fromDate) query.journey_date.$gte = fromDate;
            if (toDate)   query.journey_date.$lte = toDate;
        }

        const skip = (page - 1) * limit;
        const [total, journeys] = await Promise.all([
            col.countDocuments(query),
            col.find(query)
               .sort({ completed_at: -1 })
               .skip(skip)
               .limit(limit)
               .project({ station_events: 0 }) // Omit large array in list view
               .toArray(),
        ]);

        return { total, page, limit, journeys };
    },

    /**
     * Fetch all journeys for a specific train (with full station_events).
     * @param {string} trainNumber
     * @returns {Promise<Array>}
     */
    async getByTrain(trainNumber) {
        const col = await _getCollection();
        return col
            .find({ train_number: trainNumber })
            .sort({ completed_at: -1 })
            .toArray();
    },

    /**
     * Get a single journey document (full detail including station_events).
     * @param {string} trainNumber
     * @param {string} journeyDate - 'YYYY-MM-DD'
     * @returns {Promise<object|null>}
     */
    async getOne(trainNumber, journeyDate) {
        const col = await _getCollection();
        return col.findOne({ train_number: trainNumber, journey_date: journeyDate });
    },
};

module.exports = JourneyHistoryService;
