/**
 * analyticsRoutes.js
 * All analytics & audit read routes — accessible by ADMIN only.
 * Mounted at /api via api.js.
 */

const express = require('express');
const router  = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const adminOnly = [authMiddleware, requireRole(['ADMIN'])];

// Dashboard KPIs
router.get('/analytics/dashboard',
    ...adminOnly,
    (req, res) => analyticsController.getDashboard(req, res)
);

// Journey history list (paginated)
router.get('/analytics/journey-history',
    ...adminOnly,
    (req, res) => analyticsController.getJourneyHistory(req, res)
);

// Single journey full detail
router.get('/analytics/journey-history/:trainNo/:date',
    ...adminOnly,
    (req, res) => analyticsController.getJourneyDetail(req, res)
);

// Upgrade audit trail for a journey (?trainNo=&date=)
router.get('/analytics/upgrade-history',
    ...adminOnly,
    (req, res) => analyticsController.getUpgradeHistory(req, res)
);

// Upgrade trail per passenger (/pnr/:pnr)
router.get('/analytics/upgrade-history/pnr/:pnr',
    ...adminOnly,
    (req, res) => analyticsController.getUpgradeHistoryByPNR(req, res)
);

// Manual re-aggregation trigger (admin POST)
router.post('/analytics/aggregate',
    ...adminOnly,
    (req, res) => analyticsController.triggerAggregate(req, res)
);

module.exports = router;
