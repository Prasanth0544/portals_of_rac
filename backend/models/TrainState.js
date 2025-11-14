// backend/models/TrainState.js

const Berth = require('./Berth');
const SegmentMatrix = require('./SegmentMatrix');

class TrainState {
  constructor(trainNo, trainName) {
    this.trainNo = trainNo || global.RAC_CONFIG?.trainNo || "Unknown";
    this.trainName = trainName || global.RAC_CONFIG?.trainName || "Unknown Train";
    this.journeyDate = null;
    this.currentStationIdx = 0;
    this.journeyStarted = false;
    this.stations = [];
    this.coaches = [];
    this.racQueue = [];
    this.segmentMatrix = null;
    
    this.stats = {
      totalPassengers: 0,
      currentOnboard: 0,
      cnfPassengers: 0,
      racPassengers: 0,
      racCnfPassengers: 0,
      vacantBerths: 0,
      totalDeboarded: 0,
      totalNoShows: 0,
      totalRACUpgraded: 0,
      totalBoarded: 0
    };

    this.eventLogs = [];
  }

  /**
   * Initialize coaches with berths
   */
  initializeCoaches(sleeperCount = 9, threeAcCount = 0) {
    this.coaches = [];
    const totalSegments = this.stations.length - 1;

    // Sleeper coaches (S1..Sn)
    for (let i = 1; i <= sleeperCount; i++) {
      const coachNo = `S${i}`;
      const coach = { coachNo, class: 'SL', capacity: 72, berths: [] };
      for (let j = 1; j <= 72; j++) {
        const berthType = this.getBerthType(j);
        coach.berths.push(new Berth(coachNo, j, berthType, totalSegments));
      }
      this.coaches.push(coach);
    }

    // 3-Tier AC coaches (B1..Bn) — using same berth layout for parity
    for (let i = 1; i <= threeAcCount; i++) {
      const coachNo = `B${i}`;
      const coach = { coachNo, class: '3A', capacity: 72, berths: [] };
      for (let j = 1; j <= 72; j++) {
        const berthType = this.getBerthType(j);
        coach.berths.push(new Berth(coachNo, j, berthType, totalSegments));
      }
      this.coaches.push(coach);
    }

    this.segmentMatrix = new SegmentMatrix(this.stations);

    return this.coaches;
  }

  /**
   * Get berth type based on seat number
   */
  getBerthType(seatNo) {
    const berthMapping = {
      lowerBerths: [1, 4, 9, 12, 17, 20, 25, 28, 33, 36, 41, 44, 49, 52, 57, 60, 65, 68],
      middleBerths: [2, 5, 10, 13, 18, 21, 26, 29, 34, 37, 42, 45, 50, 53, 58, 61, 66, 69],
      upperBerths: [3, 6, 11, 14, 19, 22, 27, 30, 35, 38, 43, 46, 51, 54, 59, 62, 67, 70],
      sideLower: [7, 15, 23, 31, 39, 47, 55, 63, 71],
      sideUpper: [8, 16, 24, 32, 40, 48, 56, 64, 72]
    };

    if (berthMapping.lowerBerths.includes(seatNo)) return "Lower Berth";
    if (berthMapping.middleBerths.includes(seatNo)) return "Middle Berth";
    if (berthMapping.upperBerths.includes(seatNo)) return "Upper Berth";
    if (berthMapping.sideLower.includes(seatNo)) return "Side Lower";
    if (berthMapping.sideUpper.includes(seatNo)) return "Side Upper";
    
    return "Lower Berth";
  }

