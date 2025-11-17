// backend/services/ReallocationService.js

const db = require("../config/db");

class ReallocationService {
  /**
   * Mark passenger as no-show
   */
  async markNoShow(trainState, pnr) {
    try {
      const result = trainState.findPassenger(pnr);

      if (!result) {
        throw new Error(`Passenger with PNR ${pnr} not found`);
      }

      const { passenger, berth, coachNo } = result;

      if (passenger.boarded) {
        throw new Error(`Passenger ${passenger.name} has already boarded`);
      }

      if (passenger.noShow) {
        throw new Error(
          `Passenger ${passenger.name} is already marked as no-show`,
        );
      }

      // Mark as no-show in memory
      passenger.noShow = true;

      // Clear segment occupancy
      for (let i = passenger.fromIdx; i < passenger.toIdx; i++) {
        if (berth.segmentOccupancy[i] === passenger.pnr) {
          berth.segmentOccupancy[i] = null;
        }
      }

      // Update berth status
      berth.updateStatus();

      // Update MongoDB (Database 2: rac_passengers)
      try {
        const passengersCollection = db.getPassengersCollection();
        await passengersCollection.updateOne(
          { PNR_Number: pnr },
          { $set: { NO_show: true } },
        );
        console.log(`✅ Updated NO_show in MongoDB for PNR: ${pnr}`);
      } catch (dbError) {
        console.error(`⚠️  Failed to update MongoDB:`, dbError.message);
      }

      console.log(`❌ Marked ${passenger.name} (PNR: ${pnr}) as NO-SHOW`);

      trainState.logEvent("NO_SHOW", `Passenger marked as no-show`, {
        pnr: pnr,
        name: passenger.name,
        from: passenger.from,
        to: passenger.to,
        coach: coachNo,
        berth: berth.fullBerthNo,
      });

      return {
        success: true,
        passenger: {
          pnr: passenger.pnr,
          name: passenger.name,
          from: passenger.from,
          to: passenger.to,
          coach: coachNo,
          berth: berth.fullBerthNo,
        },
      };
    } catch (error) {
      console.error(`❌ Error marking no-show:`, error.message);
      throw error;
    }
  }

  /**
   * Get RAC queue
   */
  getRACQueue(trainState) {
    return trainState.racQueue.map((rac) => ({
      pnr: rac.pnr,
      name: rac.name,
      age: rac.age,
      gender: rac.gender,
      racNumber: rac.racNumber,
      pnrStatus: rac.pnrStatus,
      racStatus: rac.racStatus,
      class: rac.class,
      from: rac.from,
      to: rac.to,
      fromIdx: rac.fromIdx,
      toIdx: rac.toIdx,
      coach: rac.coach,
      seatNo: rac.seatNo,
      berthType: rac.berthType,
    }));
  }

  /**
   * Get vacant berths
   */
  getVacantBerths(trainState) {
    return trainState.getVacantBerths();
  }

  /**
   * Search passenger by PNR
   */
  searchPassenger(trainState, pnr) {
    const result = trainState.findPassenger(pnr);

    if (!result) {
      throw new Error(`Passenger with PNR ${pnr} not found`);
    }

    const { passenger, berth, coachNo } = result;

    return {
      pnr: passenger.pnr,
      name: passenger.name,
      age: passenger.age,
      gender: passenger.gender,
      from: passenger.from,
      to: passenger.to,
      fromIdx: passenger.fromIdx,
      toIdx: passenger.toIdx,
      pnrStatus: passenger.pnrStatus,
      class: passenger.class,
      coach: coachNo,
      berth: berth.fullBerthNo,
      berthType: berth.type,
      noShow: passenger.noShow,
      boarded: passenger.boarded,
    };
  }

  /**
   * Get eligibility matrix with vacant segment ranges
   */
  getEligibilityMatrix(trainState) {
    const eligibilityMatrix = [];
    const stations = trainState.stations;

    // Scan all berths; eligibility is segment-based, not only globally vacant
    for (const coach of trainState.coaches) {
      for (const berth of coach.berths) {
        // Find all vacant segment ranges for this berth
        const vacantRanges = this._getVacantSegmentRanges(berth, stations);

        // For each vacant range, find eligible RAC passengers
        vacantRanges.forEach((range) => {
          const eligibleRAC = [];

          for (const rac of trainState.racQueue) {
            // Check if RAC passenger's journey fits within this vacant range
            if (
              rac.fromIdx >= range.fromIdx &&
              rac.toIdx <= range.toIdx &&
              berth.isAvailableForSegment(rac.fromIdx, rac.toIdx)
            ) {
              eligibleRAC.push({
                pnr: rac.pnr,
                name: rac.name,
                age: rac.age,
                gender: rac.gender,
                racNumber: rac.racNumber,
                pnrStatus: rac.pnrStatus,
                racStatus: rac.racStatus,
                from: rac.from,
                to: rac.to,
                fromIdx: rac.fromIdx,
                toIdx: rac.toIdx,
                class: rac.class,
                berthType: rac.berthType,
              });
            }
          }

          // Sort by RAC number (lowest first = highest priority)
          eligibleRAC.sort((a, b) => {
            // Extract numeric part from RAC status (e.g., "RAC 1" -> 1)
            const getRACANumber = (racStatus) => {
              const match = racStatus?.match(/RAC\s*(\d+)/i);
              return match ? parseInt(match[1]) : 999;
            };
            return getRACANumber(a.racStatus) - getRACANumber(b.racStatus);
          });

          if (eligibleRAC.length > 0) {
            eligibilityMatrix.push({
              berth: berth.fullBerthNo,
              coach: coach.coachNo,
              berthNo: berth.berthNo,
              type: berth.type,
              class: coach.class,
              vacantFrom: range.fromStation,
              vacantTo: range.toStation,
              vacantFromIdx: range.fromIdx,
              vacantToIdx: range.toIdx,
              vacantSegment: `${range.fromStation} → ${range.toStation}`,
              eligibleRAC: eligibleRAC, // All eligible passengers
              eligibleCount: eligibleRAC.length,
              topEligible: eligibleRAC[0], // Highest priority (lowest RAC number)
            });
          }
        });
      }
    }

    return eligibilityMatrix;
  }

