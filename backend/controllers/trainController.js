// backend/controllers/trainController.js (WITH WEBSOCKET + MULTI-TRAIN)

const DataService = require('../services/DataService');
const StationEventService = require('../services/StationEventService');
const RuntimeStateService = require('../services/RuntimeStateService');
const TrainEngineService = require('../services/TrainEngineService');
const db = require('../config/db');
const { COLLECTIONS } = require('../config/collections');

// Multi-train state storage: Map<trainNo, TrainState>
const trainStates = new Map();
let wsManager = null;

// Initialize wsManager after server starts
setTimeout(() => {
  wsManager = require('../config/websocket');
}, 1000);

/**
 * Update train status in MongoDB (Trains_Details collection)
 * so the landing page can show real-time status and current station.
 */
async function updateTrainStatus(trainNo, status, extraFields = {}) {
  try {
    const racDb = await db.getDb();
    const trainsCollection = racDb.collection(COLLECTIONS.TRAINS_DETAILS);
    await trainsCollection.updateOne(
      { $or: [{ trainNo: trainNo }, { Train_No: parseInt(trainNo, 10) }] },
      { $set: { status, ...extraFields, updatedAt: new Date() } }
    );
    console.log(`   📝 Train ${trainNo} status → ${status}`);
  } catch (err) {
    console.warn(`   ⚠️ Failed to update train status in DB:`, err.message);
  }
}

class TrainController {
  /**
   * Initialize train with data from TWO MongoDB databases
   */
  async reloadTrainAfterAdd(reloadTrainNo) {
    const ts = reloadTrainNo ? trainStates.get(String(reloadTrainNo)) : trainStates.values().next().value;
    if (!ts) return;
    const trainNo = ts.trainNo;
    const journeyDate = ts.journeyDate;
    const newState = await DataService.loadTrainData(trainNo, journeyDate);
    newState.updateStats();
    trainStates.set(String(trainNo), newState);
    if (wsManager) {
      wsManager.broadcastStatsUpdate(newState.stats);
    }
  }

