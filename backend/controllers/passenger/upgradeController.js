// backend/controllers/passenger/upgradeController.js
// Upgrade notifications, accept/deny upgrades, dual-approval flows

const PassengerService = require('../../services/PassengerService');
const db = require('../../config/db');
const wsManager = require('../../config/websocket');
const trainController = require('../trainController');

class PassengerUpgradeController {
  getUpgradeNotifications(req, res) {
    try {
      const { pnr } = req.params;
      const UpgradeNotificationService = require('../../services/UpgradeNotificationService');
      const notifications = UpgradeNotificationService.getPendingNotifications(pnr);
      res.json({ success: true, data: { pnr, count: notifications.length, notifications } });
    } catch (error) {
      console.error('❌ Error getting upgrade notifications:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async acceptUpgrade(req, res) {
    try {
      const { pnr, notificationId } = req.body;
      if (!pnr || !notificationId) return res.status(400).json({ success: false, message: 'Missing required fields: pnr, notificationId' });
      const trainState = trainController.getGlobalTrainState();
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      const result = await PassengerService.acceptUpgrade(pnr, notificationId, trainState);
      if (wsManager) wsManager.broadcastTrainUpdate('RAC_UPGRADE_ACCEPTED', { pnr, notification: result.notification, passenger: result.passenger });
      res.json({ success: true, message: result.message, data: result });
    } catch (error) {
      console.error('❌ Error accepting upgrade:', error);
      const sc = error.message.includes('not found') ? 404 : error.message.includes('expired') || error.message.includes('already') ? 400 : 500;
      res.status(sc).json({ success: false, error: error.message });
    }
  }

  async denyUpgrade(req, res) {
    try {
      const { pnr, notificationId, reason } = req.body;
      if (!pnr || !notificationId) return res.status(400).json({ success: false, message: 'Missing required fields: pnr, notificationId' });
      const result = await PassengerService.denyUpgrade(pnr, notificationId);
      if (wsManager) wsManager.broadcastTrainUpdate('RAC_UPGRADE_DENIED', { pnr, notification: result.notification, reason: reason || 'Passenger declined' });
      res.json({ success: true, message: result.message, data: result.notification });
    } catch (error) {
      console.error('❌ Error denying upgrade:', error);
      const sc = error.message.includes('not found') ? 404 : error.message.includes('already') ? 400 : 500;
      res.status(sc).json({ success: false, error: error.message });
    }
  }

  async getPendingUpgrades(req, res) {
    try {
      const { irctcId } = req.params;
      if (!irctcId) return res.status(400).json({ success: false, message: 'IRCTC ID is required' });
      const coll = db.getStationReallocationCollection();
      const pending = await coll.find({ passengerIrctcId: irctcId, status: 'pending', approvalTarget: 'BOTH' }).toArray();
      res.json({
        success: true,
        data: {
          count: pending.length,
          upgrades: pending.map(u => ({
            id: u._id.toString(), pnr: u.passengerPNR, passengerName: u.passengerName,
            currentBerth: u.currentBerth, proposedCoach: u.proposedCoach, proposedBerth: u.proposedBerth,
            proposedBerthFull: u.proposedBerthFull, proposedBerthType: u.proposedBerthType,
            stationName: u.stationName, createdAt: u.createdAt
          }))
        }
      });
    } catch (error) {
      console.error('❌ Error getting pending upgrades:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async approveUpgrade(req, res) {
    try {
      const { upgradeId, irctcId } = req.body;
      if (!upgradeId || !irctcId) return res.status(400).json({ success: false, message: 'Upgrade ID and IRCTC ID are required' });
      const { ObjectId } = require('mongodb');
      const StationWiseApprovalService = require('../../services/StationWiseApprovalService');
      const coll = db.getStationReallocationCollection();
      const pending = await coll.findOne({ _id: new ObjectId(upgradeId), passengerIrctcId: irctcId, status: 'pending' });
      if (!pending) return res.status(404).json({ success: false, message: 'Upgrade offer not found or already processed' });
      if (pending.passengerIrctcId !== irctcId) return res.status(403).json({ success: false, message: 'You can only approve your own upgrade offers' });
      const trainState = trainController.getGlobalTrainState();
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      const result = await StationWiseApprovalService.approveBatch([upgradeId], 'PASSENGER_SELF', trainState);
      if (result.totalApproved > 0) {
        await coll.updateOne({ _id: new ObjectId(upgradeId) }, { $set: { approvedBy: 'PASSENGER', approvedAt: new Date() } });
        if (wsManager) wsManager.broadcastTrainUpdate('UPGRADE_APPROVED_BY_PASSENGER', { upgradeId, pnr: pending.passengerPNR, passengerName: pending.passengerName, proposedBerth: pending.proposedBerthFull });
        res.json({ success: true, message: 'Upgrade approved successfully!', data: { pnr: pending.passengerPNR, newBerth: pending.proposedBerthFull, coach: pending.proposedCoach } });
      } else {
        res.status(400).json({ success: false, message: result.errors?.[0] || 'Failed to approve upgrade' });
      }
    } catch (error) {
      console.error('❌ Error in passenger approveUpgrade:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/passenger/upgrade-options/:irctcId
   * Returns available cross-class upgrade berths (SL → 3A/2A) for a passenger
   */
  async getUpgradeOptions(req, res) {
    try {
      const { irctcId } = req.params;
      if (!irctcId) return res.status(400).json({ success: false, message: 'IRCTC ID is required' });

      const trainState = trainController.getGlobalTrainState(req.query.trainNo || req.body.trainNo);
      if (!trainState) return res.json({ success: true, data: { hasOptions: false, options: {}, message: 'Train not initialized' } });

      // Find passenger in the RAC queue
      const passenger = trainState.racQueue.find(r =>
        r.irctcId === irctcId || r.IRCTC_ID === irctcId
      );

      if (!passenger) {
        return res.json({ success: true, data: { hasOptions: false, options: {}, message: 'Passenger not found in RAC queue' } });
      }

      // Only Sleeper RAC passengers are eligible for cross-class upgrade
      const passengerClass = passenger.class || passenger.Class || '';
      if (passenger.pnrStatus !== 'RAC' || (passengerClass !== 'SL' && passengerClass !== 'Sleeper')) {
        return res.json({ success: true, data: { hasOptions: false, options: {}, message: 'Only Sleeper RAC passengers are eligible' } });
      }

      // Get vacant berths
      const ReallocationService = require('../../services/ReallocationService');
      const vacancies = ReallocationService.getVacantBerths(trainState);
      const currentStationIdx = trainState.currentStationIdx || 0;
      const stations = trainState.stations || [];

      // Per-km rates for higher classes
      const RATES = {
        'AC_3_Tier': 1.5,
        'AC_2_Tier': 2.5,
      };

      const CLASS_LABELS = {
        'AC_3_Tier': '3-Tier AC (3A)',
        'AC_2_Tier': '2nd AC (2A)',
      };

      // Calculate remaining distance (approximate: use station indices)
      const passengerToIdx = passenger.toIdx || stations.length - 1;
      const remainingStations = passengerToIdx - currentStationIdx;
      // Rough distance estimate: ~30km per station gap on average
      const remainingKm = Math.max(remainingStations * 30, 10);

      const options = {};

      vacancies.forEach(vacancy => {
        const vClass = vacancy.class;
        if (!RATES[vClass]) return; // Skip non-AC classes

        // Vacancy must cover passenger's remaining journey
        if (vacancy.fromIdx > currentStationIdx || vacancy.toIdx < passengerToIdx) return;

        // Must be currently vacant
        const isCurrentlyVacant = currentStationIdx >= vacancy.fromIdx && currentStationIdx < vacancy.toIdx;
        if (!isCurrentlyVacant) return;

        const ratePerKm = RATES[vClass];
        const cost = Math.round(remainingKm * ratePerKm);

        const deboard = stations[passengerToIdx]?.name || 'Unknown';
        const currentStation = stations[currentStationIdx]?.name || 'Unknown';

        if (!options[vClass]) options[vClass] = [];
        options[vClass].push({
          berth: {
            fullBerthNo: vacancy.berth,
            coach: vacancy.coach,
            berthNo: vacancy.berthNo,
            type: vacancy.type,
            class: vClass,
            classLabel: CLASS_LABELS[vClass] || vClass,
          },
          currentStation,
          deboard,
          remainingKm,
          ratePerKm,
          cost,
          costBreakdown: `${remainingKm} km × ₹${ratePerKm}/km`,
          targetClass: vClass,
        });
      });

      const hasOptions = Object.keys(options).length > 0;

      res.json({
        success: true,
        data: {
          hasOptions,
          options,
          passengerName: passenger.name,
          currentClass: passengerClass,
          pnrStatus: passenger.pnrStatus,
        }
      });

    } catch (error) {
      console.error('❌ Error getting upgrade options:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/passenger/request-cross-class-upgrade
   * Apply a cross-class upgrade (SL RAC → 3A/2A CNF)
   */
  async requestCrossClassUpgrade(req, res) {
    try {
      const { pnr, targetCoach, targetBerthNo } = req.body;
      if (!pnr || !targetCoach || targetBerthNo === undefined) {
        return res.status(400).json({ success: false, message: 'PNR, targetCoach, and targetBerthNo are required' });
      }

      const trainState = trainController.getGlobalTrainState(req.query.trainNo || req.body.trainNo);
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });

      // Find the passenger
      const passenger = trainState.racQueue.find(r => r.pnr === pnr);
      if (!passenger) return res.status(404).json({ success: false, message: 'Passenger not found in RAC queue' });

      if (passenger.pnrStatus !== 'RAC') {
        return res.status(400).json({ success: false, message: 'Only RAC passengers can request a cross-class upgrade' });
      }

      // Find the target berth and verify vacancy
      const fullBerthNo = `${targetCoach}-${targetBerthNo}`;
      const targetBerth = trainState.findBerth(targetCoach, parseInt(targetBerthNo));
      if (!targetBerth) return res.status(404).json({ success: false, message: `Berth ${fullBerthNo} not found` });

      // Apply the upgrade via AllocationService
      const AllocationService = require('../../services/reallocation/AllocationService');
      await AllocationService.upgradeRACPassengerWithCoPassenger(
        pnr,
        { coachNo: targetCoach, berthNo: targetBerthNo, fullBerthNo, type: targetBerth.type || 'Unknown' },
        trainState
      );

      // Broadcast the upgrade
      if (wsManager) {
        wsManager.broadcastTrainUpdate('CROSS_CLASS_UPGRADE', {
          pnr,
          passengerName: passenger.name,
          from: `RAC ${passenger.racStatus || ''}`,
          to: fullBerthNo,
        });
      }

      res.json({
        success: true,
        message: `Cross-class upgrade confirmed! New berth: ${fullBerthNo}`,
        data: { pnr, newBerth: fullBerthNo, coach: targetCoach }
      });

    } catch (error) {
      console.error('❌ Error in requestCrossClassUpgrade:', error);
      const sc = error.message.includes('not found') ? 404 : error.message.includes('already') ? 409 : 500;
      res.status(sc).json({ success: false, message: error.message });
    }
  }
}

module.exports = new PassengerUpgradeController();
