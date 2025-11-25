// backend/services/ReallocationService.js

const db = require("../config/db");
const wsManager = require("../config/websocket");
const UpgradeNotificationService = require("./UpgradeNotificationService");

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
   * Process vacancy and create upgrade offers for eligible RAC passengers
   * This is called after a vacancy is created (no-show, cancellation, deboarding)
   */
  async processVacancyForUpgrade(trainState, vacantBerthInfo, currentStation) {
    try {
      // Validate inputs
      if (!trainState) {
        console.error('❌ processVacancyForUpgrade: trainState is null');
        return { offersCreated: 0, error: 'Invalid train state' };
      }

      if (!vacantBerthInfo || !vacantBerthInfo.berth) {
        console.error('❌ processVacancyForUpgrade: Invalid vacantBerthInfo');
        return { offersCreated: 0, error: 'Invalid berth information' };
      }

      const { berth, coachNo, berthNo, fullBerthNo, type, class: berthClass } = vacantBerthInfo;

      console.log(`\n🔍 Processing vacancy for upgrade: ${fullBerthNo || `${coachNo}-${berthNo}`}`);

      // Get vacant segment ranges for this berth
      if (!berth.segmentOccupancy || !Array.isArray(berth.segmentOccupancy)) {
        console.error('   ❌ Berth missing segmentOccupancy array');
        return { offersCreated: 0, error: 'Invalid berth structure' };
      }

      const vacantRanges = this._getVacantSegmentRanges(berth, trainState.stations);

      if (vacantRanges.length === 0) {
        console.log('   No vacant segments found');
        return { offersCreated: 0 };
      }

      let offersCreated = 0;

      // For each vacant range, find eligible RAC passengers
      for (const range of vacantRanges) {
        console.log(`   Vacant segment: ${range.fromStation} → ${range.toStation}`);

        // Find eligible RAC passenger for this segment
        const eligiblePassenger = this.getEligibleRACForVacantSegment(
          {
            fromIdx: range.fromIdx,
            toIdx: range.toIdx,
            class: berthClass || trainState.coaches[0]?.class || 'SL',
            coachNo: coachNo,
            berthNo: berthNo,
            fullBerthNo: fullBerthNo || `${coachNo}-${berthNo}`,
            type: type
          },
          trainState.currentStationIdx,
          trainState
        );

        if (!eligiblePassenger) {
          console.log('   No eligible RAC passenger found for this segment');
          continue;
        }

        console.log(`   ✅ Found eligible passenger: ${eligiblePassenger.name} (${eligiblePassenger.pnr})`);

        // Create upgrade notification
        const offer = UpgradeNotificationService.createUpgradeNotification(
          eligiblePassenger,
          {
            fullBerthNo: fullBerthNo || `${coachNo}-${berthNo}`,
            coachNo: coachNo || trainState.coaches[0]?.coachNo,
            berthNo: berthNo,
            type: type,
            vacantSegment: `${range.fromStation} → ${range.toStation}`
          },
          currentStation
        );

        // Check if passenger is online and boarded
        // Handle both database format (Online_Status) and in-memory format (onlineStatus)
        const isOnline = eligiblePassenger.Online_Status === 'online' ||
          eligiblePassenger.onlineStatus === 'online';
        const isBoarded = eligiblePassenger.boarded === true ||
          eligiblePassenger.Boarded === true;

        if (isBoarded && isOnline) {
          // Push offer via WebSocket
          const sent = wsManager.sendOfferToPassenger(eligiblePassenger.pnr, {
            id: offer.id,
            notificationId: offer.id,
            pnr: eligiblePassenger.pnr,
            fromBerth: offer.currentBerth,
            toBerth: offer.offeredBerth,
            coach: offer.offeredCoach,
            berthType: offer.offeredBerthType,
            createdAt: offer.timestamp,
            expiresAt: new Date(Date.now() + 60000).toISOString(), // 60 seconds
            status: 'PENDING'
          });

          if (sent) {
            console.log(`   📡 Offer sent via WebSocket to ${eligiblePassenger.pnr}`);
            offersCreated++;

            // Set expiry timer
            this.scheduleOfferExpiry(offer.id, eligiblePassenger.pnr, 60000);
          } else {
            console.log(`   ⚠️  WebSocket send failed, passenger may have disconnected`);
            // Still count as created - it's in the notification service
            offersCreated++;
          }
        } else {
          // Passenger is offline or not boarded - offer goes to TTE portal
          const reason = !isBoarded ? 'not boarded' : 'offline';
          console.log(`   📋 Passenger ${reason} - offer queued for TTE verification`);
          offersCreated++;
        }
      }

      return { offersCreated };
    } catch (error) {
      console.error('❌ Error processing vacancy for upgrade:', error);
      return { offersCreated: 0, error: error.message };
    }
  }

  /**
   * Schedule offer expiry
   */
  scheduleOfferExpiry(offerId, pnr, ttlMs) {
    setTimeout(() => {
      try {
        const notifications = UpgradeNotificationService.getAllNotifications(pnr);
        const offer = notifications.find(n => n.id === offerId);

        if (offer && offer.status === 'PENDING') {
          // Mark as expired
          offer.status = 'EXPIRED';
          offer.expiredAt = new Date().toISOString();

          // Notify passenger via WebSocket
          wsManager.notifyOfferExpired(pnr, offerId);

          console.log(`⏰ Offer ${offerId} expired for PNR ${pnr}`);
        }
      } catch (error) {
        console.error('Error expiring offer:', error);
      }
    }, ttlMs);
  }

  /**
   * Get RAC queue - STRICT FILTERING FOR REALLOCATION
   * Only returns passengers who meet ALL criteria:
   * 1. PNR_Status === "RAC" (CRITICAL - only RAC passengers)
   * 2. Passenger_Status === "Online" (can receive real-time offers)
   * 3. Boarded === true (physically on the train)
   *
   * This ensures reallocation ONLY happens for passengers who:
   * - Have RAC status (not CNF, not WL)
   * - Are actively using the system (Online)
   * - Have physically boarded the train (Boarded)
   * - Can receive and respond to upgrade notifications
   */
  getRACQueue(trainState) {
    return trainState.racQueue
      .filter((rac) => {
        // CRITICAL FILTER 1: Must have RAC status (not CNF, not WL)
        const isRAC = rac.pnrStatus && rac.pnrStatus.toUpperCase() === 'RAC';

        // CRITICAL FILTER 2: Passenger must be BOARDED
        const isBoarded = rac.boarded === true;

        // CRITICAL FILTER 3: Passenger must be ONLINE
        // Handle both "Online" and "online" for case-insensitivity
        const isOnline = rac.passengerStatus &&
          rac.passengerStatus.toLowerCase() === 'online';

        // Only include if ALL THREE conditions are met
        return isRAC && isBoarded && isOnline;
      })
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
        boarded: rac.boarded,
        passengerStatus: rac.passengerStatus || 'Offline', // Include passenger status
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
      passengerStatus: passenger.passengerStatus || 'Offline',
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
          const vacancyId = `${coach.coachNo}-${berth.berthNo}-${range.fromIdx}-${range.toIdx}`;

          for (const rac of trainState.racQueue) {
            // Check if RAC passenger's journey fits within this vacant range
            const eligibilityResult = this.isEligibleForSegment(
              rac,
              {
                fromIdx: range.fromIdx,
                toIdx: range.toIdx,
                class: coach.class,
                coachNo: coach.coachNo,
                berthNo: berth.berthNo
              },
              trainState.currentStationIdx,
              trainState,
              vacancyId
            );

            // Only add if eligible
            if (eligibilityResult.eligible &&
              berth.isAvailableForSegment(rac.fromIdx, rac.toIdx)) {
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
                eligibilityReason: eligibilityResult.reason
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
      const occupants = berth.segmentOccupancy[i] || [];
      if (occupants.length === 0) {
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
   * Check if RAC passenger is sharing or will share their berth
   * Returns true if:
   * 1. Currently sharing with another passenger
   * 2. Alone now, but another passenger will board later (overlapping journey)
   */
  checkSharingStatus(racPassenger, trainState, currentStationIdx) {
    const location = trainState.findPassenger(racPassenger.pnr);
    if (!location) return false; // Should not happen

    const { berth } = location;

    // Get all passengers on this berth (excluding current passenger)
    const otherPassengers = berth.passengers.filter(p => p.pnr !== racPassenger.pnr);

    if (otherPassengers.length === 0) {
      // Completely alone on berth (no past, present, or future sharers)
      return false;
    }

    // Check for overlap with remaining journey
    // Current passenger remaining journey: max(fromIdx, currentStation) -> toIdx
    const myStart = Math.max(racPassenger.fromIdx, currentStationIdx);
    const myEnd = racPassenger.toIdx;

    for (const other of otherPassengers) {
      // Skip cancelled/no-show
      if (other.noShow || other.pnrStatus === 'CAN') continue;

      // Check overlap
      // Overlap exists if: (OtherStart < MyEnd) && (OtherEnd > MyStart)
      const otherStart = other.fromIdx;
      const otherEnd = other.toIdx;

      if (otherStart < myEnd && otherEnd > myStart) {
        // Found someone sharing or will share
        return true;
      }
    }

    // No overlap found -> Effectively alone for the rest of the journey
    return false;
  }

  /**
   * Calculate journey distance in kilometers
   * Returns distance between boarding and deboarding stations
   */
  calculateJourneyDistance(fromStationCode, toStationCode, trainState) {
    try {
      const stations = trainState.stations;

      // Find stations by code
      const fromStation = stations.find(s => s.code === fromStationCode || s.name === fromStationCode);
      const toStation = stations.find(s => s.code === toStationCode || s.name === toStationCode);

      if (!fromStation || !toStation) {
        console.warn(`⚠️ Station not found: ${fromStationCode} or ${toStationCode}`);
        return 0;
      }

      // Calculate distance (assuming stations have distance field)
      // Distance is cumulative from origin, so: toDistance - fromDistance
      const fromDistance = fromStation.distance || fromStation.Distance || 0;
      const toDistance = toStation.distance || toStation.Distance || 0;

      const journeyDistance = Math.abs(toDistance - fromDistance);

      return journeyDistance;
    } catch (error) {
      console.error('Error calculating journey distance:', error);
      return 0;
    }
  }

  /**
   * Check if RAC passenger is eligible for a vacant segment
   * COMPLETE RULES (11 Total):
   * 0. Must have RAC status (not CNF or WL)
   * 1. Passenger must be ONLINE (passengerStatus === 'Online')
   * 2. Passenger must be BOARDED
   * 3. Vacant segment must fully cover passenger's remaining journey
   * 4. Class must match
   * 5. Solo RAC Constraint (must be sharing or will share berth)
   * 6. No conflicting CNF passenger boarding later
   * 7. Not already offered this vacancy
   * 8. Not already accepted another offer
   * 9. RAC rank priority (handled in sorting)
   * 10. Time-gap constraint (optional)
   * 11. Minimum journey distance (70km)
   */
  isEligibleForSegment(racPassenger, vacantSegment, currentStationIdx, trainState, vacancyId = null) {
    // Rule 0: MUST have RAC status (PRIMARY CONSTRAINT)
    // Only RAC passengers are eligible for reallocation, not CNF or WL
    const isRAC = racPassenger.pnrStatus && racPassenger.pnrStatus.toUpperCase() === 'RAC';
    if (!isRAC) {
      return { eligible: false, reason: 'Passenger is not RAC status (CNF/WL not eligible)' };
    }

    // Rule 1: Must be ONLINE
    // This is the SECONDARY filter - only online passengers get real-time offers
    const isOnline = racPassenger.passengerStatus &&
      racPassenger.passengerStatus.toLowerCase() === 'online';
    if (!isOnline) {
      return { eligible: false, reason: 'Passenger is offline' };
    }

    // Rule 2: Must be BOARDED (and not a no-show)
    if (racPassenger.noShow) {
      return { eligible: false, reason: 'Passenger marked as no-show' };
    }
    if (!racPassenger.boarded) {
      return { eligible: false, reason: 'Passenger has not boarded' };
    }

    // Rule 3: Vacant segment must fully cover remaining journey
    const remainingFromIdx = Math.max(racPassenger.fromIdx, currentStationIdx);
    const remainingToIdx = racPassenger.toIdx;

    if (vacantSegment.fromIdx > remainingFromIdx || vacantSegment.toIdx < remainingToIdx) {
      return { eligible: false, reason: 'Vacancy does not cover full journey' };
    }

    // Rule 4: Class must match
    if (racPassenger.class !== vacantSegment.class) {
      return { eligible: false, reason: 'Class mismatch' };
    }

    // Rule 5: Solo RAC Constraint (Revised)
    // If a passenger is currently alone in their RAC berth (Side Lower), they effectively have a full seat.
    // They should NOT be eligible for upgrade unless:
    // a) They are currently sharing with someone.
    // b) Someone is scheduled to board and share with them later (incoming co-passenger).

    const isSharingOrWillShare = this.checkSharingStatus(racPassenger, trainState, currentStationIdx);
    if (!isSharingOrWillShare) {
      return { eligible: false, reason: 'Already has full Side Lower (No co-passenger)' };
    }

    // Original Rule 5 checks (Co-passenger consistency) are now implicitly handled
    // because if they ARE sharing, we still need to check if the co-passenger is valid for a move?
    // Actually, if they are sharing, we should try to move them.
    // But we still need to check co-passenger constraints if we were to move them TOGETHER.
    // However, the current logic moves ONE passenger at a time (usually).
    // If we move one, the other becomes solo (which is good for them).
    // So we don't need to block this passenger if the co-passenger is "bad", 
    // unless we are trying to move BOTH (which upgradeRACPassengerWithCoPassenger handles).
    // But for ELIGIBILITY of this single passenger, being sharing is enough.

    // Wait, if we move this passenger, we leave the co-passenger alone. That's fine.
    // The only constraint is: don't move someone who is ALREADY alone.

    // Rule 6: No conflicting CNF passenger boarding later
    // Check if any CNF passenger will board this berth during the vacancy
    const hasConflictingCNF = this.checkConflictingCNFPassenger(
      vacantSegment,
      currentStationIdx,
      trainState
    );
    if (hasConflictingCNF) {
      return { eligible: false, reason: 'Conflicting CNF passenger will board' };
    }

    // Rule 7: Not already offered this vacancy
    if (vacancyId && racPassenger.vacancyIdLastOffered === vacancyId) {
      return { eligible: false, reason: 'Already offered this vacancy' };
    }

    // Rule 8: Not already accepted another offer
    if (racPassenger.offerStatus === 'accepted') {
      return { eligible: false, reason: 'Already accepted another offer' };
    }

    // Rule 11: Minimum Journey Distance (70km)
    // Only passengers traveling 70km or more are eligible for upgrade
    // This ensures upgrades prioritize long-distance passengers who need comfort most
    const journeyDistance = this.calculateJourneyDistance(
      racPassenger.from,
      racPassenger.to,
      trainState
    );

    if (journeyDistance < 70) {
      return {
        eligible: false,
        reason: `Journey too short (${journeyDistance}km < 70km minimum)`
      };
    }

    // Rule 10: Time-gap constraint (optional)
    // Skip if vacancy is too close to destination (less than 1 segment remaining)
    const segmentsRemaining = vacantSegment.toIdx - currentStationIdx;
    if (segmentsRemaining < 1) {
      return { eligible: false, reason: 'Insufficient time remaining' };
    }

    // All rules passed
    return { eligible: true, reason: 'All eligibility criteria met' };
  }

  /**
   * Check if any CNF passenger will board this berth during the vacancy period
   * Rule 6 implementation
   */
  checkConflictingCNFPassenger(vacantSegment, currentStationIdx, trainState) {
    // Find the berth for this vacancy
    const berth = trainState.findBerth(vacantSegment.coachNo, vacantSegment.berthNo);
    if (!berth) return false;

    // Check all passengers on this berth
    for (const passenger of berth.passengers) {
      // Skip if not CNF
      if (passenger.pnrStatus !== 'CNF') continue;

      // Skip if already boarded
      if (passenger.boarded) continue;

      // Check if this CNF passenger will board during the vacancy
      // Their boarding station must be within the vacant range
      if (passenger.fromIdx >= vacantSegment.fromIdx &&
        passenger.fromIdx < vacantSegment.toIdx &&
        passenger.fromIdx > currentStationIdx) {
        console.log(`   ⚠️  Conflicting CNF passenger ${passenger.pnr} will board at station ${passenger.fromIdx}`);
        return true;
      }
    }

    return false;
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

          // Notify co-passenger via WebSocket if they're online
          const coPassOnline = coPassenger.Online_Status === 'online' || coPassenger.onlineStatus === 'online';
          if (coPassOnline && wsManager) {
            wsManager.notifyUpgradeConfirmed(coPassengerPNR, {
              notificationId: 'AUTO_UPGRADE',
              newBerth: oldBerth.fullBerthNo,
              coach: oldCoachNo,
              confirmedAt: new Date().toISOString(),
              reason: 'Co-passenger inherited CNF status'
            });
            console.log(`   📡 Notified co-passenger ${coPassengerPNR} via WebSocket`);
          }
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
   * Now uses enhanced eligibility rules (10 total)
   */
  getEligibleRACForVacantSegment(vacantSegment, currentStationIdx, trainState) {
    // Generate unique vacancy ID for tracking
    const vacancyId = `${vacantSegment.coachNo}-${vacantSegment.berthNo}-${vacantSegment.fromIdx}-${vacantSegment.toIdx}`;

    // Iterate through RAC queue in order (priority-based)
    for (const racPassenger of trainState.racQueue) {
      const eligibilityResult = this.isEligibleForSegment(
        racPassenger,
        vacantSegment,
        currentStationIdx,
        trainState,
        vacancyId
      );

      if (eligibilityResult.eligible) {
        console.log(`   ✅ Eligible: ${racPassenger.name} (${racPassenger.pnr}) - ${eligibilityResult.reason}`);
        return racPassenger;
      } else {
        console.log(`   ❌ Not eligible: ${racPassenger.name} (${racPassenger.pnr}) - ${eligibilityResult.reason}`);
      }
    }

    return null;
  }
}

module.exports = new ReallocationService();
