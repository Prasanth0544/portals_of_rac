// backend/controllers/passenger/index.js
// Facade — re-exports all sub-controllers as a single object so existing
// require('../controllers/passengerController') calls keep working.
//
// Sub-modules:
//   coreController.js          — PNR lookup, IRCTC lookup, add passenger, list/count/filter, no-show, vacant berths
//   upgradeController.js       — upgrade notifications, accept/deny, dual-approval
//   selfServiceController.js   — boarding station change, self-cancel, revert no-show, set status
//   notificationController.js  — in-app notifications, push subscribe/unsubscribe, VAPID key

const core = require('./coreController');
const upgrade = require('./upgradeController');
const selfService = require('./selfServiceController');
const notification = require('./notificationController');

module.exports = {
  // Core passenger data
  getPNRDetails: (req, res) => core.getPNRDetails(req, res),
  getPassengerByIRCTC: (req, res) => core.getPassengerByIRCTC(req, res),
  markNoShow: (req, res) => core.markNoShow(req, res),
  getVacantBerths: (req, res) => core.getVacantBerths(req, res),
  addPassenger: (req, res) => core.addPassenger(req, res),
  getAllPassengers: (req, res) => core.getAllPassengers(req, res),
  getPassengersByStatus: (req, res) => core.getPassengersByStatus(req, res),
  getPassengerCounts: (req, res) => core.getPassengerCounts(req, res),

  // Upgrades
  getUpgradeNotifications: (req, res) => upgrade.getUpgradeNotifications(req, res),
  acceptUpgrade: (req, res) => upgrade.acceptUpgrade(req, res),
  denyUpgrade: (req, res) => upgrade.denyUpgrade(req, res),
  getPendingUpgrades: (req, res) => upgrade.getPendingUpgrades(req, res),
  approveUpgrade: (req, res) => upgrade.approveUpgrade(req, res),
  getUpgradeOptions: (req, res) => upgrade.getUpgradeOptions(req, res),
  requestCrossClassUpgrade: (req, res) => upgrade.requestCrossClassUpgrade(req, res),

  // Self-service
  setPassengerStatus: (req, res) => selfService.setPassengerStatus(req, res),
  selfRevertNoShow: (req, res) => selfService.selfRevertNoShow(req, res),
  getAvailableBoardingStations: (req, res) => selfService.getAvailableBoardingStations(req, res),
  changeBoardingStation: (req, res) => selfService.changeBoardingStation(req, res),
  selfCancelTicket: (req, res) => selfService.selfCancelTicket(req, res),

  // Notifications & push
  getInAppNotifications: (req, res) => notification.getInAppNotifications(req, res),
  getUnreadCount: (req, res) => notification.getUnreadCount(req, res),
  markNotificationRead: (req, res) => notification.markNotificationRead(req, res),
  markAllNotificationsRead: (req, res) => notification.markAllNotificationsRead(req, res),
  subscribeToPush: (req, res) => notification.subscribeToPush(req, res),
  unsubscribeFromPush: (req, res) => notification.unsubscribeFromPush(req, res),
  getVapidPublicKey: (req, res) => notification.getVapidPublicKey(req, res),
};
