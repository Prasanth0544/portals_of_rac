// backend/services/DataService.js - CORRECTED (HANDLE EMPTY PASSENGERS GRACEFULLY)

const db = require("../config/db");
const TrainState = require("../models/TrainState");

class DataService {
  /**
   * Load complete train data from MongoDB
   */
  async loadTrainData(trainNo, journeyDate, trainName = null) {
    try {
      console.log(`\n🔄 Loading train data...`);
      console.log(`   Train: ${trainNo}`);
      console.log(`   Date: ${journeyDate}`);

      // Get global config if available
      const config = global.RAC_CONFIG || {};

      // Resolve DB/collections: prefer Train_Details per-train metadata
      const trainMeta = await this.getTrainDetails(trainNo).catch(() => null);
      if (
        trainMeta &&
        (trainMeta.Stations_Collection || trainMeta.Passengers_Collection)
      ) {
        const stationsDb = trainMeta.Stations_Db || config.stationsDb;
        const passengersDb = trainMeta.Passengers_Db || config.passengersDb;
        const stationsCollection =
          trainMeta.Stations_Collection || config.stationsCollection;
        const passengersCollection =
          trainMeta.Passengers_Collection || config.passengersCollection;
        db.switchTrainByDetails({
          stationsDb,
          stationsCollection,
          passengersDb,
          passengersCollection,
          trainNo,
        });
      } else {
        // Fallback to explicit names from configuration
        const stationsCol = config.stationsCollection;
        const passengersCol = config.passengersCollection;
        if (!stationsCol || !passengersCol) {
          throw new Error(
            "Collections not configured. Please configure via /api/config/setup.",
          );
        }
        db.switchTrain(trainNo, stationsCol, passengersCol);
      }

      // Get train details from Train_Details collection if available
      const details = await this.getTrainDetails(trainNo).catch(() => null);
      const trainNameToUse =
        trainName ||
        config.trainName ||
        details?.Train_Name ||
        (await this.getTrainName(trainNo));

      const trainState = new TrainState(trainNo, trainNameToUse);
      trainState.journeyDate = journeyDate;

      // Load stations
      console.log(`\n📍 Loading stations...`);
      const stations = await this.loadStations();
      trainState.stations = stations;
      console.log(`   ✅ Loaded ${stations.length} stations`);

      // Initialize coaches dynamically from Train_Details
      console.log(`\n🚃 Initializing coaches...`);
      const sleeperCount = Number(details?.Sleeper_Coaches_Count) || 9;
      const threeAcCount = Number(details?.Three_TierAC_Coaches_Count) || 0;
      trainState.initializeCoaches(sleeperCount, threeAcCount);
      console.log(
        `   ✅ Created ${trainState.coaches.length} coaches (SL=${sleeperCount}, 3A=${threeAcCount})`,
      );

      // Load passengers
      console.log(`\n👥 Loading passengers...`);
      const passengers = await this.loadPassengers(trainNo, journeyDate);
      console.log(`   ✅ Loaded ${passengers.length} passengers`);

      // Allocate passengers
      console.log(`\n🎫 Allocating passengers...`);
      const allocated = this.allocatePassengers(trainState, passengers);
      console.log(`   ✅ Allocated: ${allocated.success}`);
      if (allocated.failed > 0) {
        console.warn(`   ⚠️  Failed: ${allocated.failed}`);
      }

      // Build RAC queue
      console.log(`\n🎯 Building RAC queue...`);
      this.buildRACQueue(trainState, passengers);
      console.log(`   ✅ RAC queue: ${trainState.racQueue.length}`);

      // Update statistics
      trainState.stats.totalPassengers = passengers.length;
      trainState.stats.cnfPassengers = passengers.filter(
        (p) => p.PNR_Status === "CNF",
      ).length;
      trainState.stats.racPassengers = trainState.racQueue.length;
      trainState.updateStats();

      console.log(`\n📊 Initial Statistics:`);
      console.log(`   Total: ${trainState.stats.totalPassengers}`);
      console.log(`   CNF: ${trainState.stats.cnfPassengers}`);
      console.log(`   RAC: ${trainState.stats.racPassengers}`);
      console.log(`   Vacant: ${trainState.stats.vacantBerths}\n`);

      return trainState;
    } catch (error) {
      console.error(`❌ Error loading train data:`, error);
      throw new Error(`Failed to load train data: ${error.message}`);
    }
  }

  /**
   * Load stations from MongoDB
   */
  async loadStations() {
    try {
      const stationsCollection = db.getStationsCollection();

      const stations = await stationsCollection
        .find({})
        .sort({ SNO: 1 })
        .toArray();

      if (!stations || stations.length === 0) {
        throw new Error("No stations found");
      }

      return stations.map((s) => ({
        idx: s.SNO - 1,
        sno: s.SNO,
        code: s.Station_Code,
        name: s.Station_Name,
        arrival: s.Arrival_Time,
        departure: s.Departure_Time,
        distance: s.Distance,
        day: s.Day,
        halt: s.Halt_Duration,
        zone: s.Railway_Zone,
        division: s.Division,
        platform: s.Platform_Number,
        remarks: s.Remarks,
      }));
    } catch (error) {
      throw new Error(`Failed to load stations: ${error.message}`);
    }
  }

