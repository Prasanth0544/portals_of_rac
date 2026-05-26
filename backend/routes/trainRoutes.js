// backend/routes/trainRoutes.js — Train lifecycle, config & admin routes

const express = require('express');
const router = express.Router();
const trainController = require('../controllers/trainController');
const configController = require('../controllers/configController');
const validationMiddleware = require('../middleware/validation');
const { authMiddleware, requireRole } = require('../middleware/auth');

// ========== TRAIN ROUTES ==========
router.get('/trains', (req, res) => trainController.list(req, res));

// Admin train overview (TTEs, passenger counts, notification stats)
router.get('/admin/train-overview',
  authMiddleware,
  requireRole(['ADMIN']),
  (req, res) => trainController.getTrainOverview(req, res)
);

// Per-train config (get / update)
router.get('/trains/:trainNo/config',
  (req, res) => configController.getTrainConfig(req, res)
);

router.put('/trains/:trainNo/config',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware.sanitizeBody,
  (req, res) => configController.updateTrainConfig(req, res)
);

// Register a new train
router.post('/trains/register',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware.sanitizeBody,
  (req, res) => configController.registerTrain(req, res)
);

// Engine status
router.get('/train/engine-status',
  (req, res) => trainController.getEngineStatus(req, res)
);

router.get('/train/engines',
  (req, res) => trainController.getEngineStatus(req, res)
);

// Dynamic configuration setup (from frontend)
router.post('/config/setup',
  validationMiddleware.sanitizeBody,
  validationMiddleware.validateDynamicConfig,
  (req, res) => configController.setup(req, res)
);

// Get current config (sanitized - no password)
router.get('/config/current', (req, res) => {
  try {
    const config = global.RAC_CONFIG || {};

    res.json({
      success: true,
      data: {
        hasMongoUri: !!config.mongoUri,
        stationsDb: config.stationsDb || null,
        passengersDb: config.passengersDb || null,
        stationsCollection: config.stationsCollection || null,
        passengersCollection: config.passengersCollection || null,
        trainNo: config.trainNo || null,
        journeyDate: config.journeyDate || null,
        isConfigured: !!(config.mongoUri && config.stationsDb && config.passengersDb)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Train lifecycle mutations — Admin only
router.post('/train/initialize',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware.sanitizeBody,
  validationMiddleware.validateTrainInit,
  (req, res) => trainController.initializeTrain(req, res)
);

router.post('/train/start-journey',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware.checkTrainInitialized,
  (req, res) => trainController.startJourney(req, res)
);

router.get('/train/state',
  validationMiddleware.checkTrainInitialized,
  (req, res) => trainController.getTrainState(req, res)
);

router.post('/train/next-station',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => trainController.moveToNextStation(req, res)
);

router.post('/train/reset',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware.checkTrainInitialized,
  (req, res) => trainController.resetTrain(req, res)
);

router.get('/train/stats',
  validationMiddleware.checkTrainInitialized,
  (req, res) => trainController.getTrainStats(req, res)
);

router.get('/train/allocation-errors',
  validationMiddleware.checkTrainInitialized,
  (req, res) => trainController.getAllocationErrors(req, res)
);

// ========== ADMIN FIX: Mark RAC as Boarded ==========
// Admin-only mutation — directly modifies in-memory train state
router.post('/admin/fix-rac-boarding',
  authMiddleware,
  requireRole(['ADMIN']),
  (req, res) => {
    try {
      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({ success: false, message: 'Train not initialized' });
      }

      const currentIdx = trainState.currentStationIdx;
      let fixed = 0;

      trainState.racQueue.forEach(rac => {
        if (rac.fromIdx <= currentIdx && !rac.boarded && !rac.noShow) {
          rac.boarded = true;
          fixed++;
        }
      });

      res.json({
        success: true,
        message: `Fixed ${fixed} RAC passengers marked as boarded`,
        data: {
          currentStation: trainState.stations[currentIdx]?.name,
          currentStationIdx: currentIdx,
          racQueueTotal: trainState.racQueue.length,
          nowBoarded: trainState.racQueue.filter(r => r.boarded).length,
          fixed: fixed
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

module.exports = router;
