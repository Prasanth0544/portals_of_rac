// backend/controllers/passenger/coreController.js
// Core passenger data: PNR lookup, IRCTC lookup, add passenger, list/count/filter, no-show, vacant berths

const DataService = require('../../services/DataService');
const PassengerService = require('../../services/PassengerService');
const db = require('../../config/db');
const wsManager = require('../../config/websocket');
const trainController = require('../trainController');

class PassengerCoreController {
  async getPNRDetails(req, res) {
    try {
      const { pnr } = req.params;
      if (!pnr) return res.status(400).json({ success: false, message: 'PNR number is required' });
      const trainState = trainController.getGlobalTrainState();
      const passengerDetails = await PassengerService.getPassengerDetails(pnr, trainState);
      res.json({ success: true, data: passengerDetails });
    } catch (error) {
      console.error('❌ Error getting PNR details:', error);
      const statusCode = error.message === 'PNR not found' ? 404 : 500;
      res.status(statusCode).json({ success: false, error: error.message });
    }
  }

  async getPassengerByIRCTC(req, res) {
    try {
      const { irctcId } = req.params;
      if (!irctcId) return res.status(400).json({ success: false, message: 'IRCTC ID is required' });
      const passenger = await db.getPassengersCollection().findOne({ IRCTC_ID: irctcId });
      if (!passenger) return res.status(404).json({ success: false, message: 'No booking found for this IRCTC ID' });
      res.json({ success: true, data: passenger });
    } catch (error) {
      console.error('❌ Error getting passenger by IRCTC ID:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async markNoShow(req, res) {
    try {
      const { pnr } = req.body;
      if (!pnr) return res.status(400).json({ success: false, message: 'PNR number is required' });
      const passengersCollection = db.getPassengersCollection();
      const trainState = trainController.getGlobalTrainState();
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });

      const result = await passengersCollection.updateOne({ PNR_Number: pnr }, { $set: { NO_show: true } });
      if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'PNR not found' });

      const passenger = trainState.findPassengerByPNR(pnr);
      if (passenger) {
        passenger.noShow = true;
        const location = trainState.findPassenger(pnr);
        if (location) { location.berth.removePassenger(pnr); location.berth.updateStatus(); }
        trainState.stats.totalNoShows++;
        trainState.updateStats();
      }

