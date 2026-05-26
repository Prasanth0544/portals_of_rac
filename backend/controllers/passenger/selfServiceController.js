// backend/controllers/passenger/selfServiceController.js
// Passenger self-service: boarding station change, self-cancel, revert no-show, set status

const db = require('../../config/db');
const wsManager = require('../../config/websocket');
const trainController = require('../trainController');

class PassengerSelfServiceController {
  async setPassengerStatus(req, res) {
    try {
      const { pnr, status } = req.body;
      if (!pnr || !status) return res.status(400).json({ success: false, message: 'PNR and status are required' });
      if (status !== 'online' && status !== 'offline') return res.status(400).json({ success: false, message: "Status must be 'online' or 'offline'" });
      const trainState = trainController.getGlobalTrainState();
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      const passengerLocation = trainState.findPassenger(pnr);
      if (!passengerLocation) return res.status(404).json({ success: false, message: 'Passenger not found' });
      const passenger = passengerLocation.passenger;
      const cap = status.charAt(0).toUpperCase() + status.slice(1);
      passenger.passengerStatus = cap;
      try {
        await db.getPassengersCollection().updateOne({ PNR_Number: pnr }, { $set: { Passenger_Status: cap } });
      } catch (dbError) {
        console.error('⚠️  Failed to update MongoDB:', dbError.message);
      }
      const racPassenger = trainState.racQueue.find(r => r.pnr === pnr);
      if (racPassenger) racPassenger.passengerStatus = cap;
      res.json({ success: true, message: `Passenger status updated to ${cap}`, data: { pnr, name: passenger.name, status: cap, pnrStatus: passenger.pnrStatus } });
    } catch (error) {
      console.error('❌ Error setting passenger status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async selfRevertNoShow(req, res) {
    try {
      const { pnr } = req.body;
      if (!pnr) return res.status(400).json({ success: false, message: 'PNR is required' });
      const trainState = trainController.getGlobalTrainState();
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      const result = await trainState.revertBoardedPassengerNoShow(pnr);
      res.json({ success: true, message: `NO-SHOW status reverted successfully for passenger ${pnr}`, pnr: result.pnr, passenger: result.passenger });
    } catch (error) {
      console.error('❌ Error self-reverting no-show:', error);
      if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
      if (error.message.includes('not marked as NO-SHOW')) return res.status(400).json({ success: false, message: error.message });
      if (error.message.includes('Cannot revert')) return res.status(409).json({ success: false, message: error.message });
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  async getAvailableBoardingStations(req, res) {
    try {
      const { pnr } = req.params;
      if (!pnr) return res.status(400).json({ success: false, message: 'PNR number is required' });

      let passenger = await db.getPassengersCollection().findOne({ $or: [{ PNR_Number: pnr }, { pnr }] });
      if (!passenger) {
        const trainState = trainController.getGlobalTrainState();
        if (trainState) {
          const mem = trainState.findPassengerByPNR(pnr);
          if (mem) passenger = { PNR_Number: mem.pnr || pnr, From: mem.from, To: mem.to, Boarding_Station: mem.from, Deboarding_Station: mem.to, boardingStationChanged: mem.boardingStationChanged || false };
        }
      }
      if (!passenger) return res.status(404).json({ success: false, message: 'Passenger not found' });
      if (passenger.boardingStationChanged) return res.json({ success: true, alreadyChanged: true, message: 'Boarding station has already been changed once', currentStation: passenger.Boarding_Station });

      const trainState = trainController.getGlobalTrainState();
      if (!trainState || !trainState.stations || trainState.stations.length === 0) return res.status(400).json({ success: false, message: 'Train journey not initialized' });

      const stations = trainState.stations;
      let currentStationIdx = passenger.From ? stations.findIndex(s => s.code === passenger.From) : -1;
      if (currentStationIdx === -1 && passenger.Boarding_Station) {
        currentStationIdx = stations.findIndex(s => s.name.toLowerCase() === passenger.Boarding_Station.toLowerCase() || s.name.toLowerCase().includes(passenger.Boarding_Station.toLowerCase()) || passenger.Boarding_Station.toLowerCase().includes(s.name.toLowerCase()));
      }
      if (currentStationIdx === -1) return res.status(400).json({ success: false, message: 'Current boarding station not found in route' });

      let toIdx = passenger.To ? stations.findIndex(s => s.code === passenger.To) : -1;
      if (toIdx === -1 && passenger.Deboarding_Station) {
        toIdx = stations.findIndex(s => s.name.toLowerCase() === passenger.Deboarding_Station.toLowerCase() || s.name.toLowerCase().includes(passenger.Deboarding_Station.toLowerCase()) || passenger.Deboarding_Station.toLowerCase().includes(s.name.toLowerCase()));
      }
      if (toIdx === -1) toIdx = stations.length;

      const available = [];
      for (let i = currentStationIdx + 1; i < Math.min(currentStationIdx + 4, toIdx); i++) {
        if (i < stations.length) available.push({ code: stations[i].code, name: stations[i].name, arrivalTime: stations[i].arrival });
      }

      res.json({ success: true, alreadyChanged: false, currentStation: { code: passenger.From, name: passenger.Boarding_Station }, availableStations: available, deboardingStation: { code: passenger.To, name: passenger.Deboarding_Station } });
    } catch (error) {
      console.error('❌ Error getting available boarding stations:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async changeBoardingStation(req, res) {
    try {
      const { pnr, irctcId, newStationCode } = req.body;
      if (!pnr || !irctcId || !newStationCode) return res.status(400).json({ success: false, message: 'PNR, IRCTC ID, and new station code are required' });
      const passenger = await db.getPassengersCollection().findOne({ $or: [{ PNR_Number: pnr, IRCTC_ID: irctcId }, { pnr, IRCTC_ID: irctcId }] });
      if (!passenger) return res.status(404).json({ success: false, message: 'Passenger not found or IRCTC ID does not match' });
      if (passenger.boardingStationChanged) return res.status(400).json({ success: false, message: 'Boarding station can only be changed once.' });
      const trainState = trainController.getGlobalTrainState();
      if (!trainState || !trainState.stations || !trainState.stations.length) return res.status(400).json({ success: false, message: 'Train journey not initialized' });
      const stations = trainState.stations;
      const currentStationIdx = stations.findIndex(s => s.code === passenger.From);
      const newStationIdx = stations.findIndex(s => s.code === newStationCode);
      const toIdx = stations.findIndex(s => s.code === passenger.To);
      if (newStationIdx === -1) return res.status(400).json({ success: false, message: 'Invalid station code' });
      if (newStationIdx <= currentStationIdx) return res.status(400).json({ success: false, message: 'Can only change to forward stations' });
      if (newStationIdx >= toIdx) return res.status(400).json({ success: false, message: 'New boarding station must be before deboarding station' });
      if (newStationIdx > currentStationIdx + 3) return res.status(400).json({ success: false, message: 'Can only change to one of the next 3 stations' });
      const newStation = stations[newStationIdx];
      const result = await db.getPassengersCollection().updateOne({ PNR_Number: pnr, IRCTC_ID: irctcId }, { $set: { Boarding_Station: newStation.name, From: newStation.code, boardingStationChanged: true, boardingStationChangedAt: new Date(), previousBoardingStation: passenger.Boarding_Station, previousFrom: passenger.From } });
      if (result.modifiedCount === 0) return res.status(500).json({ success: false, message: 'Failed to update boarding station' });
      if (trainState.passengers) {
        const mem = trainState.passengers.find(p => p.pnr === pnr);
        if (mem) { mem.from = newStation.code; mem.fromIdx = newStationIdx; }
      }
      res.json({ success: true, message: 'Boarding station changed successfully', newStation: { code: newStation.code, name: newStation.name }, previousStation: { code: passenger.From, name: passenger.Boarding_Station } });
    } catch (error) {
      console.error('❌ Error changing boarding station:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async selfCancelTicket(req, res) {
    try {
      const { pnr, irctcId } = req.body;
      if (!pnr || !irctcId) return res.status(400).json({ success: false, message: 'PNR and IRCTC ID are required' });
      const passenger = await db.getPassengersCollection().findOne({ $or: [{ PNR_Number: pnr, IRCTC_ID: irctcId }, { pnr, IRCTC_ID: irctcId }] });
      if (!passenger) return res.status(404).json({ success: false, message: 'Passenger not found or IRCTC ID does not match' });
      if (passenger.NO_show) return res.status(400).json({ success: false, message: 'Ticket is already cancelled' });
      const result = await db.getPassengersCollection().updateOne({ PNR_Number: pnr, IRCTC_ID: irctcId }, { $set: { NO_show: true, NO_show_timestamp: new Date(), selfCancelled: true, selfCancelledAt: new Date() } });
      if (result.modifiedCount === 0) return res.status(500).json({ success: false, message: 'Failed to cancel ticket' });
      const trainState = trainController.getGlobalTrainState();
      if (trainState) {
        const mem = trainState.findPassengerByPNR(pnr);
        if (mem) {
          mem.noShow = true;
          const loc = trainState.findPassenger(pnr);
          if (loc) { loc.berth.removePassenger(pnr); loc.berth.updateStatus(); }
        }
      }
      res.json({ success: true, message: 'Ticket cancelled successfully. Your berth will be made available for other passengers.', pnr });
    } catch (error) {
      console.error('❌ Error self-cancelling ticket:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new PassengerSelfServiceController();