  /**
   * Load passengers from MongoDB
   */
  async loadPassengers(trainNo, journeyDate) {
    try {
      const passengersCollection = db.getPassengersCollection();

      // Convert YYYY-MM-DD to DD-MM-YYYY for MongoDB query
      let queryDate = journeyDate;
      if (journeyDate && /^\d{4}-\d{2}-\d{2}$/.test(journeyDate)) {
        const [year, month, day] = journeyDate.split("-");
        queryDate = `${day}-${month}-${year}`;
      }

      const passengers = await passengersCollection
        .find({
          Train_Number: trainNo,
          Journey_Date: queryDate,
        })
        .toArray();

      if (!passengers || passengers.length === 0) {
        const config = global.RAC_CONFIG || {};
        const collectionName = config.passengersCollection;
        console.warn(
          `⚠️ No passengers found for train ${trainNo} on ${queryDate} in ${config.passengersDb || "database"}.${collectionName} collection`,
        );
        console.warn(
          "💡 Make sure your passenger data exists in the configured collection!",
        );
        return []; // Gracefully return empty array instead of throwing
      }

      return passengers;
    } catch (error) {
      throw new Error(`Failed to load passengers: ${error.message}`);
    }
  }

  /**
   * Allocate passengers to berths
   */
  allocatePassengers(trainState, passengers) {
    let success = 0;
    let failed = 0;
    const errors = [];

    passengers.forEach((p) => {
      try {
        // Skip RAC passengers - they should only be in the RAC queue, not allocated to berths
        if (p.PNR_Status === "RAC") {
          return;
        }

        // Find station indices
        const fromStation = this.findStation(
          trainState.stations,
          p.Boarding_Station,
        );
        const toStation = this.findStation(
          trainState.stations,
          p.Deboarding_Station,
        );

        if (!fromStation || !toStation) {
          failed++;
          return;
        }

        // Find berth
        const berth = trainState.findBerth(p.Assigned_Coach, p.Assigned_berth);

        if (!berth) {
          failed++;
          return;
        }

        // Add passenger to berth
        berth.addPassenger({
          pnr: p.PNR_Number,
          name: p.Name,
          age: p.Age,
          gender: p.Gender,
          from: fromStation.code,
          fromIdx: fromStation.idx,
          to: toStation.code,
          toIdx: toStation.idx,
          pnrStatus: p.PNR_Status,
          class: p.Class,
          racStatus:
            p.PNR_Status === "RAC" && p.Rac_status
              ? `RAC ${p.Rac_status}`
              : p.Rac_status || "-",
          berthType: p.Berth_Type,
          noShow: p.NO_show || false,
          boarded: false,
        });

        success++;
      } catch (error) {
        failed++;
        errors.push({ pnr: p.PNR_Number, error: error.message });
      }
    });

    return { success, failed, errors };
  }

  /**
   * Build RAC queue
   */
  buildRACQueue(trainState, passengers) {
    const racPassengers = passengers
      .filter((p) => {
        // Check if PNR_Status is "RAC"
        return p.PNR_Status === "RAC";
      })
      .map((p) => {
        // Extract RAC number from Rac_status field (now just a number string like "1", "2", etc.)
        const racNumber = p.Rac_status ? parseInt(p.Rac_status) : 999;

        const fromStation = this.findStation(
          trainState.stations,
          p.Boarding_Station,
        );
        const toStation = this.findStation(
          trainState.stations,
          p.Deboarding_Station,
        );

        return {
          pnr: p.PNR_Number,
          name: p.Name,
          age: p.Age,
          gender: p.Gender,
          racNumber: racNumber,
          class: p.Class,
          from: fromStation ? fromStation.code : p.Boarding_Station,
          fromIdx: fromStation ? fromStation.idx : 0,
          to: toStation ? toStation.code : p.Deboarding_Station,
          toIdx: toStation ? toStation.idx : trainState.stations.length - 1,
          pnrStatus: p.PNR_Status,
          racStatus: p.Rac_status ? `RAC ${p.Rac_status}` : "RAC",
          coach: p.Assigned_Coach,
          seatNo: p.Assigned_berth,
          berthType: p.Berth_Type,
        };
      })
      .sort((a, b) => a.racNumber - b.racNumber);

    trainState.racQueue = racPassengers;
  }

  /**
   * Find station by code or name
   */
  findStation(stations, stationStr) {
    return stations.find(
      (s) =>
        stationStr.includes(s.code) ||
        stationStr.includes(s.name) ||
        s.code === stationStr ||
        s.name === stationStr,
    );
  }

  /**
   * Get train name from stations collection or use default mapping
   */
  async getTrainName(trainNo) {
    // Default train name mapping
    const trainNames = {
      17225: "Amaravathi Express",
      17226: "Amaravathi Express",
      // Add more train mappings as needed
    };

    // Try Train_Details collection first
    try {
      const detailsCol = db.getTrainDetailsCollection();
      const doc = await detailsCol.findOne({ Train_No: parseInt(trainNo) });
      if (doc && doc.Train_Name) return doc.Train_Name;
    } catch (_) {}

    // Try to get from stations collection metadata if available
    try {
      const stationsCollection = db.getStationsCollection();
      const firstStation = await stationsCollection.findOne({});
      if (firstStation && firstStation.Train_Name) {
        return firstStation.Train_Name;
      }
    } catch (error) {
      console.warn(
        "Could not fetch train name from database, using default mapping",
      );
    }

    return trainNames[trainNo] || `Train ${trainNo}`;
  }

  /**
   * Get train details (name and coach counts) from Train_Details collection
   */
  async getTrainDetails(trainNo) {
    try {
      const col = db.getTrainDetailsCollection();
      const doc = await col.findOne({ Train_No: parseInt(trainNo) });
      if (!doc) return null;
      return doc;
    } catch (error) {
      console.warn("Could not fetch train details:", error.message);
      return null;
    }
  }
}

module.exports = new DataService();
