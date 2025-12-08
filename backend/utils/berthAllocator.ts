/**
 * berthAllocator.ts
 * Berth allocation utilities for RAC passenger management
 */

// Type definitions
interface Berth {
    berthNo: number;
    type: string;
    status: string;
    passengers: { pnr: string }[];
}

interface Coach {
    class: string;
    berths: Berth[];
}

interface Passenger {
    class: string;
    fromIdx: number;
    toIdx: number;
}

interface ValidationResult {
    valid: boolean;
    reason: string;
}

interface ParsedBerth {
    coach: string;
    seat: string;
}

interface TrainState {
    getCoachClassFromBerth(berth: Berth): string;
}

interface BerthWithAvailability extends Berth {
    isAvailableForSegment(fromIdx: number, toIdx: number): boolean;
}

class BerthAllocator {
    /**
     * Get all side lower berth numbers for Sleeper (SL) coaches - 72 berths
     */
    static getSideLowerBerths(coachClass: string = 'SL'): number[] {
        if (coachClass === 'AC_3_Tier') {
            return [7, 15, 23, 31, 39, 47, 55, 63];
        }
        return [7, 15, 23, 31, 39, 47, 55, 63, 71];
    }

    static isSideLowerBerth(seatNo: number | string, coachClass: string = 'SL'): boolean {
        return this.getSideLowerBerths(coachClass).includes(parseInt(String(seatNo)));
    }

    static getBerthPriority(berthType: string): number {
        const priority: { [key: string]: number } = {
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
    static sortBerthsByPriority(berths: Berth[]): Berth[] {
        return berths.sort((a, b) => {
            const priorityA = this.getBerthPriority(a.type);
            const priorityB = this.getBerthPriority(b.type);
            return priorityA - priorityB;
        });
    }

    /**
     * Parse berth notation (e.g., "S1-15" -> {coach: "S1", seat: "15"})
     */
    static parseBerthNotation(berthNotation: string): ParsedBerth {
        const parts = berthNotation.split('-');
        return {
            coach: parts[0],
            seat: parts[1]
        };
    }

    /**
     * Calculate total berths
     */
    static calculateTotalBerths(coachCount: number, berthsPerCoach: number): number {
        return coachCount * berthsPerCoach;
    }

    /**
     * Get available RAC berths (side lower berths)
     */
    static getAvailableRACBerths(coach: Coach): Berth[] {
        const sideLowerBerths = this.getSideLowerBerths(coach.class);
        return coach.berths.filter(berth =>
            sideLowerBerths.includes(berth.berthNo) &&
            (berth.status === 'VACANT' || berth.status === 'OCCUPIED')
        );
    }

    /**
     * Get berth type from seat number and coach class
     */
    static getBerthTypeFromSeatNo(seatNo: number, coachClass: string = 'SL'): string {
        if (coachClass === 'AC_3_Tier') {
            const berthMapping3A = {
                lowerBerths: [1, 4, 9, 12, 17, 20, 25, 28, 33, 36, 41, 44, 49, 52, 57, 60],
                middleBerths: [2, 5, 10, 13, 18, 21, 26, 29, 34, 37, 42, 45, 50, 53, 58, 61],
                upperBerths: [3, 6, 11, 14, 19, 22, 27, 30, 35, 38, 43, 46, 51, 54, 59, 62],
                sideLower: [7, 15, 23, 31, 39, 47, 55, 63],
                sideUpper: [8, 16, 24, 32, 40, 48, 56, 64]
            };

            if (berthMapping3A.lowerBerths.includes(seatNo)) return "Lower Berth";
            if (berthMapping3A.middleBerths.includes(seatNo)) return "Middle Berth";
            if (berthMapping3A.upperBerths.includes(seatNo)) return "Upper Berth";
            if (berthMapping3A.sideLower.includes(seatNo)) return "Side Lower";
            if (berthMapping3A.sideUpper.includes(seatNo)) return "Side Upper";

            return "Lower Berth";
        }

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
    static canAccommodateRAC(berth: Berth, coachClass: string = 'SL'): boolean {
        return this.isSideLowerBerth(berth.berthNo, coachClass) && berth.passengers.length < 2;
    }

    /**
     * Get compartment number from seat
     */
    static getCompartmentNumber(seatNo: number): number {
        return Math.ceil(seatNo / 8);
    }

    /**
     * Check if berths are in same compartment
     */
    static areBerthsInSameCompartment(seatNo1: number, seatNo2: number): boolean {
        return this.getCompartmentNumber(seatNo1) === this.getCompartmentNumber(seatNo2);
    }

    /**
     * Get all berths in compartment
     */
    static getBerthsInCompartment(compartmentNo: number): number[] {
        const start = (compartmentNo - 1) * 8 + 1;
        const end = compartmentNo * 8;
        const berths: number[] = [];
        for (let i = start; i <= end; i++) {
            berths.push(i);
        }
        return berths;
    }

    /**
     * Validate berth allocation
     */
    static validateBerthAllocation(berth: BerthWithAvailability, passenger: Passenger, trainState: TrainState): ValidationResult {
        const coachClass = trainState.getCoachClassFromBerth(berth);

        if (coachClass !== passenger.class) {
            return { valid: false, reason: 'Class mismatch' };
        }

        if (!berth.isAvailableForSegment(passenger.fromIdx, passenger.toIdx)) {
            return { valid: false, reason: 'Segment not available' };
        }

        return { valid: true, reason: 'Valid allocation' };
    }

    /**
     * Find optimal berth for passenger
     */
    static findOptimalBerth(vacantBerths: Berth[], passenger: Passenger, preferredType: string | null = null): Berth | null {
        let filtered = vacantBerths;

        if (preferredType) {
            filtered = filtered.filter(b => b.type === preferredType);
        }

        filtered = this.sortBerthsByPriority(filtered);

        return filtered.length > 0 ? filtered[0] : null;
    }
}

module.exports = BerthAllocator;
export default BerthAllocator;
