// backend/controllers/tteController.js
// ──────────────────────────────────────────────────────────────────────────────
// FACADE — delegates to modular sub-controllers under ./tte/
//
// Sub-modules:
//   tte/coreController.js     — passenger list/filter, boarding, stats, queue
//   tte/noShowController.js   — mark/revert no-show, action history, undo
//   tte/upgradeController.js  — confirm upgrade, offline upgrades, sent offers
// ──────────────────────────────────────────────────────────────────────────────

module.exports = require('./tte');
