// backend/routes/tteRoutes.js — TTE operations, offline upgrades, action history & boarding verification

const express = require('express');
const router = express.Router();
const tteController = require('../controllers/tteController');
const validationMiddleware = require('../middleware/validation');
const { authMiddleware, requireRole } = require('../middleware/auth');

// ========== TTE CORE OPERATIONS ==========

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

// ========== TTE/ADMIN PORTAL ROUTES ==========

// Get all passengers with filters
router.get('/tte/passengers',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => tteController.getAllPassengersFiltered(req, res)
);

// Get only currently boarded passengers
router.get('/tte/boarded-passengers',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => tteController.getCurrentlyBoardedPassengers(req, res)
);

// Get currently boarded RAC passengers (for offline upgrades)
router.get('/tte/boarded-rac-passengers',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => tteController.getBoardedRACPassengers(req, res)
);

// Manual passenger operations
router.post('/tte/mark-boarded',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.sanitizeBody,
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => tteController.manualMarkBoarded(req, res)
);

router.post('/tte/mark-deboarded',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.sanitizeBody,
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => tteController.manualMarkDeboarded(req, res)
);

// TTE upgrade confirmation
router.post('/tte/confirm-upgrade',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.sanitizeBody,
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => tteController.confirmUpgrade(req, res)
);

// Journey statistics
router.get('/tte/statistics',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  (req, res) => tteController.getStatistics(req, res)
);

// Get upgraded passengers (RAC → CNF) from MongoDB
router.get('/tte/upgraded-passengers',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validationMiddleware.checkTrainInitialized,
  (req, res) => tteController.getUpgradedPassengers(req, res)
);

// ========== OFFLINE UPGRADE ROUTES ==========

// Add offline upgrade to queue
router.post('/tte/offline-upgrades/add',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  (req, res) => tteController.addOfflineUpgrade(req, res)
);

// Get pending offline upgrades
router.get('/tte/offline-upgrades',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  (req, res) => tteController.getOfflineUpgrades(req, res)
);

// Confirm offline upgrade
router.post('/tte/offline-upgrades/confirm',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  (req, res) => tteController.confirmOfflineUpgrade(req, res)
);

// Reject offline upgrade
router.post('/tte/offline-upgrades/reject',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  (req, res) => tteController.rejectOfflineUpgrade(req, res)
);

// ========== ACTION HISTORY & UNDO ROUTES ==========

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

// ========== TTE BOARDING VERIFICATION ROUTES ==========

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

module.exports = router;
