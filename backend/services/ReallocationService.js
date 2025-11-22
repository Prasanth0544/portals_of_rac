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
   * Get RAC queue - ONLY BOARDED PASSENGERS (currently on train)
   * Reallocation should only happen for passengers who have boarded
   */
  getRACQueue(trainState) {
    // FILTER: Only return RAC passengers who have BOARDED the train
    // This ensures reallocation only works on current onboard passengers
    return trainState.racQueue
      .filter((rac) => rac.boarded === true) // 🔥 KEY FILTER: Only boarded passengers
      .map((rac) => ({
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
        boarded: rac.boarded, // Include boarded status in response
        berth: rac.coach && rac.seatNo ? `${rac.coach}-${rac.seatNo}` : 'N/A'
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

  /**
   * Check if RAC passenger is eligible for a vacant segment
   * Rules:
   * 1. Passenger must be boarded
   * 2. Vacant segment must fully cover passenger's remaining journey
   * 3. Class must match
   */
  isEligibleForSegment(racPassenger, vacantSegment, currentStationIdx, trainState) {
    // Rule 1: Must be boarded
    if (!racPassenger.boarded) {
      return false;
    }

    // Rule 2: Vacant segment must fully cover remaining journey
    const remainingFromIdx = Math.max(racPassenger.fromIdx, currentStationIdx);
    const remainingToIdx = racPassenger.toIdx;

    if (vacantSegment.fromIdx > remainingFromIdx || vacantSegment.toIdx < remainingToIdx) {
      return false;
    }

    // Rule 3: Class must match
    if (racPassenger.class !== vacantSegment.class) {
      return false;
    }

    return true;
  }

  /**
   * Find co-passenger sharing the same RAC berth
   */
  findCoPassenger(racPassenger, trainState) {
    // Find the berth where RAC passenger is located
    const result = trainState.findPassenger(racPassenger.pnr);

    if (!result) {
      return null;
    }

    const { berth } = result;

    // Use the new getCoPassenger method from Berth
    return berth.getCoPassenger(racPassenger.pnr);
  }

  /**
   * Upgrade RAC passenger and handle co-passenger upgrade
   * This is the core upgrade function that handles both passengers atomically
   */
  async upgradeRACPassengerWithCoPassenger(racPNR, newBerthDetails, trainState) {
    try {
      console.log(`\n🔄 Starting upgrade process for RAC passenger ${racPNR}...`);

      // Find RAC passenger in queue
      const racIndex = trainState.racQueue.findIndex(r => r.pnr === racPNR);

      if (racIndex === -1) {
        throw new Error(`RAC passenger ${racPNR} not found in queue`);
      }

      const racPassenger = trainState.racQueue[racIndex];

      // Find old location and co-passenger
      const oldLocation = trainState.findPassenger(racPNR);
      if (!oldLocation) {
        throw new Error(`Cannot find old location for ${racPNR}`);
      }

      const { berth: oldBerth, coachNo: oldCoachNo } = oldLocation;
      const oldBerthNo = oldBerth.berthNo;
      const oldBerthType = oldBerth.type;

      // Find co-passenger
      const coPassenger = this.findCoPassenger(racPassenger, trainState);
      let coPassengerPNR = null;
      let coPassengerName = null;
      let coPassengerIndex = -1;

      if (coPassenger) {
        coPassengerPNR = coPassenger.pnr;
        coPassengerName = coPassenger.name;
        coPassengerIndex = trainState.racQueue.findIndex(r => r.pnr === coPassengerPNR);
        console.log(`   Found co-passenger: ${coPassengerName} (${coPassengerPNR})`);
      }

      // Get new berth
      const newBerth = trainState.findBerth(newBerthDetails.coachNo, newBerthDetails.berthNo);

      if (!newBerth) {
        throw new Error(`New berth ${newBerthDetails.coachNo}-${newBerthDetails.berthNo} not found`);
      }

      // Validate availability
      if (!newBerth.isAvailableForSegment(racPassenger.fromIdx, racPassenger.toIdx)) {
        throw new Error(`New berth not available for passenger journey`);
      }

      console.log(`   Moving ${racPassenger.name} from ${oldBerth.fullBerthNo} to ${newBerth.fullBerthNo}`);

      // Step 1: Remove RAC passenger from old berth
      oldBerth.removePassenger(racPNR);

      // Step 2: Add RAC passenger to new berth with CNF status
      newBerth.addPassenger({
        pnr: racPassenger.pnr,
        name: racPassenger.name,
        age: racPassenger.age,
        gender: racPassenger.gender,
        fromIdx: racPassenger.fromIdx,
        toIdx: racPassenger.toIdx,
        from: racPassenger.from,
        to: racPassenger.to,
        pnrStatus: 'CNF', // Upgraded to CNF
        class: racPassenger.class,
        noShow: false,
        boarded: racPassenger.boarded
      });

      // Step 3: Update co-passenger to CNF ONLY if berth hasn't been re-allocated
      if (coPassenger) {
        // CRITICAL: Check if old berth has been re-allocated to new RAC passengers
        const currentBerthPassengers = oldBerth.getRACPassengers();
        const coPassengerStillOnBerth = currentBerthPassengers.find(p => p.pnr === coPassengerPNR);

        if (coPassengerStillOnBerth && currentBerthPassengers.length === 1) {
          // Safe to upgrade: co-passenger is alone on the berth
          console.log(`   Upgrading co-passenger ${coPassengerName} to CNF on ${oldBerth.fullBerthNo}`);

          // Update co-passenger status in old berth
          coPassenger.pnrStatus = 'CNF';
          coPassenger.racStatus = '-';

          // Update berth status
          oldBerth.updateStatus();

          // Remove co-passenger from RAC queue
          if (coPassengerIndex !== -1) {
            trainState.racQueue.splice(coPassengerIndex, 1);
          }

          // Update MongoDB for co-passenger
          try {
            const passengersCollection = db.getPassengersCollection();
            await passengersCollection.updateOne(
              { PNR_Number: coPassengerPNR },
              {
                $set: {
                  PNR_Status: 'CNF',
                  RAC_Status: '-'
                }
              }
            );
            console.log(`   ✅ Updated co-passenger in MongoDB: ${coPassengerPNR}`);
          } catch (dbError) {
            console.error(`   ⚠️  Failed to update co-passenger in MongoDB:`, dbError.message);
          }

          trainState.stats.totalRACUpgraded++;
        } else {
          // Berth has been re-allocated - don't upgrade co-passenger
          console.log(`   ⚠️  Berth ${oldBerth.fullBerthNo} has been re-allocated, skipping co-passenger upgrade`);
        }
      }

      // Step 4: Remove main RAC passenger from queue
      trainState.racQueue.splice(racIndex, 1);

      // Step 5: Update MongoDB for main passenger
      try {
        const passengersCollection = db.getPassengersCollection();
        await passengersCollection.updateOne(
          { PNR_Number: racPNR },
          {
            $set: {
              PNR_Status: 'CNF',
              RAC_Status: '-',
              Coach: newBerthDetails.coachNo,
              Seat_No: newBerthDetails.berthNo
            }
          }
        );
        console.log(`   ✅ Updated main passenger in MongoDB: ${racPNR}`);
      } catch (dbError) {
        console.error(`   ⚠️  Failed to update main passenger in MongoDB:`, dbError.message);
      }

      trainState.stats.totalRACUpgraded++;
      trainState.updateStats();

      const result = {
        success: true,
        mainPassenger: {
          pnr: racPNR,
          name: racPassenger.name,
          oldBerth: `${oldCoachNo}-${oldBerthNo}`,
          newBerth: newBerth.fullBerthNo,
          status: 'CNF'
        },
        coPassenger: coPassenger ? {
          pnr: coPassengerPNR,
          name: coPassengerName,
          berth: oldBerth.fullBerthNo,
          status: 'CNF'
        } : null
      };

      console.log(`✅ Upgrade complete!`);
      if (coPassenger) {
        console.log(`   ${racPassenger.name}: ${oldCoachNo}-${oldBerthNo} → ${newBerth.fullBerthNo} (CNF)`);
        console.log(`   ${coPassengerName}: Inherited ${oldBerth.fullBerthNo} (CNF)`);
      } else {
        console.log(`   ${racPassenger.name}: ${oldCoachNo}-${oldBerthNo} → ${newBerth.fullBerthNo} (CNF)`);
      }

      trainState.logEvent('RAC_UPGRADE', `RAC passenger upgraded`, result);

      return result;

    } catch (error) {
      console.error(`❌ Error upgrading RAC passenger:`, error.message);
      throw error;
    }
  }

  /**
   * Get eligible RAC passengers for a specific vacant segment
   * Returns the first eligible passenger based on RAC queue priority
   */
  getEligibleRACForVacantSegment(vacantSegment, currentStationIdx, trainState) {
    // Iterate through RAC queue in order (priority-based)
    for (const racPassenger of trainState.racQueue) {
      if (this.isEligibleForSegment(racPassenger, vacantSegment, currentStationIdx, trainState)) {
        return racPassenger;
      }
    }
    return null;
  }
}

module.exports = new ReallocationService();
