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

    // TTE Boarding Verification
    this.boardingVerificationQueue = new Map(); // PNR → VerificationData
    this.autoConfirmTimeout = null; // Timer for auto-confirmation
  }

  /**
   * Initialize coaches with berths
   */
  initializeCoaches(sleeperCount = 9, threeAcCount = 0) {
    this.coaches = [];
    const totalSegments = this.stations.length - 1;

    // Sleeper coaches (S1..Sn) - 72 berths
    for (let i = 1; i <= sleeperCount; i++) {
      const coachNo = `S${i}`;
      const coach = { coachNo, class: 'SL', capacity: 72, berths: [] };
      for (let j = 1; j <= 72; j++) {
        const berthType = this.getBerthType(j, 'SL');
        coach.berths.push(new Berth(coachNo, j, berthType, totalSegments));
      }
      this.coaches.push(coach);
    }

    // 3-Tier AC coaches (B1..Bn) - 64 berths with updated mapping
    for (let i = 1; i <= threeAcCount; i++) {
      const coachNo = `B${i}`;
      const coach = { coachNo, class: 'AC_3_Tier', capacity: 64, berths: [] };
      for (let j = 1; j <= 64; j++) {
        const berthType = this.getBerthType(j, 'AC_3_Tier');
        coach.berths.push(new Berth(coachNo, j, berthType, totalSegments));
      }
      this.coaches.push(coach);
    }

    this.segmentMatrix = new SegmentMatrix(this.stations);

    return this.coaches;
  }

  /**
   * Get berth type based on seat number and coach class
   */
  getBerthType(seatNo, coachClass = 'SL') {
    // Three_Tier_AC (3A) coaches use 64 berths with different mapping
    if (coachClass === 'AC_3_Tier') {
      return this.getBerthType3A(seatNo);
    }

    // Sleeper (SL) coaches use 72 berths
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
   * Get berth type for Three_Tier_AC (3A) coaches - 64 berths
   */
  getBerthType3A(seatNo) {
    const berthMapping3A = {
      lowerBerths: [1, 4, 9, 12, 17, 20, 25, 28, 33, 36, 41, 44, 49, 52, 57, 60],
      middleBerths: [2, 5, 10, 13, 18, 21, 26, 29, 34, 37, 42, 45, 50, 53, 58, 61],
      upperBerths: [3, 6, 11, 14, 19, 22, 27, 30, 35, 38, 43, 46, 51, 54, 59, 62],
      sideLower: [7, 15, 23, 31, 39, 47, 55, 63],  // RAC Berths
      sideUpper: [8, 16, 24, 32, 40, 48, 56, 64]
    };

    if (berthMapping3A.lowerBerths.includes(seatNo)) return "Lower Berth";
    if (berthMapping3A.middleBerths.includes(seatNo)) return "Middle Berth";
    if (berthMapping3A.upperBerths.includes(seatNo)) return "Upper Berth";
    if (berthMapping3A.sideLower.includes(seatNo)) return "Side Lower";
    if (berthMapping3A.sideUpper.includes(seatNo)) return "Side Upper";

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
   * Get coach class from berth
   */
  getCoachClassFromBerth(berth) {
    const coach = this.coaches.find(c => c.coachNo === berth.coachNo);
    return coach ? coach.class : 'SL';
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
        const passengersAtCurrentSegment = berth.segmentOccupancy[currentIdx] || [];

        if (passengersAtCurrentSegment.length === 0) {
          vacant++;  // Berth is vacant
        } else {
          occupied++;  // Berth is occupied (counts as 1 even if 2 RAC passengers share it)
        }

        // Count boarded passengers (actual people, not berths)
        const boardedPassengers = berth.getBoardedPassengers();
        totalOnboard += boardedPassengers.length;  // Counts 2 if 2 RAC passengers are boarded
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
   * Get all passengers (from berths AND RAC queue)
   */
  getAllPassengers() {
    const passengers = [];

    // Get passengers from berths (CNF passengers)
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

    // Also include RAC queue passengers (they may not be in berths yet)
    this.racQueue.forEach(rac => {
      // Check if this RAC passenger is already in the berth passengers
      const alreadyIncluded = passengers.find(p => p.pnr === rac.pnr);
      if (!alreadyIncluded) {
        passengers.push({
          ...rac,
          boarded: rac.boarded || false,
          noShow: rac.noShow || false
        });
      }
    });

    return passengers;
  }

  /**
   * ========================================
   * TTE BOARDING VERIFICATION METHODS
   * ========================================
   */

  /**
   * Prepare boarding verification queue when train arrives at station
   */
  prepareForBoardingVerification() {
    const currentIdx = this.currentStationIdx;

    // Clear previous queue
    this.boardingVerificationQueue.clear();
    if (this.autoConfirmTimeout) {
      clearTimeout(this.autoConfirmTimeout);
    }

    // Find all passengers scheduled to board at current station
    const scheduled = this.getAllPassengers().filter(
      p => p.fromIdx === currentIdx && !p.boarded && !p.noShow
    );

    // Add to queue
    scheduled.forEach(p => {
      this.boardingVerificationQueue.set(p.pnr, {
        pnr: p.pnr,
        name: p.name,
        pnrStatus: p.pnrStatus,
        racStatus: p.racStatus,
        from: p.from,
        to: p.to,
        coach: p.coach,
        berth: p.berth,
        verificationStatus: 'PENDING',
        timestamp: new Date()
      });
    });

    console.log(`📋 Boarding Verification: ${scheduled.length} passengers pending`);

    // Schedule auto-confirmation after 5 minutes
    this.autoConfirmTimeout = setTimeout(() => {
      if (this.boardingVerificationQueue.size > 0) {
        console.warn('⚠️ Auto-confirming boarding (TTE timeout)');
        this.confirmAllBoarded();
      }
    }, 5 * 60 * 1000);

    return scheduled.length;
  }

  /**
   * Confirm all passengers in queue as boarded
   */
  async confirmAllBoarded() {
    const passengers = Array.from(this.boardingVerificationQueue.keys());

    if (passengers.length === 0) {
      return { success: true, count: 0 };
    }

    console.log(`✅ Confirming ${passengers.length} passengers boarded`);

    const db = require('../config/db');

    for (const pnr of passengers) {
      const result = this.findPassenger(pnr);
      if (result) {
        const { passenger } = result;
        passenger.boarded = true;

        try {
          const passengersCollection = await db.getPassengersCollection();
          await passengersCollection.updateOne(
            { PNR_Number: pnr },
            { $set: { Boarded: true } }
          );
        } catch (error) {
          console.error(`Error updating passenger ${pnr}:`, error);
        }
      }
    }

    this.boardingVerificationQueue.clear();

    if (this.autoConfirmTimeout) {
      clearTimeout(this.autoConfirmTimeout);
      this.autoConfirmTimeout = null;
    }

    this.updateStats();

    this.logEvent('BOARDING_CONFIRMED', `All ${passengers.length} passengers confirmed`, {
      count: passengers.length,
      station: this.getCurrentStation()?.name
    });

    return { success: true, count: passengers.length };
  }

  /**
   * Mark individual passenger as NO_SHOW
   */
  async markNoShowFromQueue(pnr) {
    if (!this.boardingVerificationQueue.has(pnr)) {
      throw new Error(`PNR ${pnr} not found in verification queue`);
    }

    const queuedPassenger = this.boardingVerificationQueue.get(pnr);
    console.log(`❌ Marking ${pnr} as NO_SHOW`);

    const result = this.findPassenger(pnr);
    if (result) {
      const { passenger } = result;
      passenger.noShow = true;
      passenger.boarded = false;

      const db = require('../config/db');
      try {
        const passengersCollection = await db.getPassengersCollection();
        await passengersCollection.updateOne(
          { PNR_Number: pnr },
          { $set: { NO_show: true, Boarded: false } }
        );
      } catch (error) {
        console.error(`Error updating NO_SHOW for ${pnr}:`, error);
      }
    }

    this.boardingVerificationQueue.delete(pnr);
    this.updateStats();

    this.logEvent('NO_SHOW_MARKED', `Passenger marked NO_SHOW`, {
      pnr: pnr,
      station: this.getCurrentStation()?.name
    });

    return { success: true, pnr: pnr };
  }

  /**
   * Get boarding verification statistics
   */
  getVerificationStats() {
    const queue = Array.from(this.boardingVerificationQueue.values());

    return {
      total: queue.length,
      pending: queue.filter(p => p.verificationStatus === 'PENDING').length,
      currentStation: this.getCurrentStation()?.name || 'Unknown',
      hasQueue: queue.length > 0
    };
  }
}

module.exports = TrainState;