  /**
   * Helper: Get vacant segment ranges for a berth
   * Returns array of continuous vacant ranges with station names
   */
  _getVacantSegmentRanges(berth, stations) {
    const ranges = [];
    let rangeStart = null;

    for (let i = 0; i < berth.segmentOccupancy.length; i++) {
      if (berth.segmentOccupancy[i] === null) {
        // Vacant segment
        if (rangeStart === null) {
          rangeStart = i;
        }
      } else {
        // Occupied segment
        if (rangeStart !== null) {
          // Close the range
          ranges.push({
            fromIdx: rangeStart,
            toIdx: i,
            fromStation: stations[rangeStart]?.code || `S${rangeStart}`,
            toStation: stations[i]?.code || `S${i}`,
          });
          rangeStart = null;
        }
      }
    }

    // Close final range if it extends to the end
    if (rangeStart !== null) {
      ranges.push({
        fromIdx: rangeStart,
        toIdx: berth.segmentOccupancy.length,
        fromStation: stations[rangeStart]?.code || `S${rangeStart}`,
        toStation:
          stations[berth.segmentOccupancy.length]?.code ||
          `S${berth.segmentOccupancy.length}`,
      });
    }

    return ranges;
  }

  /**
   * Apply reallocation
   */
  applyReallocation(trainState, allocations) {
    const results = {
      success: [],
      failed: [],
    };

    allocations.forEach((allocation) => {
      try {
        const { berth: berthNo, coach: coachNo, pnr } = allocation;

        // Find RAC passenger
        const racIndex = trainState.racQueue.findIndex((r) => r.pnr === pnr);

        if (racIndex === -1) {
          results.failed.push({
            berth: `${coachNo}-${berthNo}`,
            pnr: pnr,
            reason: "RAC passenger not found in queue",
          });
          return;
        }

        const racPassenger = trainState.racQueue[racIndex];
        const berth = trainState.findBerth(coachNo, berthNo);

        if (!berth) {
          results.failed.push({
            berth: `${coachNo}-${berthNo}`,
            pnr: pnr,
            reason: "Berth not found",
          });
          return;
        }

        // Check segment availability
        if (
          !berth.isAvailableForSegment(racPassenger.fromIdx, racPassenger.toIdx)
        ) {
          results.failed.push({
            berth: `${coachNo}-${berthNo}`,
            pnr: pnr,
            reason: "Berth not available for passenger journey",
          });
          return;
        }

        // Remove from old location
        const oldLocation = trainState.findPassenger(racPassenger.pnr);
        if (oldLocation) {
          oldLocation.berth.removePassenger(racPassenger.pnr);
        }

        // Add to new berth
        berth.addPassenger({
          pnr: racPassenger.pnr,
          name: racPassenger.name,
          age: racPassenger.age,
          gender: racPassenger.gender,
          fromIdx: racPassenger.fromIdx,
          toIdx: racPassenger.toIdx,
          from: racPassenger.from,
          to: racPassenger.to,
          pnrStatus: "CNF", // Upgrade to CNF
          class: racPassenger.class,
          racStatus: racPassenger.racStatus,
          berthType: racPassenger.berthType,
          noShow: false,
          boarded: false,
        });

        // Remove from RAC queue
        trainState.racQueue.splice(racIndex, 1);

        results.success.push({
          berth: `${coachNo}-${berthNo}`,
          pnr: racPassenger.pnr,
          name: racPassenger.name,
          previousStatus: racPassenger.pnrStatus,
          newStatus: "CNF",
        });

        trainState.stats.totalRACUpgraded++;

        console.log(
          `✅ Applied reallocation: ${racPassenger.name} (${racPassenger.pnrStatus} → CNF) to ${coachNo}-${berthNo}`,
        );
      } catch (error) {
        results.failed.push({
          berth: allocation.berth,
          pnr: allocation.pnr,
          reason: error.message,
        });
      }
    });

    trainState.updateStats();

    return results;
  }
}

module.exports = new ReallocationService();
