// backend/controllers/tte/index.js
// Facade — re-exports all TTE sub-controllers as a single object

const core = require('./coreController');
const noShow = require('./noShowController');
const upgrade = require('./upgradeController');

module.exports = {
  // Core TTE ops
  getAllPassengersFiltered: (req, res) => core.getAllPassengersFiltered(req, res),
  getCurrentlyBoardedPassengers: (req, res) => core.getCurrentlyBoardedPassengers(req, res),
  getBoardedRACPassengers: (req, res) => core.getBoardedRACPassengers(req, res),
  manualMarkBoarded: (req, res) => core.manualMarkBoarded(req, res),
  manualMarkDeboarded: (req, res) => core.manualMarkDeboarded(req, res),
  getStatistics: (req, res) => core.getStatistics(req, res),
  getBoardingQueue: (req, res) => core.getBoardingQueue(req, res),
  confirmAllBoarded: (req, res) => core.confirmAllBoarded(req, res),

  // No-show & undo
  markNoShow: (req, res) => noShow.markNoShow(req, res),
  revertNoShow: (req, res) => noShow.revertNoShow(req, res),
  getActionHistory: (req, res) => noShow.getActionHistory(req, res),
  undoAction: (req, res) => noShow.undoAction(req, res),

  // Upgrades
  confirmUpgrade: (req, res) => upgrade.confirmUpgrade(req, res),
  getUpgradedPassengers: (req, res) => upgrade.getUpgradedPassengers(req, res),
  addOfflineUpgrade: (req, res) => upgrade.addOfflineUpgrade(req, res),
  getOfflineUpgrades: (req, res) => upgrade.getOfflineUpgrades(req, res),
  confirmOfflineUpgrade: (req, res) => upgrade.confirmOfflineUpgrade(req, res),
  rejectOfflineUpgrade: (req, res) => upgrade.rejectOfflineUpgrade(req, res),
  getSentUpgradeOffers: (req, res) => upgrade.getSentUpgradeOffers(req, res),

  // Expose offline upgrades queue for backwards compatibility & tests
  get offlineUpgradesQueue() { return upgrade._memQueue; },
  set offlineUpgradesQueue(val) { upgrade._memQueue = val; },
};
