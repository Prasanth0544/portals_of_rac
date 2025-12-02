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
const validationMiddleware = require('../middleware/validation');
const { authMiddleware, requireRole, requirePermission } = require('../middleware/auth'); // ✅ NEW

// ========== AUTHENTICATION ROUTES ========== ✅ NEW
// Staff Login (Admin + TTE)
router.post('/auth/staff/login',
  validationMiddleware.sanitizeBody,
  (req, res) => authController.staffLogin(req, res)
);

// Passenger Login
router.post('/auth/passenger/login',
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

// Passenger self-revert NO-SHOW status
router.post('/passenger/revert-no-show',
  // Note: Can add authMiddleware here if passenger authentication is required
  // For now allowing based on PNR validation in controller
  (req, res) => passengerController.selfRevertNoShow(req, res)
);


// Apply reallocation manually
router.post('/reallocation/apply',
  authMiddleware,
  requireRole(['ADMIN']),
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

router.post('/reallocation/apply',
  validationMiddleware.sanitizeBody,
  validationMiddleware.validateReallocation,
  validationMiddleware.checkTrainInitialized,
  (req, res) => reallocationController.applyReallocation(req, res)
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

// Set passenger online/offline status
router.post('/passenger/set-status',
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

// Mark individual passenger as NO_SHOW
router.post('/tte/mark-no-show',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.sanitizeBody,
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => tteController.markNoShow(req, res)
);

module.exports = router;