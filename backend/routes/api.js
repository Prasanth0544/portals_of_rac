// backend/routes/api.js — Route orchestrator
// Mounts domain-specific sub-routers. All routes are prefixed with /api by server.js.
//
// Sub-router breakdown:
//   authRoutes.js         — /auth/*, /otp/*
//   trainRoutes.js        — /trains/*, /train/*, /config/*, /admin/fix-rac-boarding
//   reallocationRoutes.js — /reallocation/*, /passenger/no-show, /passenger/search, /train/rac-queue, /train/vacant-berths
//   tteRoutes.js          — /tte/*
//   passengerRoutes.js    — /passenger/*, /passengers/*, /visualization/*
//   pushRoutes.js         — /push/*, push subscribe/unsubscribe, test endpoints
//   analyticsRoutes.js    — /analytics/* (Phase 2)
//   evaluationApi.js      — /evaluation/* (test harness)

const express = require('express');
const router = express.Router();

// Mount domain-specific route modules
router.use(require('./authRoutes'));
router.use(require('./trainRoutes'));
router.use(require('./reallocationRoutes'));
router.use(require('./tteRoutes'));
router.use(require('./passengerRoutes'));
router.use(require('./pushRoutes'));
router.use(require('./analyticsRoutes'));  // Phase 2 — Analytics & Audit
router.use('/evaluation', require('./evaluationApi'));  // Evaluation dashboard test harness

module.exports = router;