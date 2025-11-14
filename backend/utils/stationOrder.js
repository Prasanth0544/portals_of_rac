// backend/utils/stationOrder.js

class StationOrder {
  /**
   * Get station by index
   */
  static getStationByIndex(stations, idx) {
    return stations.find(s => s.idx === idx);
  }

  /**
   * Get station by code
   */
  static getStationByCode(stations, code) {
    return stations.find(s => s.code === code);
  }

  /**
   * Get station by name
   */
  static getStationByName(stations, name) {
    return stations.find(s => s.name === name);
  }

  /**
   * Find station by search string
   */
  static findStation(stations, searchStr) {
    return stations.find(s => 
      s.code === searchStr ||
      s.name === searchStr ||
      searchStr.includes(s.code) ||
      searchStr.includes(s.name)
    );
  }

  /**
   * Get station index by code
   */
  static getIndexByCode(stations, code) {
    const station = this.getStationByCode(stations, code);
    return station ? station.idx : -1;
  }

  /**
   * Get next station
   */
  static getNextStation(stations, currentIdx) {
    return stations.find(s => s.idx === currentIdx + 1);
  }

  /**
   * Get previous station
   */
  static getPreviousStation(stations, currentIdx) {
    return stations.find(s => s.idx === currentIdx - 1);
  }

  /**
   * Get stations between two indices
   */
  static getStationsBetween(stations, fromIdx, toIdx) {
    return stations.filter(s => s.idx >= fromIdx && s.idx <= toIdx);
  }

  /**
   * Calculate distance between stations
   */
  static calculateDistance(fromIdx, toIdx) {
    return Math.abs(toIdx - fromIdx);
  }

  /**
   * Check if journey is valid (destination after origin)
   */
  static isValidJourney(fromIdx, toIdx) {
    return toIdx > fromIdx;
  }

  /**
   * Format station name with code
   */
  static formatStationName(station) {
    return `${station.name} (${station.code})`;
  }

  /**
   * Get all station codes
   */
  static getAllStationCodes(stations) {
    return stations.map(s => s.code);
  }

  /**
   * Get journey description
   */
  static getJourneyDescription(stations, fromIdx, toIdx) {
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