  /**
   * Start journey - Board all passengers at origin station
   */
  startJourney() {
    this.journeyStarted = true;
    
    // Board all passengers at the origin station (idx 0)
    let boardedCount = 0;
    this.coaches.forEach(coach => {
      coach.berths.forEach(berth => {
        berth.passengers.forEach(p => {
          // Board passengers whose journey starts at origin (idx 0)
          if (p.fromIdx === 0 && !p.boarded && !p.noShow) {
            p.boarded = true;
            boardedCount++;
          }
        });
      });
    });
    
    // Update statistics after boarding
    this.updateStats();
    
    console.log(`🚂 Journey Started: ${boardedCount} passengers boarded at origin`);
    this.logEvent('JOURNEY_STARTED', `Journey started - ${boardedCount} passengers boarded at origin`);
  }

  /**
   * Find berth by coach and seat number
   */
  findBerth(coachNo, seatNo) {
    const coach = this.coaches.find(c => c.coachNo === coachNo);
    if (!coach) return null;
    
    return coach.berths.find(b => b.berthNo == seatNo);
  }

  /**
   * Find passenger by PNR
   */
  findPassenger(pnr) {
    for (let coach of this.coaches) {
      for (let berth of coach.berths) {
        const passenger = berth.passengers.find(p => p.pnr === pnr);
        if (passenger) {
          return { berth, passenger, coachNo: coach.coachNo };
        }
      }
    }
    return null;
  }

  /**
   * Update statistics
   */
  updateStats() {
    let totalOnboard = 0;
    let vacant = 0;
    let occupied = 0;
    const currentIdx = this.currentStationIdx;
    
    this.coaches.forEach(coach => {
      coach.berths.forEach(berth => {
        // Count berth status at CURRENT station using segment occupancy
        if (berth.segmentOccupancy && berth.segmentOccupancy[currentIdx] === null) {
          vacant++;
        } else if (berth.segmentOccupancy && berth.segmentOccupancy[currentIdx] !== null) {
          occupied++;
        }
        
        // Count boarded passengers (actual people, not berths)
        const boardedPassengers = berth.getBoardedPassengers();
        totalOnboard += boardedPassengers.length;
      });
    });
    
    this.stats.currentOnboard = totalOnboard;
    this.stats.vacantBerths = vacant;
    this.stats.occupiedBerths = occupied;
    this.stats.racPassengers = this.racQueue.length;
    this.stats.totalBoarded = totalOnboard;
    
    // Debug log to verify counts
    console.log(`📊 Stats Update: Vacant=${vacant}, Occupied=${occupied}, Total=${vacant + occupied}, Onboard=${totalOnboard}, RAC Queue=${this.racQueue.length}`);
  }

  /**
   * Get current station
   */
  getCurrentStation() {
    return this.stations[this.currentStationIdx] || null;
  }

  /**
   * Check if journey is complete
   */
  isJourneyComplete() {
    return this.currentStationIdx >= this.stations.length - 1;
  }

  /**
   * Log event
   */
  logEvent(type, message, data = {}) {
    this.eventLogs.push({
      timestamp: new Date().toISOString(),
      station: this.getCurrentStation()?.name || 'Unknown',
      stationIdx: this.currentStationIdx,
      type: type,
      message: message,
      data: data
    });
  }

  /**
   * Get vacant berths
   */
  getVacantBerths() {
    const vacant = [];
    this.coaches.forEach(coach => {
      coach.berths.forEach(berth => {
        if (berth.status === 'VACANT') {
          vacant.push({
            coachNo: coach.coachNo,
            berthNo: berth.berthNo,
            fullBerthNo: berth.fullBerthNo,
            type: berth.type,
            class: coach.class,
            vacantSegments: berth.getVacantSegments()
          });
        }
      });
    });
    return vacant;
  }

  /**
   * Get all passengers
   */
  getAllPassengers() {
    const passengers = [];
    this.coaches.forEach(coach => {
      coach.berths.forEach(berth => {
        berth.passengers.forEach(p => {
          passengers.push({
            ...p,
            coach: coach.coachNo,
            berth: berth.fullBerthNo,
            berthType: berth.type
          });
        });
      });
    });
    return passengers;
  }
}

module.exports = TrainState;