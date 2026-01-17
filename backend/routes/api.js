// backend/routes/api.js (WITH MIDDLEWARE)

const express = require('express');
const router = express.Router();
const trainController = require('../controllers/trainController');
const reallocationController = require('../controllers/reallocationController');
const passengerController = require('../controllers/passengerController');
const visualizationController = require('../controllers/visualizationController');
const configController = require('../controllers/configController');
const authController = require('../controllers/authController'); // ✅ NEW
const tteController = require('../controllers/tteController'); // ✅ NEW - TTE operations
const stationWiseApprovalController = require('../controllers/StationWiseApprovalController'); // ✅ NEW - Station-wise approval
const otpController = require('../controllers/otpController'); // ✅ NEW - OTP verification
const validationMiddleware = require('../middleware/validation');
const { authMiddleware, requireRole, requirePermission } = require('../middleware/auth'); // ✅ NEW
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter'); // ✅ Rate limiting
const CurrentStationService = require('../services/CurrentStationReallocationService');
const AllocationService = require('../services/reallocation/AllocationService');

// ========== AUTHENTICATION ROUTES ========== ✅ NEW
// Staff Login (Admin + TTE)
router.post('/auth/staff/login',
  authLimiter, // Rate limit: 5 attempts per 15 minutes
  validationMiddleware.sanitizeBody,
  (req, res) => authController.staffLogin(req, res)
);

// Passenger Login
router.post('/auth/passenger/login',
  authLimiter, // Rate limit: 5 attempts per 15 minutes
  validationMiddleware.sanitizeBody,
  (req, res) => authController.passengerLogin(req, res)
);

// Verify Token
router.get('/auth/verify',
  authMiddleware,
  (req, res) => authController.verifyToken(req, res)
);

// Logout
router.post('/auth/logout',
  authMiddleware,
  (req, res) => authController.logout(req, res)
);

// Refresh access token
router.post('/auth/refresh',
  (req, res) => authController.refresh(req, res)
);

// Staff Registration (Admin + TTE) ✅ NEW
router.post('/auth/staff/register',
  authLimiter, // Rate limit to prevent abuse
  validationMiddleware.sanitizeBody,
  (req, res) => authController.staffRegister(req, res)
);

// Mark passenger as NO_SHOW
router.post('/tte/mark-no-show',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  (req, res) => tteController.markNoShow(req, res)
);

// Revert NO_SHOW status (TTE)
router.post('/tte/revert-no-show',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  (req, res) => tteController.revertNoShow(req, res)
);

// Passenger self-revert NO-SHOW status (requires authentication)
router.post('/passenger/revert-no-show',
  authMiddleware,
  (req, res) => passengerController.selfRevertNoShow(req, res)
);

// Get available boarding stations for change (next 3 forward stations)
router.get('/passenger/available-boarding-stations/:pnr',
  authMiddleware,
  (req, res) => passengerController.getAvailableBoardingStations(req, res)
);

// Change boarding station (one-time only, requires authentication)
router.post('/passenger/change-boarding-station',
  authMiddleware,
  (req, res) => passengerController.changeBoardingStation(req, res)
);

// Self-cancel ticket (passenger marks as NO-SHOW, requires authentication)
router.post('/passenger/self-cancel',
  authMiddleware,
  (req, res) => passengerController.selfCancelTicket(req, res)
);

// ✅ DUAL-APPROVAL: Passenger can approve their own RAC upgrade
router.post('/passenger/approve-upgrade',
  authMiddleware,
  (req, res) => passengerController.approveUpgrade(req, res)
);

// ✅ DUAL-APPROVAL: Get pending upgrades for a passenger
router.get('/passenger/pending-upgrades/:irctcId',
  authMiddleware,
  (req, res) => passengerController.getPendingUpgrades(req, res)
);

// ========== OTP ROUTES ==========
// Send OTP for verification
router.post('/otp/send',
  otpLimiter, // Rate limit: 3 requests per hour
  validationMiddleware.sanitizeBody,
  (req, res) => otpController.sendOTP(req, res)
);

