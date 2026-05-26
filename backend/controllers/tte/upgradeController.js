// backend/controllers/tte/upgradeController.js
// Upgrade management: confirm upgrade, offline upgrades queue, upgraded passengers list
// Queue uses Redis when available, falls back to in-memory array

const db = require('../../config/db');
const wsManager = require('../../config/websocket');
const trainController = require('../trainController');
const ReallocationService = require('../../services/ReallocationService');

const REDIS_KEY = 'tte:offline_upgrades';

class TTEUpgradeController {
  // In-memory fallback queue
  _memQueue = [];

  // ═══════ Queue helpers (Redis with in-memory fallback) ═══════

  _getRedis() {
    try {
      const rc = require('../../config/redisClient');
      return rc.isAvailable() ? rc.getClient() : null;
    } catch { return null; }
  }

  async _getAllQueue() {
    const redis = this._getRedis();
    if (redis) {
      try {
        const items = await redis.lrange(REDIS_KEY, 0, -1);
        return items.map(i => JSON.parse(i));
      } catch { /* fall through */ }
    }
    return this._memQueue;
  }

  async _addToQueue(entry) {
    this._memQueue.push(entry);
    const redis = this._getRedis();
    if (redis) {
      try { await redis.rpush(REDIS_KEY, JSON.stringify(entry)); } catch { /* ignore */ }
    }
  }

  async _updateInQueue(matchFn, updates) {
    // Update in-memory
    const memIdx = this._memQueue.findIndex(matchFn);
    if (memIdx !== -1) Object.assign(this._memQueue[memIdx], updates);

    // Update in Redis (rebuild the matching item)
    const redis = this._getRedis();
    if (redis) {
      try {
        const items = await redis.lrange(REDIS_KEY, 0, -1);
        for (let i = 0; i < items.length; i++) {
          const parsed = JSON.parse(items[i]);
          if (matchFn(parsed)) {
            Object.assign(parsed, updates);
            await redis.lset(REDIS_KEY, i, JSON.stringify(parsed));
            break;
          }
        }
      } catch { /* ignore */ }
    }
  }

  async _findInQueue(matchFn) {
    const all = await this._getAllQueue();
    return all.find(matchFn) || null;
  }

  // ═══════ Endpoints ═══════

