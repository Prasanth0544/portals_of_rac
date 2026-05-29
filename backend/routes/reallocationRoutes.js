// backend/routes/reallocationRoutes.js — Reallocation, station-wise approval & upgrade routes

const express = require('express');
const router = express.Router();
const reallocationController = require('../controllers/reallocationController');
const stationWiseApprovalController = require('../controllers/StationWiseApprovalController');
const trainController = require('../controllers/trainController');
const validationMiddleware = require('../middleware/validation');
const { authMiddleware, requireRole } = require('../middleware/auth');
const CurrentStationService = require('../services/CurrentStationReallocationService');
const AllocationService = require('../services/reallocation/AllocationService');

// ========== REALLOCATION ROUTES ==========
router.post('/passenger/no-show',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.sanitizeBody,
  validationMiddleware.validatePNR,
  validationMiddleware.checkTrainInitialized,
  (req, res) => reallocationController.markPassengerNoShow(req, res)
);

router.get('/train/rac-queue',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => reallocationController.getRACQueue(req, res)
);

router.get('/train/vacant-berths',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => reallocationController.getVacantBerths(req, res)
);

router.get('/passenger/search/:pnr',
  validationMiddleware.validatePNR,
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => reallocationController.searchPassenger(req, res)
);

router.get('/reallocation/eligibility',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => reallocationController.getEligibilityMatrix(req, res)
);

// Apply reallocation manually (Admin only with validation)
router.post('/reallocation/apply',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware.sanitizeBody,
  validationMiddleware.validateReallocation,
  validationMiddleware.checkTrainInitialized,
  (req, res) => reallocationController.applyReallocation(req, res)
);

// ========== STATION-WISE APPROVAL ROUTES ==========

// Get pending reallocations awaiting TTE approval
router.get('/reallocation/pending',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => stationWiseApprovalController.getPendingReallocations(req, res)
);

// Approve batch of reallocations
router.post('/reallocation/approve-batch',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.sanitizeBody,
  validationMiddleware.checkTrainInitialized,
  (req, res) => stationWiseApprovalController.approveBatch(req, res)
);

// Reject a specific reallocation
router.post('/reallocation/reject/:id',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.sanitizeBody,
  validationMiddleware.checkTrainInitialized,
  (req, res) => stationWiseApprovalController.rejectReallocation(req, res)
);

// Get station-wise data (for Admin portal)
router.get('/reallocation/station-wise',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => stationWiseApprovalController.getStationWiseData(req, res)
);

// Get approved reallocations (for Upgraded passengers tab)
router.get('/reallocation/approved',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  (req, res) => stationWiseApprovalController.getApprovedReallocations(req, res)
);

// Get current station HashMap matching data
router.get('/reallocation/current-station-matching',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  async (req, res) => {
    try {
      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({ error: 'Train not initialized' });
      }

      const data = CurrentStationService.getCurrentStationData(trainState);

      res.json({
        success: true,
        data: data
      });
    } catch (error) {
      console.error('Error getting current station matching data:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Create pending reallocations from current station matches
router.post('/reallocation/create-from-matches',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  async (req, res) => {
    try {
      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({ error: 'Train not initialized' });
      }

      const result = await CurrentStationService.createPendingReallocationsFromMatches(trainState);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error creating pending reallocations:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get station upgrade lock status
router.get('/reallocation/upgrade-status',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  async (req, res) => {
    try {
      const trainState = trainController.getGlobalTrainState();
      if (!trainState) {
        return res.status(400).json({ error: 'Train not initialized' });
      }

      res.json({
        success: true,
        data: {
          ...trainState.getUpgradeLockStatus(),
          pendingUpgrades: trainState.getPendingUpgrades(),
          completedUpgrades: trainState.stationUpgradeLock.completedUpgrades,
          rejectedUpgrades: trainState.stationUpgradeLock.rejectedUpgrades
        }
      });
    } catch (error) {
      console.error('Error getting upgrade status:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Approve an upgrade (TTE)
router.post('/reallocation/upgrade/:upgradeId/approve',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  async (req, res) => {
    try {
      const { upgradeId } = req.params;
      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({ error: 'Train not initialized' });
      }

      const pendingUpgrade = trainState.stationUpgradeLock.pendingUpgrades.find(
        u => u.upgradeId === upgradeId
      );

      if (!pendingUpgrade) {
        return res.status(404).json({ error: 'Upgrade not found or already processed' });
      }

      if (trainState.isBerthUsedForUpgrade(pendingUpgrade.berthId)) {
        return res.status(409).json({
          error: 'Berth already allocated to another passenger',
          berthId: pendingUpgrade.berthId
        });
      }

      if (trainState.isPassengerAlreadyUpgraded(pendingUpgrade.pnr)) {
        return res.status(409).json({
          error: 'Passenger already upgraded',
          pnr: pendingUpgrade.pnr
        });
      }

      const upgrade = trainState.completeUpgrade(upgradeId);

      await AllocationService.applyUpgrade(
        pendingUpgrade.pnr,
        pendingUpgrade.berthId,
        trainState
      );

      res.json({
        success: true,
        message: `Upgrade approved for ${pendingUpgrade.pnr}`,
        upgrade: upgrade
      });
    } catch (error) {
      console.error('Error approving upgrade:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Reject an upgrade (TTE)
router.post('/reallocation/upgrade/:upgradeId/reject',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  async (req, res) => {
    try {
      const { upgradeId } = req.params;
      const { reason } = req.body;
      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({ error: 'Train not initialized' });
      }

      const upgrade = trainState.rejectUpgrade(upgradeId, reason || 'Rejected by TTE');

      if (!upgrade) {
        return res.status(404).json({ error: 'Upgrade not found or already processed' });
      }

      res.json({
        success: true,
        message: `Upgrade rejected for ${upgrade.pnr}`,
        upgrade: upgrade
      });
    } catch (error) {
      console.error('Error rejecting upgrade:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Reset upgrade lock (force recalculate) — admin/TTE only
router.post('/reallocation/reset-upgrade-lock',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  async (req, res) => {
    try {
      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({ error: 'Train not initialized' });
      }

      trainState.unlockStationForUpgrades();

      res.json({
        success: true,
        message: 'Upgrade lock reset. You can now recalculate upgrades.'
      });
    } catch (error) {
      console.error('Error resetting upgrade lock:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ========== GROUP UPGRADE STATUS ==========

// Check if PNR has active group upgrade offer (for passenger reconnection)
router.get('/reallocation/group-upgrade-status/:pnr',
  (req, res) => reallocationController.getGroupUpgradeStatus(req, res)
);

module.exports = router;
