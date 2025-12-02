// backend/models/TrainState.js
// Last updated: 2025-11-28 11:34 - Implemented ALL vacant segments across journey

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
    this.actionHistory = []; // Action history for undo
    this.MAX_HISTORY_SIZE = 10; // Keep last 10 actions
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
        // Count boarded passengers (actual people)
        const boardedPassengers = berth.getBoardedPassengers();
        totalOnboard += boardedPassengers.length;

        // Count BERTHS (not passengers)
        // Occupied = berth has at least 1 boarded passenger
        // Vacant = berth has NO boarded passengers
        if (boardedPassengers.length > 0) {
          occupied++;  // This berth is occupied (1 or 2 passengers, still 1 berth)
        } else {
          vacant++;    // This berth is empty
        }
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
   * Get ALL vacant berth segments across the ENTIRE journey
   * Returns all vacant ranges for all berths (same berth can appear multiple times)
   */
  getVacantBerths() {
    const vacant = [];
    const currentIdx = this.currentStationIdx;

    console.log(`\n🔍 Getting ALL vacant berth segments across entire journey (current station index: ${currentIdx})`);

    this.coaches.forEach(coach => {
      coach.berths.forEach(berth => {
        // Find ALL vacant segment ranges for this berth (not just current)
        const vacantRanges = this._findAllVacantRanges(berth);

        // For each vacant range, create a row
        vacantRanges.forEach(range => {
          // Find who will occupy this berth at the END of this vacant range
          let willOccupyAt = 'Journey End';
          let willOccupyAtCode = '-';
          let nextPassenger = null;

          // Check passengers who board exactly at range.toIdx
          berth.passengers.forEach(passenger => {
            if (passenger.boarded || passenger.noShow) return;

            if (passenger.fromIdx === range.toIdx) {
              // Get station name for this boarding point
              const station = this.stations[passenger.fromIdx];
              willOccupyAt = station?.name || passenger.from;
              willOccupyAtCode = passenger.from; // Keep code for tooltip
              nextPassenger = passenger.pnr;
            }
          });

          console.log(`   📍 Berth: ${berth.fullBerthNo}, Vacant: ${range.fromStation} → ${range.toStation}, Will occupy: ${willOccupyAt}`);

          vacant.push({
            coachNo: coach.coachNo,
            berthNo: berth.berthNo,
            fullBerthNo: berth.fullBerthNo,
            type: berth.type,
            class: coach.class,
            vacantFromStation: range.fromStation,      // Station NAME
            vacantToStation: range.toStation,          // Station NAME  
            vacantFromStationCode: range.fromStationCode, // Code for tooltip
            vacantToStationCode: range.toStationCode,     // Code for tooltip
            vacantFromIdx: range.fromIdx,
            vacantToIdx: range.toIdx,
            willOccupyAt: willOccupyAt,                // Station NAME
            willOccupyAtCode: willOccupyAtCode,        // Code for tooltip
            nextPassengerPNR: nextPassenger,
            isCurrentlyVacant: range.fromIdx <= currentIdx && currentIdx < range.toIdx // Is it vacant NOW?
          });
        });
      });
    });

    console.log(`✅ Total vacant segments: ${vacant.length}\n`);
    return vacant;
  }

  /**
   * Helper: Find ALL vacant segment ranges for a berth across entire journey
   * REWRITTEN: Checks if segment is covered by ANY passenger's journey (fromIdx to toIdx)
   */
  _findAllVacantRanges(berth) {
    const ranges = [];
    let rangeStart = null;

    // For each segment, check if ANY passenger's journey covers it
    for (let segmentIdx = 0; segmentIdx < berth.segmentOccupancy.length; segmentIdx++) {

      // Check if this segment is covered by ANY passenger's journey
      let isOccupied = false;

      for (const passenger of berth.passengers) {
        // Skip no-show passengers
        if (passenger.noShow) {
          continue;
        }

        // Check if this segment is within passenger's journey range
        // Passenger occupies segments from fromIdx to toIdx-1 (inclusive)
        if (passenger.fromIdx <= segmentIdx && segmentIdx < passenger.toIdx) {
          isOccupied = true;
          break;
        }
      }

      if (!isOccupied) {
        // Segment is VACANT
        if (rangeStart === null) {
          rangeStart = segmentIdx;
        }
      } else {
        // Segment is OCCUPIED
        if (rangeStart !== null) {
          // End of vacant range
          ranges.push({
            fromIdx: rangeStart,
            toIdx: segmentIdx,
            fromStation: this.stations[rangeStart]?.name || this.stations[rangeStart]?.code || `Station ${rangeStart}`,
            toStation: this.stations[segmentIdx]?.name || this.stations[segmentIdx]?.code || `Station ${segmentIdx}`,
            fromStationCode: this.stations[rangeStart]?.code || `S${rangeStart}`,
            toStationCode: this.stations[segmentIdx]?.code || `S${segmentIdx}`
          });
          rangeStart = null;
        }
      }
    }

    // Handle final range extending to end of journey
    if (rangeStart !== null) {
      const endIdx = berth.segmentOccupancy.length;
      const endName = endIdx < this.stations.length ?
        (this.stations[endIdx]?.name || 'Journey End') :
        'Journey End';
      const endCode = endIdx < this.stations.length ?
        (this.stations[endIdx]?.code || 'END') :
        'END';

      ranges.push({
        fromIdx: rangeStart,
        toIdx: endIdx,
        fromStation: this.stations[rangeStart]?.name || this.stations[rangeStart]?.code || `Station ${rangeStart}`,
        toStation: endName,
        fromStationCode: this.stations[rangeStart]?.code || `S${rangeStart}`,
        toStationCode: endCode
      });
    }

    return ranges;
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
   * Mark boarded passenger as NO_SHOW
   * For passengers who are already boarded (not in verification queue)
   */
  async markBoardedPassengerNoShow(pnr) {
    const result = this.findPassenger(pnr);

    if (!result) {
      throw new Error(`Passenger with PNR ${pnr} not found`);
    }

    const { passenger } = result;

    if (!passenger.boarded) {
      throw new Error(`Passenger ${pnr} is not boarded`);
    }

    console.log(`❌ Marking boarded passenger ${pnr} as NO_SHOW`);

    // Update in-memory state
    passenger.noShow = true;
    passenger.boarded = false;

    // Update in database
    const db = require('../config/db');
    try {
      const passengersCollection = await db.getPassengersCollection();
      await passengersCollection.updateOne(
        { PNR_Number: pnr },
        { $set: { NO_show: true, Boarded: false } }
      );
      console.log(`✅ Updated NO_SHOW in database for ${pnr}`);
    } catch (error) {
      console.error(`Error updating NO_SHOW for ${pnr}:`, error);
      throw error;
    }

    this.updateStats();

    this.logEvent('NO_SHOW_MARKED', `Boarded passenger marked NO_SHOW`, {
      pnr: pnr,
      station: this.getCurrentStation()?.name
    });

    // Send notification to passenger (both online and offline)
    try {
      const NotificationService = require('../services/NotificationService');
      await NotificationService.sendNoShowMarkedNotification(pnr, passenger);
    } catch (error) {
      console.error(`Error sending no-show notification:`, error);
    }

    return { success: true, pnr: pnr };
  }

  /**
   * Revert NO-SHOW status for a passenger
   * Checks for berth collision before allowing revert
   */
  async revertBoardedPassengerNoShow(pnr) {
    const result = this.findPassenger(pnr);

    if (!result) {
      throw new Error(`Passenger with PNR ${pnr} not found`);
    }

    const { passenger } = result;

    if (!passenger.noShow) {
      throw new Error(`Passenger ${pnr} is not marked as NO-SHOW`);
    }

    // Check for berth collision
    const collision = this.checkBerthCollision(passenger.coach, passenger.berth, pnr);
    if (collision) {
      throw new Error(`Cannot revert: Berth ${passenger.coach}-${passenger.berth} has been allocated to another passenger (${collision.pnr})`);
    }

    console.log(`✅ Reverting NO-SHOW status for ${pnr}`);

    // Update in-memory state
    passenger.noShow = false;
    passenger.boarded = true;
    passenger.noShowRevertedAt = new Date();

    // Update in database
    const db = require('../config/db');
    try {
      const passengersCollection = await db.getPassengersCollection();
      await passengersCollection.updateOne(
        { PNR_Number: pnr },
        {
          $set: {
            NO_show: false,
            Boarded: true,
            NoShowRevertedAt: new Date()
          }
        }
      );
      console.log(`✅ Reverted NO-SHOW in database for ${pnr}`);
    } catch (error) {
      console.error(`Error reverting NO-SHOW for ${pnr}:`, error);
      throw error;
    }

    this.updateStats();

    this.logEvent('NO_SHOW_REVERTED', `NO-SHOW status reverted for passenger`, {
      pnr: pnr,
      station: this.getCurrentStation()?.name,
      berth: `${passenger.coach}-${passenger.berth}`
    });

    // Send notification to passenger (both online and offline)
    try {
      const NotificationService = require('../services/NotificationService');
      await NotificationService.sendNoShowRevertedNotification(pnr, passenger);
    } catch (error) {
      console.error(`Error sending revert notification:`, error);
    }

    return { success: true, pnr: pnr, passenger };
  }

  /**
   * Check if berth has been allocated to another passenger (collision detection)
   */
  checkBerthCollision(coach, berth, originalPnr) {
    // Search through all coaches
    for (const [coachName, coachData] of Object.entries(this.coaches)) {
      if (coachName !== coach) continue;

      // Search through all berths
      for (const [berthNum, berthData] of Object.entries(coachData.berths)) {
        if (parseInt(berthNum) !== parseInt(berth)) continue;

        // Check if berth is occupied by a different passenger
        if (berthData.passenger && berthData.passenger.pnr !== originalPnr) {
          const occupant = berthData.passenger;
          if (occupant.boarded && !occupant.noShow) {
            return {
              pnr: occupant.pnr,
              name: occupant.name,
              status: occupant.pnrStatus
            };
          }
        }
      }
    }

    return null; // No collision
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

  /**
   * ========== ACTION HISTORY & UNDO ==========
   * Record actions for undo functionality
   */
  recordAction(actionType, targetPNR, previousState, newState, performedBy = 'SYSTEM') {
    const { v4: uuidv4 } = require('uuid');

    const action = {
      actionId: uuidv4(),
      action: actionType,
      timestamp: new Date(),
      performedBy: performedBy,
      station: this.stations[this.currentStationIdx]?.name || 'Unknown',
      target: {
        pnr: targetPNR,
        name: this.findPassengerByPNR(targetPNR)?.Name || 'Unknown'
      },
      previousState: previousState,
      newState: newState,
      canUndo: true,
      undoneAt: null
    };

    // Add to stack
    this.actionHistory.push(action);

    // Limit stack size
    if (this.actionHistory.length > this.MAX_HISTORY_SIZE) {
      this.actionHistory.shift(); // Remove oldest
    }

    console.log(`📝 Recorded action: ${actionType} for ${targetPNR}`);

    return action;
  }

  /**
   * Undo the last action
   */
  async undoLastAction(actionId) {
    const db = require('../config/db');

    // Find the action by ID
    const action = this.actionHistory.find(a => a.actionId === actionId);

    if (!action) {
      throw new Error('Action not found');
    }

    // Check if can undo
    if (!action.canUndo) {
      throw new Error('This action can no longer be undone');
    }

    if (action.undoneAt) {
      throw new Error('Action already undone');
    }

    // Time limit: 30 minutes
    const timeDiff = Date.now() - new Date(action.timestamp).getTime();
    if (timeDiff > 30 * 60 * 1000) {
      throw new Error('Action is too old to undo (>30 minutes)');
    }

    // Station check
    if (action.station !== this.stations[this.currentStationIdx]?.name) {
      throw new Error('Cannot undo actions from previous stations');
    }

    // Execute undo based on action type
    switch (action.action) {
      case 'MARK_NO_SHOW':
        await this._undoNoShow(action);
        break;

      case 'CONFIRM_BOARDING':
        await this._undoBoarding(action);
        break;

      case 'APPLY_UPGRADE':
        await this._undoRACUpgrade(action);
        break;

      default:
        throw new Error(`Unknown action type: ${action.action}`);
    }

    // Mark as undone
    action.undoneAt = new Date();
    action.canUndo = false;

    // Log event
    this.logEvent('ACTION_UNDONE', `Undone ${action.action} for PNR ${action.target.pnr}`);

    return {
      success: true,
      action: action
    };
  }

  /**
   * Undo NO_SHOW marking
   */
  async _undoNoShow(action) {
    const db = require('../config/db');
    const passenger = this.findPassengerByPNR(action.target.pnr);

    if (!passenger) {
      throw new Error(`Passenger ${action.target.pnr} not found`);
    }

    // Restore previous state
    passenger.NO_show = action.previousState.noShow;
    passenger.Boarded = action.previousState.boarded;

    // Update database
    await db.getPassengersCollection().updateOne(
      { PNR_Number: action.target.pnr },
      {
        $set: {
          NO_show: action.previousState.noShow,
          Boarded: action.previousState.boarded
        }
      }
    );

    // Update stats
    if (action.previousState.noShow === false && action.newState.noShow === true) {
      this.stats.totalNoShows--;
    }

    console.log(`↩️ Undone NO_SHOW for ${action.target.pnr}`);
  }

  /**
   * Undo boarding confirmation with collision detection
   */
  async _undoBoarding(action) {
    const db = require('../config/db');
    const passenger = this.findPassengerByPNR(action.target.pnr);

    if (!passenger) {
      throw new Error(`Passenger ${action.target.pnr} not found`);
    }

    // Collision Detection: Check if berth state has changed
    if (passenger.Coach && passenger.Seat_Number) {
      const berth = this.findBerth(passenger.Coach, passenger.Seat_Number);

      if (berth) {
        // Check if another passenger is now using this berth
        if (berth.occupants.length > 0 && !berth.occupants.includes(action.target.pnr)) {
          throw new Error(
            `Cannot undo boarding: berth ${passenger.Coach}-${passenger.Seat_Number} ` +
            `is now occupied by ${berth.occupants[0]}`
          );
        }

        // Check if berth status is inconsistent
        if (berth.status === 'vacant' && action.newState.boarded === true) {
          console.warn(
            `⚠️ Berth state mismatch for ${action.target.pnr}: ` +
            `expected occupied, found vacant`
          );
        }
      }
    }

    // Restore to not boarded
    passenger.Boarded = false;

    // Update database
    await db.getPassengersCollection().updateOne(
      { PNR_Number: action.target.pnr },
      { $set: { Boarded: false } }
    );

    // Add back to verification queue for re-verification
    this.boardingVerificationQueue.set(action.target.pnr, {
      pnr: action.target.pnr,
      name: passenger.Name,
      seat: `${passenger.Coach}-${passenger.Seat_Number}`,
      verificationStatus: 'PENDING',
      undoneAt: new Date().toISOString()
    });

    // Update stats
    if (action.previousState.boarded === false && action.newState.boarded === true) {
      this.stats.totalBoarded--;
      this.stats.currentOnboard--;
    }

    console.log(
      `↩️ Undone boarding for ${action.target.pnr} ` +
      `at ${this.stations[this.currentStationIdx]?.name}`
    );
  }

  /**
   * Undo RAC upgrade
   * Restores passenger from CNF to RAC status and deallocates the new berth
   */
  async _undoRACUpgrade(action) {
    const db = require('../config/db');
    const passenger = this.findPassengerByPNR(action.target.pnr);

    if (!passenger) {
      throw new Error(`Passenger ${action.target.pnr} not found`);
    }

    // Get the berth that was allocated during upgrade
    const upgradedBerth = this.findBerth(
      action.newState.coach,
      action.newState.seat
    );

    if (!upgradedBerth) {
      throw new Error(
        `Cannot undo upgrade: berth ${action.newState.coach}-${action.newState.seat} not found`
      );
    }

    // Check for collision: Is another passenger now using this berth?
    if (upgradedBerth.status === 'occupied' && upgradedBerth.occupants[0] !== action.target.pnr) {
      throw new Error(
        `Cannot undo upgrade: berth is now occupied by ${upgradedBerth.occupants[0]}`
      );
    }

    // Restore passenger to RAC status
    passenger.pnrStatus = 'RAC';
    passenger.Coach = action.previousState.coach || null;
    passenger.Seat_Number = action.previousState.seat || null;

    // Deallocate the upgraded berth
    upgradedBerth.removePassenger(action.target.pnr);
    upgradedBerth.updateStatus();

    // Add passenger back to RAC queue
    if (!this.racQueue.find(r => r.pnr === action.target.pnr)) {
      this.racQueue.push({
        pnr: action.target.pnr,
        name: passenger.Name,
        racNumber: passenger.RAC_Status || this.racQueue.length + 1,
        from: passenger.From,
        to: passenger.To,
        class: passenger.Class,
        age: passenger.Age,
        gender: passenger.Gender,
        boarded: false
      });
    }

    // Update database
    await db.getPassengersCollection().updateOne(
      { PNR_Number: action.target.pnr },
      {
        $set: {
          pnrStatus: 'RAC',
          Coach: action.previousState.coach || null,
          Seat_Number: action.previousState.seat || null
        }
      }
    );

    // Update stats
    this.stats.totalRACUpgraded--;
    this.stats.vacantBerths++;

    console.log(
      `↩️ Undone RAC upgrade for ${action.target.pnr}: ` +
      `${action.newState.coach}-${action.newState.seat} → RAC Queue`
    );
  }

  /**
   * Disable undo for actions from previous stations
   */
  onStationChange() {
    const currentStation = this.stations[this.currentStationIdx]?.name;

    this.actionHistory.forEach(action => {
      if (action.station !== currentStation) {
        action.canUndo = false; // Can't undo actions from previous stations
      }
    });

    console.log(`🚫 Disabled undo for actions from previous stations`);
  }

  /**
   * Get action history (last 10 actions)
   */
  getActionHistory() {
    // Return most recent first
    return [...this.actionHistory].reverse();
  }
}

module.exports = TrainState;