// Verify OTP
router.post('/otp/verify',
  validationMiddleware.sanitizeBody,
  (req, res) => otpController.verifyOTP(req, res)
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

// ===== OFFLINE UPGRADE ROUTES =====

// ✅ NEW: Add offline upgrade to queue
router.post('/tte/offline-upgrades/add',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  (req, res) => tteController.addOfflineUpgrade(req, res)
);

// ✅ NEW: Get pending offline upgrades
router.get('/tte/offline-upgrades',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  (req, res) => tteController.getOfflineUpgrades(req, res)
);

// ✅ NEW: Confirm offline upgrade
router.post('/tte/offline-upgrades/confirm',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  (req, res) => tteController.confirmOfflineUpgrade(req, res)
);

// ✅ NEW: Reject offline upgrade
router.post('/tte/offline-upgrades/reject',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  (req, res) => tteController.rejectOfflineUpgrade(req, res)
);

// ========== ACTION HISTORY & UNDO ROUTES ========== ✅ NEW
// Get action history
router.get('/tte/action-history',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  (req, res) => tteController.getActionHistory(req, res)
);

// Undo action
router.post('/tte/undo',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  (req, res) => tteController.undoAction(req, res)
);

// ========== TRAIN ROUTES ==========
router.get('/trains', (req, res) => trainController.list(req, res));
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
        hasMongoUri: !!config.mongoUri,  // Don't expose the actual URI!
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

router.post('/train/initialize',
  validationMiddleware.sanitizeBody,
  validationMiddleware.validateTrainInit,
  (req, res) => trainController.initializeTrain(req, res)
);

router.post('/train/start-journey',
  validationMiddleware.checkTrainInitialized,
  (req, res) => trainController.startJourney(req, res)
);

router.get('/train/state',
  validationMiddleware.checkTrainInitialized,
  (req, res) => trainController.getTrainState(req, res)
);

router.post('/train/next-station',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => trainController.moveToNextStation(req, res)
);

router.post('/train/reset',
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

// ========== REALLOCATION ROUTES ==========
router.post('/passenger/no-show',
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

// ========== STATION-WISE APPROVAL ROUTES ========== ✅ NEW
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
  validationMiddleware.checkTrainInitialized,
  (req, res) => stationWiseApprovalController.getApprovedReallocations(req, res)
);

// ✅ NEW - Get current station HashMap matching data
router.get('/reallocation/current-station-matching',
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

// ✅ NEW - Create pending reallocations from current station matches
router.post('/reallocation/create-from-matches',
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

// ✅ NEW - Get station upgrade lock status
router.get('/reallocation/upgrade-status',
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

// ✅ NEW - Approve an upgrade (TTE)
router.post('/reallocation/upgrade/:upgradeId/approve',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  async (req, res) => {
    try {
      const { upgradeId } = req.params;
      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({ error: 'Train not initialized' });
      }

      // Get upgrade details before completing
      const pendingUpgrade = trainState.stationUpgradeLock.pendingUpgrades.find(
        u => u.upgradeId === upgradeId
      );

      if (!pendingUpgrade) {
        return res.status(404).json({ error: 'Upgrade not found or already processed' });
      }

      // Check collision before approval
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

      // Complete the upgrade
      const upgrade = trainState.completeUpgrade(upgradeId);

      // Apply the actual upgrade (update passenger status, berth allocation)
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

// ✅ NEW - Reject an upgrade (TTE)
router.post('/reallocation/upgrade/:upgradeId/reject',
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

// ✅ NEW - Reset upgrade lock (force recalculate)
router.post('/reallocation/reset-upgrade-lock',
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

// ========== PASSENGER ROUTES ==========
router.get('/passengers/all',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  validationMiddleware.validatePagination,
  (req, res) => passengerController.getAllPassengers(req, res)
);

router.get('/passengers/status/:status',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => passengerController.getPassengersByStatus(req, res)
);

router.get('/passengers/counts',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => passengerController.getPassengerCounts(req, res)
);

// ========== VISUALIZATION ROUTES ==========
router.get('/visualization/station-schedule',
  (req, res) => visualizationController.getStationSchedule(req, res)
);

router.get('/visualization/segment-matrix',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => visualizationController.getSegmentMatrix(req, res)
);

router.get('/visualization/graph',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => visualizationController.getGraphData(req, res)
);

router.get('/visualization/heatmap',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => visualizationController.getHeatmap(req, res)
);

router.get('/visualization/berth-timeline/:coach/:berth',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => visualizationController.getBerthTimeline(req, res)
);

router.post('/passengers/add', validationMiddleware.validatePassengerAdd, validationMiddleware.checkTrainInitialized,
  (req, res) => passengerController.addPassenger(req, res)
);

router.get('/visualization/vacancy-matrix',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => visualizationController.getVacancyMatrix(req, res)
);

// ========== NEW PASSENGER PORTAL ROUTES ==========
// Public PNR lookup (requires journey to have started)
router.get('/passenger/pnr/:pnr',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => passengerController.getPNRDetails(req, res)
);

// Get passenger by IRCTC ID (for boarding pass)
router.get('/passengers/by-irctc/:irctcId',
  authMiddleware,
  requireRole(['PASSENGER']),
  (req, res) => passengerController.getPassengerByIRCTC(req, res)
);

// Self-cancellation (mark no-show)
router.post('/passenger/cancel',
  validationMiddleware.sanitizeBody,
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => passengerController.markNoShow(req, res)
);

// Set passenger online/offline status (requires authentication)
router.post('/passenger/set-status',
  authMiddleware,
  validationMiddleware.sanitizeBody,
  validationMiddleware.checkTrainInitialized,
  (req, res) => passengerController.setPassengerStatus(req, res)
);

// Upgrade notification endpoints
router.get('/passenger/upgrade-notifications/:pnr',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => passengerController.getUpgradeNotifications(req, res)
);

router.post('/passenger/accept-upgrade',
  validationMiddleware.sanitizeBody,
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => passengerController.acceptUpgrade(req, res)
);

router.post('/passenger/deny-upgrade',
  validationMiddleware.sanitizeBody,
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => passengerController.denyUpgrade(req, res)
);

// ========== TTE/ADMIN PORTAL ROUTES ==========

// Get all passengers with filters
router.get('/tte/passengers',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => tteController.getAllPassengersFiltered(req, res)
);

// Get only currently boarded passengers
router.get('/tte/boarded-passengers',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => tteController.getCurrentlyBoardedPassengers(req, res)
);

// Get currently boarded RAC passengers (for offline upgrades)
router.get('/tte/boarded-rac-passengers',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => tteController.getBoardedRACPassengers(req, res)
);

// Manual passenger operations
router.post('/tte/mark-boarded',
  validationMiddleware.sanitizeBody,
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => tteController.manualMarkBoarded(req, res)
);

router.post('/tte/mark-deboarded',
  validationMiddleware.sanitizeBody,
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => tteController.manualMarkDeboarded(req, res)
);

// TTE upgrade confirmation
router.post('/tte/confirm-upgrade',
  validationMiddleware.sanitizeBody,
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => tteController.confirmUpgrade(req, res)
);

// Journey statistics
router.get('/tte/statistics',
  validationMiddleware.checkTrainInitialized,
  (req, res) => tteController.getStatistics(req, res)
);

// Get upgraded passengers (RAC → CNF) from MongoDB
router.get('/tte/upgraded-passengers',
  validationMiddleware.checkTrainInitialized,
  (req, res) => tteController.getUpgradedPassengers(req, res)
);

// ========== TTE BOARDING VERIFICATION ROUTES ========== ✅ NEW
// Get boarding verification queue
router.get('/tte/boarding-queue',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  (req, res) => tteController.getBoardingQueue(req, res)
);

// Confirm all passengers boarded (bulk action)
router.post('/tte/confirm-all-boarded',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => tteController.confirmAllBoarded(req, res)
);

// NOTE: /tte/mark-no-show route defined above at lines 43-47 with proper auth middleware

// ========== TEMPORARY FIX: Mark RAC as Boarded ==========
router.post('/admin/fix-rac-boarding',
  (req, res) => {
    try {
      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({ success: false, message: 'Train not initialized' });
      }

      const currentIdx = trainState.currentStationIdx;
      let fixed = 0;

      // Mark all RAC passengers as boarded if they should be by now
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

// ========== PUSH NOTIFICATION ROUTES ========== ✅ NEW
// Get VAPID public key for push subscription
router.get('/push/vapid-public-key',
  (req, res) => passengerController.getVapidPublicKey(req, res)
);

// Subscribe to push notifications
router.post('/passenger/push-subscribe',
  (req, res) => passengerController.subscribeToPush(req, res)
);

// Unsubscribe from push notifications
router.post('/passenger/push-unsubscribe',
  (req, res) => passengerController.unsubscribeFromPush(req, res)
);

// NOTE: /passenger/revert-no-show route defined above at lines 57-61

// Get in-app notifications for passenger
router.get('/passenger/notifications',
  (req, res) => passengerController.getInAppNotifications(req, res)
);

// Mark notification as read
router.post('/passenger/notifications/:id/read',
  (req, res) => passengerController.markNotificationRead(req, res)
);

// Mark all notifications as read
router.post('/passenger/notifications/mark-all-read',
  (req, res) => passengerController.markAllNotificationsRead(req, res)
);

// ========== TTE PUSH NOTIFICATION ROUTES ==========
const PushSubscriptionService = require('../services/PushSubscriptionService');
const WebPushService = require('../services/WebPushService');

// TTE subscribe to push notifications
router.post('/tte/push-subscribe',
  authMiddleware,
  async (req, res) => {
    try {
      const { subscription } = req.body;
      const tteId = req.user.userId || req.user.employeeId || req.user.username || req.user.id;

      if (!tteId) {
        return res.status(400).json({ success: false, message: 'TTE ID not found in token' });
      }

      await PushSubscriptionService.addTTESubscription(tteId, subscription);

      res.json({ success: true, message: 'TTE subscribed to push notifications' });
    } catch (error) {
      console.error('❌ TTE push subscribe error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin subscribe to push notifications
router.post('/admin/push-subscribe',
  authMiddleware,
  async (req, res) => {
    try {
      const { subscription } = req.body;
      const adminId = req.user.userId || req.user.employeeId || req.user.username || req.user.id;

      if (!adminId) {
        return res.status(400).json({ success: false, message: 'Admin ID not found in token' });
      }

      await PushSubscriptionService.addAdminSubscription(adminId, subscription);

      res.json({ success: true, message: 'Admin subscribed to push notifications' });
    } catch (error) {
      console.error('❌ Admin push subscribe error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Get VAPID public key (for frontend push subscription)
router.get('/push/vapid-key', (req, res) => {
  res.json({
    success: true,
    vapidPublicKey: WebPushService.getVapidPublicKey()
  });
});


module.exports = router;