      if (wsManager) wsManager.broadcastTrainUpdate('NO_SHOW_MARKED', { pnr, stats: trainState.stats });
      res.json({ success: true, message: 'Passenger marked as no-show successfully', data: { pnr } });
    } catch (error) {
      console.error('❌ Error marking no-show:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getVacantBerths(req, res) {
    try {
      const trainState = global.trainState;
      if (!trainState) return res.status(404).json({ success: false, message: 'Train not initialized' });

      const vacantBerthsList = [];
      const stations = trainState.stations;

      for (const coach of trainState.coaches) {
        for (const berth of coach.berths) {
          const vacantSegments = [];
          let segmentStart = null;

          for (let i = 0; i < berth.segments.length; i++) {
            if (berth.segments[i].status === 'vacant') {
              if (segmentStart === null) segmentStart = i;
              if (i === berth.segments.length - 1 || berth.segments[i + 1].status !== 'vacant') {
                vacantSegments.push({
                  startIdx: segmentStart, endIdx: i,
                  startStation: stations[segmentStart].code, endStation: stations[i + 1].code,
                  startStationName: stations[segmentStart].name, endStationName: stations[i + 1].name,
                });
                segmentStart = null;
              }
            }
          }

          if (vacantSegments.length > 0) {
            vacantBerthsList.push({
              berthId: berth.berth_id, berthNo: berth.berth_no,
              coachName: coach.coach_name, berthType: berth.berth_type,
              vacantSegments,
            });
          }
        }
      }

      res.json({ success: true, data: { totalVacant: vacantBerthsList.length, vacantBerths: vacantBerthsList } });
    } catch (error) {
      console.error('❌ Error getting vacant berths:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async addPassenger(req, res) {
    try {
      const passengerData = req.body;
      const required = ['irctc_id', 'pnr', 'name', 'age', 'gender', 'from', 'to', 'class', 'coach', 'seat_no'];
      for (const field of required) {
        if (!passengerData[field]) return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
      }
      const trainState = trainController.getGlobalTrainState();
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      const passengersCollection = db.getPassengersCollection();
      const fromStation = DataService.findStation(trainState.stations, passengerData.from);
      const toStation = DataService.findStation(trainState.stations, passengerData.to);
      if (!fromStation || !toStation) return res.status(400).json({ success: false, message: 'Invalid boarding or deboarding station' });
      if (fromStation.idx >= toStation.idx) return res.status(400).json({ success: false, message: 'To station must be after From station' });
      const existing = await passengersCollection.findOne({ pnr: passengerData.pnr });
      if (existing) return res.status(400).json({ success: false, message: 'PNR already exists' });
      const coach = trainState.coaches.find(c => c.coach_name === passengerData.coach);
      if (!coach) return res.status(400).json({ success: false, message: 'Invalid coach' });
      const berth = coach.berths.find(b => b.berth_no === passengerData.seat_no);
      if (!berth) return res.status(400).json({ success: false, message: 'Invalid berth number' });
      const isAvailable = this.checkBerthAvailability(berth, fromStation.idx, toStation.idx);
      if (!isAvailable) return res.status(400).json({ success: false, message: 'Berth not available for selected journey' });

      const newPassenger = {
        IRCTC_ID: passengerData.irctc_id || `IR_${Date.now()}`,
        PNR_Number: passengerData.pnr, Train_Number: trainState.trainNo,
        Train_Name: passengerData.train_name || trainState.trainName || 'Express',
        Journey_Date: passengerData.journey_date || trainState.journeyDate,
        Name: passengerData.name, Age: parseInt(passengerData.age), Gender: passengerData.gender,
        Mobile: passengerData.mobile || '', Email: passengerData.email || '',
        PNR_Status: passengerData.pnr_status || 'CNF', Class: passengerData.class,
        Rac_status: passengerData.rac_status || '-',
        Boarding_Station: passengerData.from, Deboarding_Station: passengerData.to,
        Assigned_Coach: passengerData.coach, Assigned_berth: parseInt(passengerData.seat_no),
        Berth_Type: berth.berth_type, Passenger_Status: passengerData.passenger_status || 'Offline',
        NO_show: false,
      };
      await passengersCollection.insertOne(newPassenger);

      if (!berth.segmentOccupancy) berth.segmentOccupancy = new Array(trainState.stations.length).fill(null);
      for (let i = fromStation.idx; i < toStation.idx; i++) berth.segmentOccupancy[i] = newPassenger.PNR_Number;
      if (berth.segments) {
        for (let i = fromStation.idx; i < toStation.idx; i++) { berth.segments[i].status = 'occupied'; berth.segments[i].pnr = newPassenger.PNR_Number; }
      }
      berth.updateStatus();
      trainState.stats.totalPassengers++;
      if (newPassenger.PNR_Status === 'RAC') {
        const racNumber = newPassenger.Rac_status ? parseInt(newPassenger.Rac_status) : 999;
        trainState.racQueue.push({
          pnr: newPassenger.PNR_Number, name: newPassenger.Name, age: newPassenger.Age,
          gender: newPassenger.Gender, racNumber, class: newPassenger.Class,
          from: fromStation.code, fromIdx: fromStation.idx, to: toStation.code, toIdx: toStation.idx,
          pnrStatus: newPassenger.PNR_Status,
          racStatus: newPassenger.Rac_status ? `RAC ${newPassenger.Rac_status}` : 'RAC',
          coach: newPassenger.Assigned_Coach, seatNo: newPassenger.Assigned_berth, berthType: newPassenger.Berth_Type,
        });
        trainState.racQueue.sort((a, b) => a.racNumber - b.racNumber);
        trainState.stats.racPassengers++;
      } else if (newPassenger.PNR_Status === 'CNF') {
        trainState.stats.cnfPassengers++;
      }
      trainState.stats.vacantBerths = this.countVacantBerths(trainState);
      if (wsManager) wsManager.broadcastTrainUpdate('PASSENGER_ADDED', { passenger: newPassenger, stats: trainState.stats });
      res.json({ success: true, message: 'Passenger added successfully', data: newPassenger });
    } catch (error) {
      console.error('❌ Error adding passenger:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  checkBerthAvailability(berth, fromIdx, toIdx) {
    const isRACBerth = berth.type === 'Side Lower';
    const maxAllowed = isRACBerth ? 2 : 1;
    if (berth.segmentOccupancy && Array.isArray(berth.segmentOccupancy)) {
      for (let i = fromIdx; i < toIdx; i++) {
        const occupants = berth.segmentOccupancy[i] || [];
        if (occupants.length >= maxAllowed) return false;
      }
      return true;
    }
    return false;
  }

  countVacantBerths(trainState) {
    let count = 0;
    const currentIdx = trainState.currentStationIdx;
    for (const coach of trainState.coaches) {
      for (const berth of coach.berths) {
        if (berth.segmentOccupancy && berth.segmentOccupancy[currentIdx] === null) count++;
      }
    }
    return count;
  }

  getAllPassengers(req, res) {
    try {
      const trainState = trainController.getGlobalTrainState();
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      const passengers = trainState.getAllPassengers();
      res.json({ success: true, data: { total: passengers.length, passengers } });
    } catch (error) {
      console.error('❌ Error getting all passengers:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  getPassengersByStatus(req, res) {
    try {
      const { status } = req.params;
      const trainState = trainController.getGlobalTrainState();
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      const allPassengers = trainState.getAllPassengers();
      let filtered = [];
      switch (status.toLowerCase()) {
        case 'cnf': filtered = allPassengers.filter(p => p.pnrStatus === 'CNF'); break;
        case 'rac': filtered = allPassengers.filter(p => p.pnrStatus.startsWith('RAC')); break;
        case 'boarded': filtered = allPassengers.filter(p => p.boarded); break;
        case 'no-show': filtered = allPassengers.filter(p => p.noShow); break;
        case 'upcoming': filtered = allPassengers.filter(p => p.fromIdx > trainState.currentStationIdx && !p.noShow); break;
        case 'missed': filtered = allPassengers.filter(p => p.fromIdx <= trainState.currentStationIdx && !p.boarded && !p.noShow); break;
        default: return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
      }
      res.json({ success: true, data: { status, count: filtered.length, passengers: filtered } });
    } catch (error) {
      console.error('❌ Error getting passengers by status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  getPassengerCounts(req, res) {
    try {
      const trainState = trainController.getGlobalTrainState();
      if (!trainState) return res.status(400).json({ success: false, message: 'Train not initialized' });
      const all = trainState.getAllPassengers();
      const counts = {
        total: all.length,
        cnf: all.filter(p => p.pnrStatus === 'CNF').length,
        rac: all.filter(p => p.pnrStatus === 'RAC').length,
        boarded: all.filter(p => p.boarded && !p.noShow).length,
        noShow: all.filter(p => p.noShow).length,
        online: all.filter(p => p.passengerStatus && p.passengerStatus.toLowerCase() === 'online').length,
        offline: all.filter(p => !p.passengerStatus || p.passengerStatus.toLowerCase() === 'offline').length,
      };
      res.json({ success: true, data: counts });
    } catch (error) {
      console.error('❌ Error getting passenger counts:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new PassengerCoreController();