  async confirmUpgrade(req, res) {
    try {
      const { pnr, notificationId } = req.body;
      if (!pnr || !notificationId) return res.status(400).json({ success: false, message: 'Missing required fields: pnr, notificationId' });
      if (typeof pnr !== 'string' || pnr.length !== 10) return res.status(400).json({ success: false, message: 'Invalid PNR format' });
      const UpgradeNotificationService = require('../../services/UpgradeNotificationService');
      const trainState = trainController.getGlobalTrainState(req.query.trainNo || req.body.trainNo);
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      const allNotifications = UpgradeNotificationService.getAllNotifications(pnr, trainState.trainNo);
      const notification = allNotifications.find(n => n.id === notificationId);
      if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
      if (notification.status !== 'PENDING' && notification.status !== 'ACCEPTED') return res.status(400).json({ success: false, message: `Notification already ${notification.status.toLowerCase()}` });
      const acceptedNotification = UpgradeNotificationService.acceptUpgrade(pnr, notificationId, trainState.trainNo);
      const upgradeResult = await ReallocationService.upgradeRACPassengerWithCoPassenger(pnr, { coachNo: acceptedNotification.offeredCoach, berthNo: acceptedNotification.offeredSeatNo }, trainState);
      const user = req.user || { username: 'TTE' };
      const passenger = trainState.findPassengerByPNR(pnr);
      if (passenger) {
        trainState.recordAction('APPLY_UPGRADE', pnr, { pnrStatus: 'RAC' }, { pnrStatus: 'CNF', coach: acceptedNotification.offeredCoach, seat: acceptedNotification.offeredSeatNo }, user.username);
        try {
          const WebPushService = require('../../services/WebPushService');
          if (passenger.irctcId || passenger.IRCTC_ID) {
            await WebPushService.sendPushNotification(passenger.irctcId || passenger.IRCTC_ID, { title: '🎉 Upgrade Confirmed!', body: `Your RAC ticket has been upgraded to ${acceptedNotification.offeredCoach}-${acceptedNotification.offeredSeatNo}`, url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/passenger`, tag: `upgrade-${pnr}` });
          }
        } catch (e) { console.error('⚠️ Failed to send push notification:', e); }
      }
      if (wsManager) {
        wsManager.broadcastTrainUpdate('TTE_UPGRADE_CONFIRMED', { pnr, upgrade: upgradeResult });
        wsManager.notifyUpgradeConfirmed(pnr, { notificationId, newBerth: acceptedNotification.offeredBerth, coach: acceptedNotification.offeredCoach, confirmedAt: new Date().toISOString() });
      }
      res.json({ success: true, message: 'Upgrade confirmed by TTE', data: upgradeResult });
    } catch (error) {
      console.error('❌ Error confirming upgrade:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getUpgradedPassengers(req, res) {
    try {
      const passengersCollection = db.getPassengersCollection();
      const config = db.getConfig();
      const upgraded = await passengersCollection.find({ Upgraded_From: 'RAC' }).toArray();
      res.json({ success: true, data: { collection: config.passengersCollection, count: upgraded.length, passengers: upgraded.map(p => ({ pnr: p.PNR_Number, name: p.Name, age: p.Age, gender: p.Gender, mobile: p.Mobile, email: p.Email, pnrStatus: p.PNR_Status, previousRacStatus: p.Rac_status, coach: p.Assigned_Coach, berth: p.Assigned_Berth, berthType: p.Berth_Type, class: p.Class, from: p.Boarding_Station, to: p.Deboarding_Station, boarded: p.Boarded, upgradedFrom: p.Upgraded_From })) } });
    } catch (error) {
      console.error('❌ Error getting upgraded passengers:', error);
      res.status(500).json({ success: false, message: 'Failed to get upgraded passengers', error: error.message });
    }
  }

  async addOfflineUpgrade(req, res) {
    try {
      const { pnr, berthDetails } = req.body;
      if (!pnr || !berthDetails) return res.status(400).json({ success: false, message: 'PNR and berth details are required' });
      const trainState = trainController.getGlobalTrainState(req.query.trainNo || req.body.trainNo);
      if (!trainState) return res.status(400).json({ success: false, message: 'Train state not initialized' });
      const passenger = trainState.racQueue.find(p => p.pnr === pnr);
      if (!passenger) return res.status(404).json({ success: false, message: 'Passenger not found in RAC queue' });

      const entry = { id: `OFFLINE_${Date.now()}_${pnr}`, pnr, passengerName: passenger.name, currentStatus: passenger.pnrStatus, racNumber: passenger.racStatus, from: passenger.from, to: passenger.to, class: passenger.class, age: passenger.age, gender: passenger.gender, offeredBerth: `${berthDetails.coach}-${berthDetails.berthNo}`, coach: berthDetails.coach, berthNo: berthDetails.berthNo, berthType: berthDetails.type || 'Lower', addedAt: new Date().toISOString(), status: 'pending' };

      // Check if already queued — update or add
      const existing = await this._findInQueue(u => u.pnr === pnr);
      if (existing) {
        await this._updateInQueue(u => u.pnr === pnr, entry);
      } else {
        await this._addToQueue(entry);
      }

      res.json({ success: true, message: `Added ${passenger.name} to offline upgrades queue`, data: entry });
    } catch (error) {
      console.error('❌ Error adding offline upgrade:', error);
      res.status(500).json({ success: false, message: 'Failed to add offline upgrade', error: error.message });
    }
  }

  async getOfflineUpgrades(req, res) {
    try {
      const all = await this._getAllQueue();
      const pending = all.filter(u => u.status === 'pending');
      res.json({ success: true, data: { total: pending.length, upgrades: pending } });
    } catch (error) {
      console.error('❌ Error getting offline upgrades:', error);
      res.status(500).json({ success: false, message: 'Failed to get offline upgrades', error: error.message });
    }
  }

  async confirmOfflineUpgrade(req, res) {
    try {
      const { upgradeId } = req.body;
      if (!upgradeId) return res.status(400).json({ success: false, message: 'Upgrade ID is required' });
      const upgrade = await this._findInQueue(u => u.id === upgradeId);
      if (!upgrade) return res.status(404).json({ success: false, message: 'Upgrade not found in queue' });
      const trainState = trainController.getGlobalTrainState(req.query.trainNo || req.body.trainNo);
      if (!trainState) return res.status(400).json({ success: false, message: 'Train state not initialized' });
      const result = await ReallocationService.upgradeRACPassengerWithCoPassenger(upgrade.pnr, { coachNo: upgrade.coach, berthNo: upgrade.berthNo }, trainState);
      if (result.success) {
        await this._updateInQueue(u => u.id === upgradeId, { status: 'confirmed', confirmedAt: new Date().toISOString() });
        if (wsManager) wsManager.broadcastStatsUpdate(trainState.stats);
        res.json({ success: true, message: `Successfully upgraded ${upgrade.passengerName}`, data: result });
      } else {
        res.status(400).json({ success: false, message: 'Upgrade failed', error: result.error });
      }
    } catch (error) {
      console.error('❌ Error confirming offline upgrade:', error);
      res.status(500).json({ success: false, message: 'Failed to confirm offline upgrade', error: error.message });
    }
  }

  async rejectOfflineUpgrade(req, res) {
    try {
      const { upgradeId } = req.body;
      const upgrade = await this._findInQueue(u => u.id === upgradeId);
      if (!upgrade) return res.status(404).json({ success: false, message: 'Upgrade not found' });
      await this._updateInQueue(u => u.id === upgradeId, { status: 'rejected', rejectedAt: new Date().toISOString() });
      res.json({ success: true, message: `Rejected upgrade for ${upgrade.passengerName}` });
    } catch (error) {
      console.error('❌ Error rejecting offline upgrade:', error);
      res.status(500).json({ success: false, message: 'Failed to reject offline upgrade', error: error.message });
    }
  }

  getSentUpgradeOffers(req, res) {
    try {
      const UpgradeNotificationService = require('../../services/UpgradeNotificationService');
      const trainNo = req.query.trainNo || req.body.trainNo;
      const sentOffers = UpgradeNotificationService.getAllSentNotifications(trainNo);
      res.json({ success: true, data: sentOffers, count: sentOffers.length, stats: { total: sentOffers.length, pending: sentOffers.filter(o => o.status === 'pending').length, accepted: sentOffers.filter(o => o.status === 'accepted').length, denied: sentOffers.filter(o => o.status === 'denied').length } });
    } catch (error) {
      console.error('Error fetching sent upgrade offers:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch sent upgrade offers', error: error.message });
    }
  }
}

module.exports = new TTEUpgradeController();
