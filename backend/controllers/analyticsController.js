/**
 * analyticsController.js
 * Read APIs for the Phase 2 Analytics dashboard.
 *
 * Routes (all under /api/analytics):
 *   GET  /dashboard           → latest daily + weekly KPIs
 *   GET  /journey-history     → paginated journey_history list
 *   GET  /journey-history/:trainNo/:date → single journey full detail
 *   GET  /upgrade-history     → audit trail for a journey (?trainNo=&date=)
 *   GET  /upgrade-history/pnr/:pnr → per-passenger upgrade trail
 *   POST /aggregate           → manual re-run aggregation (admin only)
 *
 * GET  /tte/upgrade-audit     → TTE view: audit for their current journey
 *   (mounted in tteRoutes.js, handler exported here)
 */

const AnalyticsService    = require('../services/AnalyticsService');
const JourneyHistoryService = require('../services/JourneyHistoryService');
const UpgradeHistoryService = require('../services/UpgradeHistoryService');
const trainController     = require('./trainController');

const analyticsController = {

    /**
     * GET /api/analytics/dashboard
     * Returns the last 7 daily + last 4 weekly KPI docs.
     */
    async getDashboard(req, res) {
        try {
            const [daily, weekly] = await Promise.all([
                AnalyticsService.getLatest('daily',  7),
                AnalyticsService.getLatest('weekly', 4),
            ]);

            res.json({
                success: true,
                data: { daily, weekly },
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    /**
     * GET /api/analytics/journey-history
     * Query params: trainNumber, fromDate, toDate, page, limit
     */
    async getJourneyHistory(req, res) {
        try {
            const { trainNumber, fromDate, toDate, page, limit } = req.query;
            const result = await JourneyHistoryService.getAll({
                trainNumber,
                fromDate,
                toDate,
                page:  parseInt(page)  || 1,
                limit: parseInt(limit) || 20,
            });
            res.json({ success: true, data: result });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    /**
     * GET /api/analytics/journey-history/:trainNo/:date
     * Returns full journey detail including station_events.
     */
    async getJourneyDetail(req, res) {
        try {
            const { trainNo, date } = req.params;
            const journey = await JourneyHistoryService.getOne(trainNo, date);
            if (!journey) {
                return res.status(404).json({ success: false, message: 'Journey not found' });
            }
            res.json({ success: true, data: journey });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    /**
     * GET /api/analytics/upgrade-history
     * Query params: trainNo (required), date (required)
     * Returns full audit trail for that journey.
     */
    async getUpgradeHistory(req, res) {
        try {
            const { trainNo, date } = req.query;
            if (!trainNo || !date) {
                return res.status(400).json({
                    success: false,
                    message: 'trainNo and date query params are required',
                });
            }
            const records = await UpgradeHistoryService.getByJourney(trainNo, date);
            const summary = await UpgradeHistoryService.getSummary(trainNo, date);
            res.json({ success: true, data: { summary, records } });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    /**
     * GET /api/analytics/upgrade-history/pnr/:pnr
     * Returns all upgrades for a specific passenger.
     */
    async getUpgradeHistoryByPNR(req, res) {
        try {
            const { pnr } = req.params;
            const records = await UpgradeHistoryService.getByPNR(pnr);
            res.json({ success: true, data: records });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    /**
     * POST /api/analytics/aggregate
     * Manually trigger re-aggregation (admin only).
     * Body: { date: 'YYYY-MM-DD' } — optional, defaults to today.
     */
    async triggerAggregate(req, res) {
        try {
            const { date } = req.body;
            const [daily, weekly] = await Promise.all([
                AnalyticsService.aggregateDaily(date),
                AnalyticsService.aggregateWeekly(),
            ]);
            res.json({
                success: true,
                message: 'Aggregation complete',
                data: { daily, weekly },
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    /**
     * GET /tte/upgrade-audit   (mounted in tteRoutes.js)
     * TTE-scoped view: audit trail for their current in-progress journey.
     * Query params: trainNo (optional — falls back to the active train)
     */
    async getTTEUpgradeAudit(req, res) {
        try {
            const trainNo = req.query.trainNo;
            const trainState = trainController.getGlobalTrainState(trainNo);

            if (!trainState) {
                return res.status(400).json({
                    success: false,
                    message: 'Train not initialized',
                });
            }

            const journeyDate = trainState.journeyDate
                || new Date().toISOString().slice(0, 10);

            const [records, summary] = await Promise.all([
                UpgradeHistoryService.getByJourney(String(trainState.trainNo), journeyDate),
                UpgradeHistoryService.getSummary(String(trainState.trainNo), journeyDate),
            ]);

            res.json({
                success: true,
                data: {
                    trainNo:     trainState.trainNo,
                    journeyDate,
                    summary,
                    records,
                },
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
};

module.exports = analyticsController;