  async initializeTrain(req, res) {
    try {
      const { trainNo, journeyDate, trainName } = req.body;

      // Use global config if available
      const config = global.RAC_CONFIG || {};

      const train = trainNo || config.trainNo;
      const date = journeyDate || config.journeyDate;
      const name = trainName || config.trainName || await DataService.getTrainName(train);

      if (!train || !date) {
        return res.status(400).json({
          success: false,
          message: 'Missing train number or journey date.'
        });
      }

      console.log(`\n🚂 Initializing train ${train} for date ${date}...`);

      // ═══════════════════════════════════════════════════════════
      // CLEAR ALL STALE DATA FROM PREVIOUS SESSIONS
      // This ensures a fresh start with no duplicate reallocations
      // ═══════════════════════════════════════════════════════════
      try {
        // Use passengersDb where station_reallocations is stored
        const passengersDb = db.getPassengersDb();

        // Clear ALL upgrade notifications (not just pending)
        const upgradeNotifications = passengersDb.collection(COLLECTIONS.UPGRADE_NOTIFICATIONS);
        const notifResult = await upgradeNotifications.deleteMany({});
        if (notifResult.deletedCount > 0) {
          console.log(`   🗑️ Cleared ${notifResult.deletedCount} upgrade notifications`);
        }

        // Clear ALL station reallocations (pending, approved, rejected)
        const stationReallocations = passengersDb.collection(COLLECTIONS.STATION_REALLOCATIONS);
        const reallocResult = await stationReallocations.deleteMany({});
        if (reallocResult.deletedCount > 0) {
          console.log(`   🗑️ Cleared ${reallocResult.deletedCount} station reallocations`);
        }

        console.log('   ✅ Previous session data cleared - starting fresh');
      } catch (cleanupError) {
        console.warn('   ⚠️ Could not clear stale data:', cleanupError.message);
        // Continue with initialization even if cleanup fails
      }

      const trainState = await DataService.loadTrainData(train, date, name);
      trainStates.set(String(train), trainState);

      // ═══════════════════════════════════════════════════════════
      // RESTORE RUNTIME STATE FROM MONGODB (survives server restart)
      // ═══════════════════════════════════════════════════════════
      const savedState = await RuntimeStateService.loadState(train, date);
      if (savedState) {
        console.log(`   🔄 Restoring saved state: journeyStarted=${savedState.journeyStarted}, stationIdx=${savedState.currentStationIdx}`);
        trainState.journeyStarted = savedState.journeyStarted;

        // If we have a saved station index > 0, re-process stations to rebuild passenger states
        // This is necessary because boarding/deboarding data is not persisted
        if (savedState.currentStationIdx > 0 && savedState.journeyStarted) {
          console.log(`   🔄 Rebuilding state to station ${savedState.currentStationIdx}...`);

          // STEP 1: Pre-board ALL passengers whose fromIdx < savedStationIdx
          // (They should already be on the train but their boarded flag is false after fresh load)
          let preBoarded = 0;
          trainState.coaches.forEach(coach => {
            coach.berths.forEach(berth => {
              berth.passengers.forEach(p => {
                if (p.fromIdx < savedState.currentStationIdx && !p.boarded && !p.noShow) {
                  p.boarded = true;
                  preBoarded++;
                }
              });
            });
          });
          trainState.racQueue.forEach(rac => {
            if (rac.fromIdx < savedState.currentStationIdx && !rac.boarded && !rac.noShow) {
              rac.boarded = true;
              preBoarded++;
            }
          });
          console.log(`      ✓ Pre-boarded ${preBoarded} passengers already on train`);

          // STEP 2: Process each station to handle deboarding and calculate vacancies
          for (let i = 0; i < savedState.currentStationIdx; i++) {
            try {
              await StationEventService.processStationArrival(trainState);
              trainState.currentStationIdx++;
            } catch (stationError) {
              console.error(`      ❌ Error processing station ${i}:`, stationError.message);
            }
          }
          console.log(`   ✅ State rebuilt - now at station ${trainState.currentStationIdx} (${trainState.getCurrentStation().name})`);
          trainState.updateStats();
        } else {
          trainState.currentStationIdx = savedState.currentStationIdx;
        }
      }

      const responseData = {
        trainNo: trainState.trainNo,
        trainName: trainState.trainName,
        journeyDate: trainState.journeyDate,
        totalStations: trainState.stations.length,
        totalPassengers: trainState.stats.totalPassengers,
        cnfPassengers: trainState.stats.cnfPassengers,
        racPassengers: trainState.stats.racPassengers,
        currentStation: trainState.getCurrentStation().name,
        currentStationIdx: trainState.currentStationIdx,
        journeyStarted: trainState.journeyStarted
      };

      // Update status in MongoDB for landing page
      await updateTrainStatus(train, 'READY', {
        currentStation: trainState.getCurrentStation()?.name || null,
        totalStations: trainState.stations.length
      });

      // Broadcast train initialization
      if (wsManager) {
        wsManager.broadcastTrainUpdate('TRAIN_INITIALIZED', responseData);
      }

      res.json({
        success: true,
        message: "Train initialized successfully",
        data: responseData
      });

    } catch (error) {
      console.error("❌ Error initializing train:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Start journey
   */
  async startJourney(req, res) {
    try {
      const trainNo = req.body.trainNo || req.query.trainNo;
      const trainState = trainNo ? trainStates.get(String(trainNo)) : trainStates.values().next().value;

      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      if (trainState.journeyStarted) {
        return res.status(400).json({
          success: false,
          message: "Journey already started"
        });
      }

      trainState.startJourney();

      const responseData = {
        journeyStarted: true,
        currentStation: trainState.getCurrentStation().name,
        currentStationIdx: trainState.currentStationIdx
      };

      // Persist state to MongoDB
      await RuntimeStateService.saveState({
        trainNo: trainState.trainNo,
        journeyDate: trainState.journeyDate,
        journeyStarted: true,
        currentStationIdx: trainState.currentStationIdx
      });

      // Broadcast journey started
      if (wsManager) {
        wsManager.broadcastTrainUpdate('JOURNEY_STARTED', responseData);
      }

      // Update status in MongoDB for landing page
      await updateTrainStatus(trainState.trainNo, 'RUNNING', {
        currentStation: trainState.getCurrentStation()?.name || null,
        currentStationIdx: trainState.currentStationIdx,
        totalStations: trainState.stations?.length || null
      });

      // Start the backend engine timer (auto-moves every 2 minutes)
      TrainEngineService.startEngine(trainState.trainNo, { intervalMs: 2 * 60 * 1000 });

      res.json({
        success: true,
        message: "Journey started",
        data: responseData
      });

    } catch (error) {
      console.error("❌ Error starting journey:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get complete train state
   */
  getTrainState(req, res) {
    try {
      const trainNo = req.query.trainNo || req.body.trainNo;
      const trainState = trainNo ? trainStates.get(String(trainNo)) : trainStates.values().next().value;

      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      res.json({
        success: true,
        data: {
          trainNo: trainState.trainNo,
          trainName: trainState.trainName,
          journeyDate: trainState.journeyDate,
          currentStationIdx: trainState.currentStationIdx,
          journeyStarted: trainState.journeyStarted,
          stations: trainState.stations,
          coaches: trainState.coaches.map(coach => ({
            coachNo: coach.coachNo,
            class: coach.class,
            capacity: coach.capacity,
            berths: coach.berths.map(berth => ({
              berthNo: berth.berthNo,
              fullBerthNo: berth.fullBerthNo,
              type: berth.type,
              status: berth.status,
              passengers: berth.passengers,
              segmentOccupancy: berth.segmentOccupancy
            }))
          })),
          racQueue: trainState.racQueue,
          stats: trainState.stats
        }
      });

    } catch (error) {
      console.error("❌ Error getting train state:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Move to next station
   */
  async moveToNextStation(req, res) {
    try {
      const trainNo = req.body.trainNo || req.query.trainNo;
      const trainState = trainNo ? trainStates.get(String(trainNo)) : trainStates.values().next().value;

      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      if (!trainState.journeyStarted) {
        return res.status(400).json({
          success: false,
          message: "Journey not started"
        });
      }

      if (trainState.isJourneyComplete()) {
        const finalData = {
          finalStation: trainState.stations[trainState.stations.length - 1].name,
          totalPassengers: trainState.stats.totalPassengers,
          finalOnboard: trainState.stats.currentOnboard,
          totalDeboarded: trainState.stats.totalDeboarded,
          totalNoShows: trainState.stats.totalNoShows,
          totalRACUpgraded: trainState.stats.totalRACUpgraded
        };

        // Mark as COMPLETE in MongoDB
        await updateTrainStatus(trainState.trainNo, 'COMPLETE', {
          currentStation: trainState.stations[trainState.stations.length - 1].name
        });

        // Broadcast journey complete
        if (wsManager) {
          wsManager.broadcastTrainUpdate('JOURNEY_COMPLETE', finalData);
        }

        return res.json({
          success: false,
          message: "Train has reached final destination",
          data: finalData
        });
      }

      const result = await StationEventService.processStationArrival(trainState);
      trainState.currentStationIdx++;

      // Unlock station upgrade lock for new station
      trainState.unlockStationForUpgrades();
      console.log(`🔓 Upgrade lock cleared for new station ${trainState.currentStationIdx}`);

      // Broadcast station arrival with all details
      if (wsManager) {
        wsManager.broadcastStationArrival({
          station: result.station,
          stationCode: result.stationCode,
          stationIdx: result.stationIdx,
          deboarded: result.deboarded,
          noShows: result.noShows,
          racAllocated: result.racAllocated,
          boarded: result.boarded,
          vacancies: result.vacancies,
          stats: result.stats,
          nextStation: trainState.getCurrentStation()?.name,
          upgrades: result.upgrades || []
        });

        // Broadcast updated statistics
        wsManager.broadcastStatsUpdate(trainState.stats);
      }

      res.json({
        success: true,
        message: `Processed station: ${result.station}`,
        data: result
      });

      // Persist updated state to MongoDB (after response to avoid blocking)
      RuntimeStateService.saveState({
        trainNo: trainState.trainNo,
        journeyDate: trainState.journeyDate,
        journeyStarted: trainState.journeyStarted,
        currentStationIdx: trainState.currentStationIdx
      });

      // Update current station in MongoDB for landing page
      const currentStationName = trainState.getCurrentStation()?.name || null;
      if (trainState.isJourneyComplete()) {
        await updateTrainStatus(trainState.trainNo, 'COMPLETE', {
          currentStation: currentStationName,
          currentStationIdx: trainState.currentStationIdx,
          totalStations: trainState.stations?.length || null
        });
      } else {
        await updateTrainStatus(trainState.trainNo, 'RUNNING', {
          currentStation: currentStationName,
          currentStationIdx: trainState.currentStationIdx,
          totalStations: trainState.stations?.length || null
        });
      }

    } catch (error) {
      console.error("❌ Error moving to next station:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Reset train to initial state
   */
  async resetTrain(req, res) {
    try {
      const reqTrainNo = req.body.trainNo || req.query.trainNo;
      const trainState = reqTrainNo ? trainStates.get(String(reqTrainNo)) : trainStates.values().next().value;

      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      const trainNo = trainState.trainNo;
      const journeyDate = trainState.journeyDate;

      console.log(`\n🔄 Resetting train ${trainNo}...`);

      // Stop the background engine if running
      TrainEngineService.stopEngine(trainNo);

      const newTrainState = await DataService.loadTrainData(trainNo, journeyDate);
      trainStates.set(String(trainNo), newTrainState);

      const responseData = {
        trainNo: newTrainState.trainNo,
        currentStation: newTrainState.getCurrentStation().name,
        journeyStarted: newTrainState.journeyStarted,
        stats: newTrainState.stats
      };

      // Broadcast train reset
      if (wsManager) {
        wsManager.broadcastTrainUpdate('TRAIN_RESET', responseData);
      }

      res.json({
        success: true,
        message: "Train reset to initial state",
        data: responseData
      });

      // Clear persisted state on reset
      await RuntimeStateService.clearState(trainNo);

    } catch (error) {
      console.error("❌ Error resetting train:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get train statistics
   */
  getTrainStats(req, res) {
    try {
      const trainNo = req.query.trainNo || req.body.trainNo;
      const trainState = trainNo ? trainStates.get(String(trainNo)) : trainStates.values().next().value;

      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      const currentStation = trainState.getCurrentStation();

      res.json({
        success: true,
        data: {
          stats: trainState.stats,
          currentStation: {
            name: currentStation.name,
            code: currentStation.code,
            idx: trainState.currentStationIdx
          },
          progress: {
            current: trainState.currentStationIdx + 1,
            total: trainState.stations.length,
            percentage: ((trainState.currentStationIdx + 1) / trainState.stations.length * 100).toFixed(1)
          }
        }
      });

    } catch (error) {
      console.error("❌ Error getting stats:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * List all trains
   */
  async list(req, res) {
    try {
      const col = db.getTrainDetailsCollection();
      // Fetch full documents to handle unpredictable field names (e.g. trailing spaces)
      const docs = await col.find({}).sort({ Train_No: 1 }).toArray();

      const items = docs.map(d => {
        // Robustly find the station collection name key (ignoring spaces)
        const stationKey = Object.keys(d).find(k => k.trim() === 'Station_Collection_Name');
        const stationCollectionName = stationKey ? d[stationKey] : null;

        // Calculate total coaches from sleeper + 3AC counts
        const sleeperCount = d.Sleeper_Coaches_Count || 0;
        const threeAcCount = d.Three_TierAC_Coaches_Count || 0;

        return {
          trainNo: d.Train_No,
          trainName: d.Train_Name,
          status: d.status || 'NOT_INIT',
          currentStation: d.currentStation || null,
          totalStations: d.totalStations || null,
          currentStationIdx: d.currentStationIdx || null,
          totalCoaches: sleeperCount + threeAcCount,
          sleeperCoachesCount: sleeperCount,
          threeTierACCoachesCount: threeAcCount,
          stationsCollection: stationCollectionName,
          passengersCollection: d.Passengers_Collection_Name || null
        };
      });
      res.json({ success: true, data: items });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get allocation errors for diagnostics
   */
  getAllocationErrors(req, res) {
    try {
      const trainNo = req.query.trainNo || req.body.trainNo;
      const trainState = trainNo ? trainStates.get(String(trainNo)) : trainStates.values().next().value;

      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      res.json({
        success: true,
        data: {
          stats: trainState.allocationStats || { total: 0, success: 0, failed: 0 },
          errors: trainState.allocationErrors || []
        }
      });

    } catch (error) {
      console.error("❌ Error getting allocation errors:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get global train state (for other controllers)
   * @param {string} [trainNo] - If provided, returns state for that train. Otherwise returns first loaded train.
   */
  getGlobalTrainState(trainNo) {
    if (!trainNo) return trainStates.values().next().value || null;
    return trainStates.get(String(trainNo)) || null;
  }

  /**
   * Get engine status (for admin dashboard)
   */
  getEngineStatus(req, res) {
    const trainNo = req.query.trainNo;
    if (trainNo) {
      res.json({
        success: true,
        data: {
          isRunning: TrainEngineService.isRunning(trainNo),
          timeUntilNextTick: TrainEngineService.getTimeUntilNextTick(trainNo)
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          runningEngines: TrainEngineService.getRunningEngines(),
          totalTrainsLoaded: trainStates.size
        }
      });
    }
  }
}

const trainControllerInstance = new TrainController();
// Export both the instance and updateTrainStatus for use by TrainEngineService
module.exports = trainControllerInstance;
module.exports.updateTrainStatus = updateTrainStatus;