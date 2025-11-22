// backend/models/Berth.js

class Berth {
  constructor(coachNo, berthNo, type, totalSegments) {
    this.coachNo = coachNo;
    this.berthNo = berthNo;
    this.fullBerthNo = `${coachNo}-${berthNo}`;
    this.type = type;
    this.status = 'VACANT'; // VACANT, OCCUPIED, SHARED

    // Segment-based occupancy
    this.totalSegments = totalSegments;
    this.segmentOccupancy = new Array(totalSegments).fill(null);

    // Passengers list
    this.passengers = [];
  }

  /**
   * Add passenger to berth with segment occupancy
   */
  addPassenger(passenger) {
    this.passengers.push({
      pnr: passenger.pnr,
      name: passenger.name,
      age: passenger.age,
      gender: passenger.gender,
      fromIdx: passenger.fromIdx,
      toIdx: passenger.toIdx,
      from: passenger.from,
      to: passenger.to,
      pnrStatus: passenger.pnrStatus,
      class: passenger.class,
      noShow: passenger.noShow || false,
      boarded: passenger.boarded || false
    });

    // Mark segments as occupied
    if (!passenger.noShow) {
      for (let i = passenger.fromIdx; i < passenger.toIdx; i++) {
        this.segmentOccupancy[i] = passenger.pnr;
      }
    }

    this.updateStatus();
  }

  /**
   * Remove passenger from berth
   */
  removePassenger(pnr) {
    const passenger = this.passengers.find(p => p.pnr === pnr);

    if (passenger) {
      // Clear segment occupancy
      for (let i = 0; i < this.segmentOccupancy.length; i++) {
        if (this.segmentOccupancy[i] === pnr) {
          this.segmentOccupancy[i] = null;
        }
      }

      // Remove from passengers list
      this.passengers = this.passengers.filter(p => p.pnr !== pnr);
      this.updateStatus();

      return true;
    }

    return false;
  }

  /**
   * Update berth status based on current passengers
   */
  updateStatus() {
    const activePassengers = this.passengers.filter(p => !p.noShow);

    if (activePassengers.length === 0) {
      this.status = 'VACANT';
    } else if (activePassengers.length === 1) {
      this.status = 'OCCUPIED';
    } else {
      this.status = 'SHARED';
    }
  }

  /**
   * Check if berth is available for given journey segment
   */
  isAvailableForSegment(fromIdx, toIdx) {
    for (let i = fromIdx; i < toIdx; i++) {
      if (this.segmentOccupancy[i] !== null) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get segment occupancy details
   */
  getSegmentOccupancy() {
    return this.segmentOccupancy.map((pnr, idx) => ({
      segmentId: idx,
      occupied: pnr !== null,
      pnr: pnr
    }));
  }

  /**
   * Get vacant segments
   */
  getVacantSegments() {
    const vacant = [];
    for (let i = 0; i < this.segmentOccupancy.length; i++) {
      if (this.segmentOccupancy[i] === null) {
        vacant.push(i);
      }
    }
    return vacant;
  }

  /**
   * Get boarded passengers
   */
  getBoardedPassengers() {
    return this.passengers.filter(p => p.boarded && !p.noShow);
  }

  /**
   * Check if berth is vacant at specific station
   */
  isVacantAtStation(stationIdx) {
    return this.segmentOccupancy[stationIdx] === null;
  }

  /**
   * Get passengers deboarding at station
   */
  getDeboardingPassengers(stationIdx) {
    return this.passengers.filter(p =>
      p.toIdx === stationIdx && p.boarded && !p.noShow
    );
  }

  /**
   * Get passengers boarding at station
   */
  getBoardingPassengers(stationIdx) {
    return this.passengers.filter(p =>
      p.fromIdx === stationIdx && !p.boarded && !p.noShow
    );
  }

  /**
   * Get RAC passengers on this berth
   */
  getRACPassengers() {
    return this.passengers.filter(p =>
      p.pnrStatus === 'RAC' && !p.noShow
    );
  }

  /**
   * Check if this is a RAC berth (has 2 RAC passengers)
   */
  isRACBerth() {
    const racPassengers = this.getRACPassengers();
    return racPassengers.length === 2;
  }

  /**
   * Get co-passenger sharing RAC berth
   */
  getCoPassenger(pnr) {
    const racPassengers = this.getRACPassengers();
    if (racPassengers.length === 2) {
      return racPassengers.find(p => p.pnr !== pnr) || null;
    }
    return null;
  }

}

module.exports = Berth;