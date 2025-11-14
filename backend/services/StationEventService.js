// backend/services/StationEventService.js

class StationEventService {
  /**
   * Process station arrival - main orchestration
   */
  processStationArrival(trainState) {
    const currentStation = trainState.getCurrentStation();
    
    if (!currentStation) {
      throw new Error('Invalid station index');
    }

    console.log(`\n🚉 ═══════════════════════════════════════════`);
    console.log(`   Arrived at: ${currentStation.name} (${currentStation.code})`);
    console.log(`   Station ${currentStation.sno} of ${trainState.stations.length}`);
    console.log(`═══════════════════════════════════════════\n`);

    const result = {
      station: currentStation.name,
      stationCode: currentStation.code,
      stationIdx: trainState.currentStationIdx,
      deboarded: 0,
      noShows: 0,
      boarded: 0,
      racAllocated: 0,
      vacancies: 0,
      stats: null
    };

    // 1. Deboard passengers
    result.deboarded = this.deboardPassengers(trainState);
    
    // 2. Process no-shows
    result.noShows = this.processNoShows(trainState);
    
    // 3. Find vacant berths
    const vacancies = this.findVacantBerths(trainState);
    result.vacancies = vacancies.length;
    
    // 4. Allocate RAC passengers
    result.racAllocated = this.allocateRACPassengers(trainState, vacancies);
    
    // 5. Board passengers
    result.boarded = this.boardPassengers(trainState);
    
    // 6. Update statistics
    trainState.updateStats();
    result.stats = { ...trainState.stats };

    console.log(`\n📊 Station Summary:`);
    console.log(`   Deboarded: ${result.deboarded}`);
    console.log(`   No-shows: ${result.noShows}`);
    console.log(`   RAC Upgraded: ${result.racAllocated}`);
    console.log(`   Boarded: ${result.boarded}`);
    console.log(`   Current Onboard: ${result.stats.currentOnboard}`);
    console.log(`   RAC Queue: ${result.stats.racPassengers}`);
    console.log(`   Vacant Berths: ${result.stats.vacantBerths}\n`);

    trainState.logEvent('STATION_ARRIVAL', `Processed station ${currentStation.name}`, result);

    return result;
  }

  /**
   * Deboard passengers at destination
   */
  deboardPassengers(trainState) {
    let deboardedCount = 0;
    const currentIdx = trainState.currentStationIdx;

    trainState.coaches.forEach(coach => {
      coach.berths.forEach(berth => {
        const deboardingPassengers = berth.getDeboardingPassengers(currentIdx);
        
        deboardingPassengers.forEach(p => {
          console.log(`   👋 ${p.name} (PNR: ${p.pnr}) deboarded at ${p.to}`);
          berth.removePassenger(p.pnr);
          deboardedCount++;
          trainState.stats.totalDeboarded++;
        });
      });
    });

    return deboardedCount;
  }

  /**
   * Process no-shows (passengers who didn't board at their origin)
   */
  processNoShows(trainState) {
    let noShowCount = 0;
    const currentIdx = trainState.currentStationIdx;

    trainState.coaches.forEach(coach => {
      coach.berths.forEach(berth => {
        const passengersToRemove = [];
        
        berth.passengers.forEach(p => {
          // If passenger's origin is at or before current station and they're marked no-show but not boarded
          if (p.fromIdx <= currentIdx && p.noShow && !p.boarded) {
            console.log(`   ❌ ${p.name} (PNR: ${p.pnr}) marked as NO-SHOW at ${p.from}`);
            passengersToRemove.push(p.pnr);
            noShowCount++;
            trainState.stats.totalNoShows++;
          }
        });
        
        passengersToRemove.forEach(pnr => berth.removePassenger(pnr));
      });
    });

    return noShowCount;
  }

  /**
   * Find vacant berths
   */
  findVacantBerths(trainState) {
    return trainState.getVacantBerths();
  }

  /**
   * Allocate RAC passengers to vacant berths
   */
  allocateRACPassengers(trainState, vacancies) {
    let allocated = 0;

    vacancies.forEach(vacancy => {
      // Find first eligible RAC passenger for this berth
      const racIndex = trainState.racQueue.findIndex(rac => {
        // Check class match
        if (rac.class !== vacancy.class) return false;

        // Check if berth is available for RAC passenger's journey
        const berth = trainState.findBerth(vacancy.coachNo, vacancy.berthNo);
        if (!berth) return false;

        return berth.isAvailableForSegment(rac.fromIdx, rac.toIdx);
      });

      if (racIndex === -1) return; // No eligible RAC found

      const racPassenger = trainState.racQueue[racIndex];
      const berth = trainState.findBerth(vacancy.coachNo, vacancy.berthNo);

      if (!berth) return;

      // Remove from old location if exists
      const oldLocation = trainState.findPassenger(racPassenger.pnr);
      if (oldLocation) {
        oldLocation.berth.removePassenger(racPassenger.pnr);
      }

      // Add to new berth with CNF status
      berth.addPassenger({
        pnr: racPassenger.pnr,
        name: racPassenger.name,
        age: racPassenger.age,
        gender: racPassenger.gender,
        fromIdx: racPassenger.fromIdx,
        toIdx: racPassenger.toIdx,
        from: racPassenger.from,
        to: racPassenger.to,
        pnrStatus: 'CNF', // Upgrade to CNF
        class: racPassenger.class,
        noShow: false,
        boarded: false
      });

      // Remove from RAC queue
      trainState.racQueue.splice(racIndex, 1);

      console.log(`   ✅ Upgraded: ${racPassenger.name} (${racPassenger.pnrStatus} → CNF) to ${vacancy.fullBerthNo}`);
      allocated++;
      trainState.stats.totalRACUpgraded++;
    });

    return allocated;
  }

  /**
   * Board passengers at origin
   */
  boardPassengers(trainState) {
    let boardedCount = 0;
    const currentIdx = trainState.currentStationIdx;

    trainState.coaches.forEach(coach => {
      coach.berths.forEach(berth => {
        const boardingPassengers = berth.getBoardingPassengers(currentIdx);
        
        boardingPassengers.forEach(p => {
          p.boarded = true;
          console.log(`   ✅ ${p.name} (PNR: ${p.pnr}) boarded at ${p.from}`);
          boardedCount++;
        });
      });
    });

    return boardedCount;
  }
}

module.exports = new StationEventService();