// backend/controllers/tte/coreController.js
// Core TTE ops: passenger list/filter, boarding, deboarding, statistics, boarding queue

const db = require('../../config/db');
const wsManager = require('../../config/websocket');
const trainController = require('../trainController');

class TTECoreController {
  async getAllPassengersFiltered(req, res) {
    try {
      const { status, coach } = req.query;
      const trainState = trainController.getGlobalTrainState(req.query.trainNo || req.body.trainNo);
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      let passengers = trainState.getAllPassengers();
      if (status) {
        switch (status.toLowerCase()) {
          case 'boarded': passengers = passengers.filter(p => p.boarded); break;
          case 'pending': passengers = passengers.filter(p => !p.boarded && p.fromIdx >= trainState.currentStationIdx); break;
          case 'deboarded': passengers = passengers.filter(p => p.toIdx < trainState.currentStationIdx); break;
          case 'no-show': passengers = passengers.filter(p => p.noShow); break;
          case 'rac': passengers = passengers.filter(p => p.pnrStatus === 'RAC'); break;
          case 'cnf': passengers = passengers.filter(p => p.pnrStatus === 'CNF'); break;
        }
      }
      if (coach) passengers = passengers.filter(p => p.coach?.toLowerCase() === coach.toLowerCase());
      res.json({ success: true, data: { count: passengers.length, passengers } });
    } catch (error) {
      console.error('❌ Error getting filtered passengers:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getCurrentlyBoardedPassengers(req, res) {
    try {
      const trainState = trainController.getGlobalTrainState(req.query.trainNo || req.body.trainNo);
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      const currentIdx = trainState.currentStationIdx;
      const passengers = trainState.getAllPassengers().filter(p => p.boarded === true && p.fromIdx <= currentIdx && p.toIdx > currentIdx);
      res.json({ success: true, data: { currentStation: trainState.getCurrentStation()?.name, currentStationIdx: currentIdx, count: passengers.length, passengers } });
    } catch (error) {
      console.error('❌ Error getting boarded passengers:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getBoardedRACPassengers(req, res) {
    try {
      const trainState = trainController.getGlobalTrainState(req.query.trainNo || req.body.trainNo);
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      const currentIdx = trainState.currentStationIdx;
      const passengers = trainState.getAllPassengers().filter(p => p.pnrStatus === 'RAC' && p.boarded === true && p.fromIdx <= currentIdx && p.toIdx > currentIdx);
      const onlinePassengers = passengers.filter(p => p.passengerStatus?.toLowerCase() === 'online');
      const offlinePassengers = passengers.filter(p => p.passengerStatus?.toLowerCase() !== 'online');
      res.json({ success: true, data: { currentStation: trainState.getCurrentStation()?.name, currentStationIdx: currentIdx, total: passengers.length, online: onlinePassengers.length, offline: offlinePassengers.length, passengers, onlinePassengers, offlinePassengers } });
    } catch (error) {
      console.error('❌ Error getting boarded RAC passengers:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async manualMarkBoarded(req, res) {
    try {
      const { pnr } = req.body;
      if (!pnr) return res.status(400).json({ success: false, message: 'PNR number is required' });
      const passengersCollection = db.getPassengersCollection();
      const trainState = trainController.getGlobalTrainState(req.query.trainNo || req.body.trainNo);
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      const passenger = trainState.findPassengerByPNR(pnr);
      if (!passenger) return res.status(404).json({ success: false, message: 'Passenger not found' });
      passenger.boarded = true;
      trainState.stats.currentOnboard++;
      await passengersCollection.updateOne({ PNR_Number: pnr }, { $set: { Boarded: true } });
      if (wsManager) wsManager.broadcastTrainUpdate('PASSENGER_BOARDED', { pnr, name: passenger.name, stats: trainState.stats });
      res.json({ success: true, message: 'Passenger marked as boarded', data: { pnr, name: passenger.name } });
    } catch (error) {
      console.error('❌ Error marking boarded:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async manualMarkDeboarded(req, res) {
    try {
      const { pnr } = req.body;
      if (!pnr) return res.status(400).json({ success: false, message: 'PNR number is required' });
      const trainState = trainController.getGlobalTrainState(req.query.trainNo || req.body.trainNo);
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      const passenger = trainState.findPassengerByPNR(pnr);
      if (!passenger) return res.status(404).json({ success: false, message: 'Passenger not found' });
      const location = trainState.findPassenger(pnr);
      if (location) { location.berth.removePassenger(pnr); location.berth.updateStatus(); trainState.stats.currentOnboard--; trainState.stats.totalDeboarded++; }
      if (wsManager) wsManager.broadcastTrainUpdate('PASSENGER_DEBOARDED', { pnr, name: passenger.name, stats: trainState.stats });
      res.json({ success: true, message: 'Passenger marked as deboarded', data: { pnr, name: passenger.name } });
    } catch (error) {
      console.error('❌ Error marking deboarded:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  getStatistics(req, res) {
    try {
      const trainState = trainController.getGlobalTrainState(req.query.trainNo || req.body.trainNo);
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      const allPassengers = trainState.getAllPassengers();
      const stats = {
        train: { number: trainState.trainNo, name: trainState.trainName, currentStation: trainState.getCurrentStation()?.name || 'Unknown', currentStationIndex: trainState.currentStationIdx, totalStations: trainState.stations.length },
        passengers: { total: trainState.stats.totalPassengers, cnf: trainState.stats.cnfPassengers, rac: trainState.stats.racPassengers, racUpgraded: trainState.stats.totalRACUpgraded || 0, boarded: allPassengers.filter(p => p.boarded).length, pending: allPassengers.filter(p => !p.boarded && p.fromIdx >= trainState.currentStationIdx).length, deboarded: trainState.stats.totalDeboarded, noShows: trainState.stats.totalNoShows, currentOnboard: trainState.stats.currentOnboard },
        berths: { total: trainState.coaches.reduce((s, c) => s + c.berths.length, 0), occupied: trainState.coaches.reduce((s, c) => s + c.berths.filter(b => b.status === 'occupied').length, 0), vacant: trainState.stats.vacantBerths },
        racQueue: { count: trainState.racQueue.length, passengers: trainState.racQueue.map(r => ({ pnr: r.pnr, name: r.name, racNumber: r.racNumber, from: r.from, to: r.to, boarded: r.boarded || false })) }
      };
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('❌ Error getting statistics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  getBoardingQueue(req, res) {
    try {
      const trainState = trainController.getGlobalTrainState(req.query.trainNo || req.body.trainNo);
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      const queue = Array.from(trainState.boardingVerificationQueue.values());
      const stats = trainState.getVerificationStats();
      res.json({ success: true, data: { station: stats.currentStation, stats, passengers: queue } });
    } catch (error) {
      console.error('❌ Error getting boarding queue:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async confirmAllBoarded(req, res) {
    try {
      const trainState = trainController.getGlobalTrainState(req.query.trainNo || req.body.trainNo);
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      const result = await trainState.confirmAllBoarded();
      res.json({ success: true, message: `${result.count} passengers confirmed boarded`, count: result.count });
    } catch (error) {
      console.error('❌ Error confirming boarding:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new TTECoreController();
