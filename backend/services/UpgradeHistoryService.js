/**
 * UpgradeHistoryService.js
 * Writes one audit document per upgrade decision into 'upgrade_history' (rac DB).
 *
 * Called from TWO places:
 *  1. StationWiseApprovalController.js → when a TTE manually approves/rejects
 *  2. StationEventService.js (AUTO mode) → when the system commits immediately
 *
 * Each document captures: who, what, when, which berth, which rule, approval status.
 */

const db = require('../config/db');
const { COLLECTIONS } = require('../config/collections');

async function _getCollection() {
    const racDb = await db.getDb();
    return racDb.collection(COLLECTIONS.UPGRADE_HISTORY);
}

const UpgradeHistoryService = {

    /**
     * Record one upgrade event (approval OR rejection).
     *
     * @param {object} payload
     * @param {string}  payload.train_number
     * @param {string}  payload.journey_date        - 'YYYY-MM-DD'
     * @param {string}  payload.passenger_pnr
     * @param {string}  [payload.passenger_name]
     * @param {string}  payload.from_status          - e.g. 'RAC', 'WL'
     * @param {string}  payload.to_status            - e.g. 'CNF'
     * @param {string}  [payload.from_coach]
     * @param {string|number} [payload.from_berth]
     * @param {string}  [payload.to_coach]
     * @param {string|number} [payload.to_berth]
     * @param {string}  payload.upgrade_type         - 'STATION_VACANCY' | 'NO_SHOW' | 'AUTO'
     * @param {string}  [payload.triggered_by]       - 'deboarding' | 'no_show' | 'manual'
     * @param {string}  [payload.triggered_at_station]
     * @param {string}  payload.approval_status      - 'APPROVED' | 'REJECTED' | 'AUTO_COMMITTED'
     * @param {string}  [payload.approved_by]        - TTE employee ID (null for AUTO)
     * @param {string}  [payload.rejection_reason]
     */
    async record(payload) {
        try {
            const col = await _getCollection();
            const doc = {
                train_number:          payload.train_number,
                journey_date:          payload.journey_date,
                passenger_pnr:         payload.passenger_pnr,
                passenger_name:        payload.passenger_name   || null,
                from_status:           payload.from_status,
                to_status:             payload.to_status,
                from_coach:            payload.from_coach       || null,
                from_berth:            payload.from_berth       ?? null,
                to_coach:              payload.to_coach         || null,
                to_berth:              payload.to_berth         ?? null,
                upgrade_type:          payload.upgrade_type,
                triggered_by:          payload.triggered_by     || null,
                triggered_at_station:  payload.triggered_at_station || null,
                approval_status:       payload.approval_status,
                approved_by:           payload.approved_by      || null,
                rejection_reason:      payload.rejection_reason || null,
                approved_at:           payload.approved_at      || new Date(),
                created_at:            new Date(),
            };
            await col.insertOne(doc);
        } catch (err) {
            // Non-critical — never let audit logging crash the main flow
            console.warn('⚠️  UpgradeHistoryService.record() failed (non-critical):', err.message);
        }
    },

    /**
     * Fetch all upgrade history records for a specific train journey.
     * Used by the TTE and Admin audit trail views.
     *
     * @param {string} trainNumber
     * @param {string} journeyDate  - 'YYYY-MM-DD'
     * @returns {Promise<Array>}
     */
    async getByJourney(trainNumber, journeyDate) {
        const col = await _getCollection();
        return col
            .find({ train_number: trainNumber, journey_date: journeyDate })
            .sort({ created_at: -1 })
            .toArray();
    },

    /**
     * Fetch all upgrade records for a specific passenger (by PNR).
     * @param {string} pnr
     * @returns {Promise<Array>}
     */
    async getByPNR(pnr) {
        const col = await _getCollection();
        return col
            .find({ passenger_pnr: pnr })
            .sort({ created_at: -1 })
            .toArray();
    },

    /**
     * Aggregate summary counts for a journey.
     * Returns { total, approved, rejected, autoCommitted, byType: {...} }
     * @param {string} trainNumber
     * @param {string} journeyDate
     * @returns {Promise<object>}
     */
    async getSummary(trainNumber, journeyDate) {
        const col = await _getCollection();
        const records = await col
            .find({ train_number: trainNumber, journey_date: journeyDate })
            .toArray();

        const summary = {
            total: records.length,
            approved: 0,
            rejected: 0,
            autoCommitted: 0,
            byType: {},
        };

        for (const r of records) {
            if (r.approval_status === 'APPROVED')       summary.approved++;
            else if (r.approval_status === 'REJECTED')  summary.rejected++;
            else if (r.approval_status === 'AUTO_COMMITTED') summary.autoCommitted++;

            summary.byType[r.upgrade_type] = (summary.byType[r.upgrade_type] || 0) + 1;
        }

        return summary;
    },
};

module.exports = UpgradeHistoryService;
