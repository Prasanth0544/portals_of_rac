// backend/services/RuntimeStateService.js
// Persists runtime state (journeyStarted, currentStationIdx) to MongoDB
// This allows the train state to survive server restarts

const db = require('../config/db');

const COLLECTION_NAME = 'runtime_state';
const STATE_KEY = 'train_runtime_state';

class RuntimeStateService {
    /**
     * Save runtime state to MongoDB
     * @param {Object} state - { trainNo, journeyDate, journeyStarted, currentStationIdx }
     */
    async saveState(state) {
        try {
            const passengersDb = db.getPassengersDb();
            if (!passengersDb) {
                console.warn('[RuntimeState] Database not available, cannot save state');
                return false;
            }

            const collection = passengersDb.collection(COLLECTION_NAME);

            const stateDoc = {
                key: STATE_KEY,
                trainNo: state.trainNo,
                journeyDate: state.journeyDate,
                journeyStarted: state.journeyStarted || false,
                currentStationIdx: state.currentStationIdx || 0,
                updatedAt: new Date()
            };

            await collection.updateOne(
                { key: STATE_KEY },
                { $set: stateDoc },
                { upsert: true }
            );

            console.log(`[RuntimeState] Saved: journeyStarted=${stateDoc.journeyStarted}, currentStationIdx=${stateDoc.currentStationIdx}`);
            return true;
        } catch (error) {
            console.error('[RuntimeState] Error saving state:', error.message);
            return false;
        }
    }

    /**
     * Load runtime state from MongoDB
     * @param {string} trainNo - Train number to match
     * @param {string} journeyDate - Journey date to match
     * @returns {Object|null} - { journeyStarted, currentStationIdx } or null if not found
     */
    async loadState(trainNo, journeyDate) {
        try {
            const passengersDb = db.getPassengersDb();
            if (!passengersDb) {
                console.warn('[RuntimeState] Database not available, cannot load state');
                return null;
            }

            const collection = passengersDb.collection(COLLECTION_NAME);

            const stateDoc = await collection.findOne({
                key: STATE_KEY,
                trainNo: trainNo,
                journeyDate: journeyDate
            });

            if (stateDoc) {
                console.log(`[RuntimeState] Loaded: journeyStarted=${stateDoc.journeyStarted}, currentStationIdx=${stateDoc.currentStationIdx}`);
                return {
                    journeyStarted: stateDoc.journeyStarted || false,
                    currentStationIdx: stateDoc.currentStationIdx || 0
                };
            }

            console.log('[RuntimeState] No saved state found for this train/date');
            return null;
        } catch (error) {
            console.error('[RuntimeState] Error loading state:', error.message);
            return null;
        }
    }

    /**
     * Clear runtime state (on train reset)
     */
    async clearState() {
        try {
            const passengersDb = db.getPassengersDb();
            if (!passengersDb) {
                return false;
            }

            const collection = passengersDb.collection(COLLECTION_NAME);
            await collection.deleteOne({ key: STATE_KEY });

            console.log('[RuntimeState] State cleared');
            return true;
        } catch (error) {
            console.error('[RuntimeState] Error clearing state:', error.message);
            return false;
        }
    }
}

module.exports = new RuntimeStateService();
