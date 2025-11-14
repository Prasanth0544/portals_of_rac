// backend/utils/berthAllocator.js

class BerthAllocator {
  /**
   * Get all side lower berth numbers
   */
  static getSideLowerBerths() {
    return [7, 15, 23, 31, 39, 47, 55, 63, 71];
  }

  /**
   * Check if berth is side lower
   */
  static isSideLowerBerth(seatNo) {
    return this.getSideLowerBerths().includes(parseInt(seatNo));
  }

  /**
   * Get berth priority (lower number = higher priority)
   */
  static getBerthPriority(berthType) {
    const priority = {
      'Lower Berth': 1,
      'Side Lower': 2,
      'Middle Berth': 3,
      'Upper Berth': 4,
      'Side Upper': 5
    };
    return priority[berthType] || 99;
  }

  /**
   * Sort berths by priority
   */
  static sortBerthsByPriority(berths) {
    return berths.sort((a, b) => {
      const priorityA = this.getBerthPriority(a.type);
      const priorityB = this.getBerthPriority(b.type);
      return priorityA - priorityB;
    });
  }

  /**
   * Parse berth notation (e.g., "S1-15" -> {coach: "S1", seat: "15"})
   */
  static parseBerthNotation(berthNotation) {
    const parts = berthNotation.split('-');
    return {
      coach: parts[0],
      seat: parts[1]
    };
  }

  /**
   * Calculate total berths
   */
  static calculateTotalBerths(coachCount, berthsPerCoach) {
    return coachCount * berthsPerCoach;
  }

  /**
   * Get available RAC berths (side lower berths)
   */
  static getAvailableRACBerths(coach) {
    const sideLowerBerths = this.getSideLowerBerths();
    return coach.berths.filter(berth => 
      sideLowerBerths.includes(berth.berthNo) && 
      (berth.status === 'VACANT' || berth.status === 'OCCUPIED')
    );
  }

  /**
   * Get berth type from seat number
   */
  static getBerthTypeFromSeatNo(seatNo) {
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
   * Check if berth can accommodate RAC
   */
  static canAccommodateRAC(berth) {
    return this.isSideLowerBerth(berth.berthNo) && berth.passengers.length < 2;
  }

  /**
   * Get compartment number from seat
   */
  static getCompartmentNumber(seatNo) {
    return Math.ceil(seatNo / 8);
  }

  /**
   * Check if berths are in same compartment
   */
  static areBerthsInSameCompartment(seatNo1, seatNo2) {
    return this.getCompartmentNumber(seatNo1) === this.getCompartmentNumber(seatNo2);
  }

  /**
   * Get all berths in compartment
   */
  static getBerthsInCompartment(compartmentNo) {
    const start = (compartmentNo - 1) * 8 + 1;
    const end = compartmentNo * 8;
    const berths = [];
    for (let i = start; i <= end; i++) {
      berths.push(i);
    }
    return berths;
  }

  /**
   * Validate berth allocation
   */
  static validateBerthAllocation(berth, passenger, trainState) {
    // Check class match
    if (berth.class !== passenger.class) {
      return {
        valid: false,
        reason: 'Class mismatch'
      };
    }

    // Check segment availability
    if (!berth.isAvailableForSegment(passenger.fromIdx, passenger.toIdx)) {
      return {
        valid: false,
        reason: 'Segment not available'
      };
    }

    return {
      valid: true,
      reason: 'Valid allocation'
    };
  }

  /**
   * Find optimal berth for passenger
   */
  static findOptimalBerth(vacantBerths, passenger, preferredType = null) {
    let filtered = vacantBerths;

    // Filter by preferred type if specified
    if (preferredType) {
      filtered = filtered.filter(b => b.type === preferredType);
    }

    // Sort by priority
    filtered = this.sortBerthsByPriority(filtered);

    // Return first available
    return filtered.length > 0 ? filtered[0] : null;
  }
}

module.exports = BerthAllocator;