// backend/controllers/tte/noShowController.js
// No-show management: mark no-show, revert, action history, undo

const db = require('../../config/db');
const wsManager = require('../../config/websocket');
const trainController = require('../trainController');

class TTENoShowController {
  async markNoShow(req, res) {
    try {
      const { pnr } = req.body;
      if (!pnr) return res.status(400).json({ success: false, message: 'PNR is required' });
      const trainState = trainController.getGlobalTrainState(req.query.trainNo || req.body.trainNo);
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });

      // Capture berth info BEFORE marking no-show
      const location = trainState.findPassenger(pnr);
      let vacantBerthInfo = null;
      if (location) {
        vacantBerthInfo = { berth: location.berth, coachNo: location.coachNo, berthNo: location.berth.berthNo, fullBerthNo: location.berth.fullBerthNo, type: location.berth.type, class: location.coach?.class || 'SL', coachName: location.coach?.coach_name || location.coachNo };
      }

      const result = await trainState.markBoardedPassengerNoShow(pnr);

      // Store timestamp in MongoDB
      try {
        const passengersCollection = db.getPassengersCollection();
        await passengersCollection.updateOne({ PNR_Number: pnr }, { $set: { NO_show_timestamp: new Date() } });
      } catch (e) { console.error('⚠️ Failed to store NO-SHOW timestamp:', e); }

      // Send notifications
      const NotificationService = require('../../services/NotificationService');
      const InAppNotificationService = require('../../services/InAppNotificationService');
      try {
        const found = trainState.findPassenger(pnr);
        if (found && found.passenger) {
          const passenger = found.passenger;
          const passengerFromDB = await db.getPassengersCollection().findOne({ PNR_Number: pnr });
          const fullPassenger = { ...passenger, Email: passengerFromDB?.Email, Mobile: passengerFromDB?.Mobile, irctcId: passengerFromDB?.IRCTC_ID };
          await NotificationService.sendNoShowMarkedNotification(pnr, fullPassenger);
          const WebPushService = require('../../services/WebPushService');
          if (fullPassenger.irctcId) {
            await WebPushService.sendNoShowAlert(fullPassenger.irctcId, { pnr, berth: `${fullPassenger.coach}-${fullPassenger.berth}` });
            InAppNotificationService.createNotification(fullPassenger.irctcId, 'NO_SHOW_MARKED', { pnr, berth: `${passenger.coach}-${passenger.berth}`, coach: passenger.coach, message: 'You have been marked as NO-SHOW by TTE' });
          }
        }
      } catch (notifError) { console.error('❌ Failed to send no-show notification:', notifError); }

      // Process vacancy for upgrade offers
      if (vacantBerthInfo) {
        const currentStation = trainState.getCurrentStation();
        const ReallocationService = require('../../services/ReallocationService');
        try {
          const offerResult = await ReallocationService.processVacancyForUpgrade(trainState, vacantBerthInfo, currentStation);
          if (offerResult.error) console.warn(`⚠️ Vacancy processing had errors: ${offerResult.error}`);
          else if (offerResult.offersCreated > 0) console.log(`✅ Created ${offerResult.offersCreated} upgrade offer(s)`);
        } catch (e) { console.error('❌ Error processing vacancy for upgrades:', e); }
      }

      res.json({ success: true, message: `Passenger ${pnr} marked as NO_SHOW`, pnr: result.pnr });
    } catch (error) {
      console.error('❌ Error marking no-show:', error);
      if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
      if (error.message.includes('not boarded')) return res.status(400).json({ success: false, message: error.message });
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  async revertNoShow(req, res) {
    try {
      const { pnr } = req.body;
      if (!pnr) return res.status(400).json({ success: false, message: 'PNR is required' });
      const trainState = trainController.getGlobalTrainState(req.query.trainNo || req.body.trainNo);
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });

      // Check 30-minute time limit
      try {
        const passenger = await db.getPassengersCollection().findOne({ PNR_Number: pnr });
        if (!passenger) return res.status(404).json({ success: false, message: 'Passenger not found' });
        if (passenger.NO_show_timestamp) {
          const elapsed = (new Date() - new Date(passenger.NO_show_timestamp)) / (1000 * 60);
          if (elapsed > 30) return res.status(403).json({ success: false, message: '30-minute revert window has expired.', elapsedMinutes: Math.floor(elapsed) });
        }
      } catch (e) { console.error('⚠️ Error checking NO-SHOW timestamp:', e); }

      const result = await trainState.revertBoardedPassengerNoShow(pnr);
      res.json({ success: true, message: `NO-SHOW status reverted for passenger ${pnr}`, pnr: result.pnr, passenger: result.passenger });
    } catch (error) {
      console.error('❌ Error reverting no-show:', error);
      if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
      if (error.message.includes('not marked as NO-SHOW')) return res.status(400).json({ success: false, message: error.message });
      if (error.message.includes('Cannot revert')) return res.status(409).json({ success: false, message: error.message });
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  async getActionHistory(req, res) {
    try {
      const trainState = trainController.getGlobalTrainState(req.query.trainNo || req.body.trainNo);
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      res.json({ success: true, data: trainState.getActionHistory() });
    } catch (error) {
      console.error('❌ Error getting action history:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async undoAction(req, res) {
    try {
      const { actionId } = req.body;
      const trainState = trainController.getGlobalTrainState(req.query.trainNo || req.body.trainNo);
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      if (!actionId) return res.status(400).json({ success: false, message: 'Action ID is required' });
      const result = await trainState.undoLastAction(actionId);
      if (wsManager) wsManager.broadcastTrainUpdate('ACTION_UNDONE', { actionId, action: result.action });
      res.json({ success: true, message: 'Action undone successfully', data: result.action });
    } catch (error) {
      console.error('❌ Error undoing action:', error);
      const errMap = { 'Action not found': [404, 'ACTION_NOT_FOUND'], 'already undone': [409, 'ACTION_ALREADY_UNDONE'], 'too old to undo': [410, 'ACTION_EXPIRED'], 'Cannot undo actions from previous stations': [409, 'STATION_MISMATCH'], 'now occupied': [409, 'BERTH_COLLISION'], 'Unknown action type': [400, 'UNKNOWN_ACTION_TYPE'] };
      for (const [key, [status, code]] of Object.entries(errMap)) {
        if (error.message.includes(key)) return res.status(status).json({ success: false, error: error.message, code });
      }
      res.status(400).json({ success: false, error: error.message, code: 'UNDO_FAILED' });
    }
  }
}

module.exports = new TTENoShowController();
