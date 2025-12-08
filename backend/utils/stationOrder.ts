/**
 * stationOrder.ts
 * Station utility functions for train journey management
 */

// Type definitions
interface Station {
    idx: number;
    code: string;
    name: string;
    distance?: number;
}

class StationOrder {
    /**
     * Get station by index
     */
    static getStationByIndex(stations: Station[], idx: number): Station | undefined {
        return stations.find(s => s.idx === idx);
    }

    /**
     * Get station by code
     */
    static getStationByCode(stations: Station[], code: string): Station | undefined {
        return stations.find(s => s.code === code);
    }

    /**
     * Get station by name
     */
    static getStationByName(stations: Station[], name: string): Station | undefined {
        return stations.find(s => s.name === name);
    }

    /**
     * Find station by search string with flexible matching
     */
    static findStation(stations: Station[], searchStr: string): Station | null {
        if (!stations || !Array.isArray(stations) || stations.length === 0) {
            console.warn('⚠️ StationOrder.findStation: Invalid stations array');
            return null;
        }

        if (!searchStr || typeof searchStr !== 'string') {
            console.warn('⚠️ StationOrder.findStation: Invalid search string');
            return null;
        }

        // First try exact match
        let station = stations.find(s =>
            s.code === searchStr ||
            s.name === searchStr
        );

        if (station) return station;

        // Try includes match
        station = stations.find(s =>
            searchStr.includes(s.code) ||
            searchStr.includes(s.name)
        );

        if (station) return station;

        // Fuzzy match: normalize and compare
        const normalize = (str: string | null | undefined): string => {
            if (!str) return '';
            return str
                .toLowerCase()
                .replace(/\s*\([a-z0-9]+\)\s*/gi, '')
                .replace(/\s+(jn|junction|station|halt|town|city|road)$/i, '')
                .replace(/\s+/g, ' ')
                .trim();
        };

        const normalizedSearch = normalize(searchStr);

        return stations.find(s => {
            const normalizedCode = normalize(s.code);
            const normalizedName = normalize(s.name);

            return normalizedCode === normalizedSearch ||
                normalizedName === normalizedSearch ||
                normalizedSearch.includes(normalizedCode) ||
                normalizedSearch.includes(normalizedName);
        }) || null;
    }

    /**
     * Get station index by code
     */
    static getIndexByCode(stations: Station[], code: string): number {
        const station = this.getStationByCode(stations, code);
        return station ? station.idx : -1;
    }

    /**
     * Get next station
     */
    static getNextStation(stations: Station[], currentIdx: number): Station | undefined {
        return stations.find(s => s.idx === currentIdx + 1);
    }

    /**
     * Get previous station
     */
    static getPreviousStation(stations: Station[], currentIdx: number): Station | undefined {
        return stations.find(s => s.idx === currentIdx - 1);
    }

    /**
     * Get stations between two indices
     */
    static getStationsBetween(stations: Station[], fromIdx: number, toIdx: number): Station[] {
        return stations.filter(s => s.idx >= fromIdx && s.idx <= toIdx);
    }

    /**
     * Calculate distance between stations
     */
    static calculateDistance(fromIdx: number, toIdx: number): number {
        return Math.abs(toIdx - fromIdx);
    }

    /**
     * Check if journey is valid (destination after origin)
     */
    static isValidJourney(fromIdx: number, toIdx: number): boolean {
        return toIdx > fromIdx;
    }

    /**
     * Format station name with code
     */
    static formatStationName(station: Station): string {
        return `${station.name} (${station.code})`;
    }

    /**
     * Get all station codes
     */
    static getAllStationCodes(stations: Station[]): string[] {
        return stations.map(s => s.code);
    }

    /**
     * Get journey description
     */
    static getJourneyDescription(stations: Station[], fromIdx: number, toIdx: number): string {
        const fromStation = this.getStationByIndex(stations, fromIdx);
        const toStation = this.getStationByIndex(stations, toIdx);

        if (!fromStation || !toStation) {
            return 'Invalid journey';
        }

        const distance = this.calculateDistance(fromIdx, toIdx);
        return `${fromStation.code} → ${toStation.code} (${distance} segments)`;
    }
}

module.exports = StationOrder;
export default StationOrder;
