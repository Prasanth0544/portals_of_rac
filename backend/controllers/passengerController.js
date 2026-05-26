// backend/controllers/passengerController.js
// ──────────────────────────────────────────────────────────────────────────────
// FACADE — delegates to modular sub-controllers under ./passenger/
//
// Sub-modules:
//   passenger/coreController.js          — PNR lookup, IRCTC lookup, add, list, no-show, berths
//   passenger/upgradeController.js       — upgrade notifications, accept/deny, dual-approval
//   passenger/selfServiceController.js   — boarding station change, self-cancel, revert, status
//   passenger/notificationController.js  — in-app notifications, push subscribe, VAPID key
// ──────────────────────────────────────────────────────────────────────────────

module.exports = require('./passenger');
