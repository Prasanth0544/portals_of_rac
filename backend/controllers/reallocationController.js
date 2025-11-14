// backend/controllers/reallocationController.js (WITH WEBSOCKET)

const ReallocationService = require('../services/ReallocationService');
const ValidationService = require('../services/ValidationService');
const trainController = require('./trainController');

let wsManager = null;

// Initialize wsManager after server starts
setTimeout(() => {
  wsManager = require('../config/websocket');
}, 1000);

class ReallocationController {
  /**
   * Mark passenger as no-show
   */
  async markPassengerNoShow(req, res) {
    try {
      const { pnr } = req.body;

      if (!pnr) {
        return res.status(400).json({
          success: false,
          message: "PNR is required"
        });
      }

      const pnrValidation = ValidationService.validatePNR(pnr);
      if (!pnrValidation.valid) {
        return res.status(400).json({
          success: false,
          message: pnrValidation.reason
        });
      }

      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      const result = await ReallocationService.markNoShow(trainState, pnr);

      // Broadcast no-show event
      if (wsManager) {
        wsManager.broadcastNoShow({
          passenger: result.passenger,
          currentStation: trainState.getCurrentStation()?.name,
          stats: trainState.stats
        });

        // Also broadcast updated stats
        wsManager.broadcastStatsUpdate(trainState.stats);
      }

      res.json({
        success: true,
        message: `Passenger ${result.passenger.name} marked as no-show`,
        data: result.passenger
      });

    } catch (error) {
      console.error("❌ Error marking no-show:", error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get RAC queue
   */
  getRACQueue(req, res) {
    try {
      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      const racQueue = ReallocationService.getRACQueue(trainState);

      res.json({
        success: true,
        data: {
          total: racQueue.length,
          queue: racQueue
        }
      });

    } catch (error) {
      console.error("❌ Error getting RAC queue:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get vacant berths
   */
  getVacantBerths(req, res) {
    try {
      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      const vacancies = ReallocationService.getVacantBerths(trainState);

      res.json({
        success: true,
        data: {
          total: vacancies.length,
          vacancies: vacancies
        }
      });

    } catch (error) {
      console.error("❌ Error getting vacant berths:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Search passenger by PNR
   */
  searchPassenger(req, res) {
    try {
      const { pnr } = req.params;

      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      const passenger = ReallocationService.searchPassenger(trainState, pnr);

      res.json({
        success: true,
        data: passenger
      });

    } catch (error) {
      console.error("❌ Error searching passenger:", error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get eligibility matrix
   */
  getEligibilityMatrix(req, res) {
    try {
      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      const matrix = ReallocationService.getEligibilityMatrix(trainState);

      res.json({
        success: true,
        data: {
          total: matrix.length,
          eligibility: matrix
        }
      });

    } catch (error) {
      console.error("❌ Error getting eligibility matrix:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Apply reallocation
   */
  applyReallocation(req, res) {
    try {
      const { allocations } = req.body;

      if (!allocations || !Array.isArray(allocations)) {
        return res.status(400).json({
          success: false,
          message: "Allocations array is required"
        });
      }

      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      const results = ReallocationService.applyReallocation(trainState, allocations);

      // Broadcast reallocation event
      if (wsManager) {
        wsManager.broadcastRACReallocation({
          success: results.success,
          failed: results.failed,
          totalAllocated: results.success.length,
          currentStation: trainState.getCurrentStation()?.name,
          stats: trainState.stats
        });

        // Broadcast updated stats
        wsManager.broadcastStatsUpdate(trainState.stats);
      }

      res.json({
        success: true,
        message: `Applied ${results.success.length} reallocations`,
        data: results
      });

    } catch (error) {
      console.error("❌ Error applying reallocation:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new ReallocationController();