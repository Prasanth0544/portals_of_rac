// backend/routes/passengerRoutes.js — Passenger portal & visualization routes

const express = require('express');
const router = express.Router();
const passengerController = require('../controllers/passengerController');
const visualizationController = require('../controllers/visualizationController');
const validationMiddleware = require('../middleware/validation');
const { authMiddleware, requireRole } = require('../middleware/auth');

// ========== PASSENGER DATA ROUTES ==========

// Bulk passenger data — TTE/Admin only (contains PII)
router.get('/passengers/all',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  validationMiddleware.validatePagination,
  (req, res) => passengerController.getAllPassengers(req, res)
);

router.get('/passengers/status/:status',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => passengerController.getPassengersByStatus(req, res)
);

router.get('/passengers/counts',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => passengerController.getPassengerCounts(req, res)
);

// Add passenger — Admin only
router.post('/passengers/add',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware.validatePassengerAdd,
  validationMiddleware.checkTrainInitialized,
  (req, res) => passengerController.addPassenger(req, res)
);

// ========== PASSENGER PORTAL ROUTES ==========

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

// Self-cancellation (mark no-show — legacy route, requires auth)
router.post('/passenger/cancel',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
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

// ========== DUAL-APPROVAL UPGRADE ROUTES ==========

// Passenger can approve their own RAC upgrade
router.post('/passenger/approve-upgrade',
  authMiddleware,
  (req, res) => passengerController.approveUpgrade(req, res)
);

// Get pending upgrades for a passenger
router.get('/passenger/pending-upgrades/:irctcId',
  authMiddleware,
  (req, res) => passengerController.getPendingUpgrades(req, res)
);

// ========== CROSS-CLASS UPGRADE ROUTES ==========

// Get available cross-class upgrade options (SL → 3A/2A)
router.get('/passenger/upgrade-options/:irctcId',
  authMiddleware,
  (req, res) => passengerController.getUpgradeOptions(req, res)
);

// Request a cross-class upgrade
router.post('/passenger/request-cross-class-upgrade',
  authMiddleware,
  (req, res) => passengerController.requestCrossClassUpgrade(req, res)
);

// ========== UPGRADE NOTIFICATION ROUTES ==========

// Upgrade notification endpoints
router.get('/passenger/upgrade-notifications/:pnr',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => passengerController.getUpgradeNotifications(req, res)
);

router.post('/passenger/accept-upgrade',
  authMiddleware,
  requireRole(['PASSENGER']),
  validationMiddleware.sanitizeBody,
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => passengerController.acceptUpgrade(req, res)
);

router.post('/passenger/deny-upgrade',
  authMiddleware,
  requireRole(['PASSENGER']),
  validationMiddleware.sanitizeBody,
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => passengerController.denyUpgrade(req, res)
);

// ========== IN-APP NOTIFICATION ROUTES ==========

// In-app notifications — passenger must be authenticated
router.get('/passenger/notifications',
  authMiddleware,
  requireRole(['PASSENGER']),
  (req, res) => passengerController.getInAppNotifications(req, res)
);

// Mark notification as read
router.post('/passenger/notifications/:id/read',
  authMiddleware,
  requireRole(['PASSENGER']),
  (req, res) => passengerController.markNotificationRead(req, res)
);

// Mark all notifications as read
router.post('/passenger/notifications/mark-all-read',
  authMiddleware,
  requireRole(['PASSENGER']),
  (req, res) => passengerController.markAllNotificationsRead(req, res)
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

router.get('/visualization/vacancy-matrix',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => visualizationController.getVacancyMatrix(req, res)
);

module.exports = router;
