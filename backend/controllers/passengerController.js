// backend/controllers/passengerController.js
const DataService = require("../services/DataService");
const db = require("../config/db");
const wsManager = require("../config/websocket");
const trainController = require("./trainController");

class PassengerController {
  // backend/controllers/passengerController.js (ADD THIS METHOD)

  /**
   * Get list of vacant berths with details
   */
  async getVacantBerths(req, res) {
    try {
      const trainState = global.trainState;

      if (!trainState) {
        return res.status(404).json({
          success: false,
          message: "Train not initialized",
        });
      }

      const vacantBerthsList = [];
      const stations = trainState.stations;

      // Loop through all coaches
      for (const coach of trainState.coaches) {
        // Loop through all berths in the coach
        for (const berth of coach.berths) {
          // Find vacant segments in this berth
          const vacantSegments = [];
          let segmentStart = null;

          for (let i = 0; i < berth.segments.length; i++) {
            if (berth.segments[i].status === "vacant") {
              if (segmentStart === null) {
                segmentStart = i;
              }

              // If this is the last segment or next segment is occupied
              if (
                i === berth.segments.length - 1 ||
                berth.segments[i + 1].status !== "vacant"
              ) {
                vacantSegments.push({
                  startIdx: segmentStart,
                  endIdx: i,
                  startStation: stations[segmentStart].code,
                  endStation: stations[i + 1].code,
                  startStationName: stations[segmentStart].name,
                  endStationName: stations[i + 1].name,
                });
                segmentStart = null;
              }
            }
          }

          // If this berth has vacant segments, add to list
          if (vacantSegments.length > 0) {
            vacantBerthsList.push({
              berthId: berth.berth_id,
              berthNo: berth.berth_no,
              coachName: coach.coach_name,
              berthType: berth.berth_type,
              vacantSegments: vacantSegments,
            });
          }
        }
      }

      res.json({
        success: true,
        data: {
          totalVacant: vacantBerthsList.length,
          vacantBerths: vacantBerthsList,
        },
      });
    } catch (error) {
      console.error("❌ Error getting vacant berths:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Add new passenger dynamically
   */
  async addPassenger(req, res) {
    try {
      const passengerData = req.body;

      // Validate required fields
      const required = [
        "pnr",
        "name",
        "age",
        "gender",
        "from",
        "to",
        "class",
        "coach",
        "seat_no",
      ];
      for (const field of required) {
        if (!passengerData[field]) {
          return res.status(400).json({
            success: false,
            message: `Missing required field: ${field}`,
          });
        }
      }
      const trainState = trainController.getGlobalTrainState();
      if (!trainState) {
        return res
          .status(400)
          .json({ success: false, message: "Train not initialized" });
      }
      const passengersCollection = db.getPassengersCollection();
      // Find stations by code
      const fromStation = DataService.findStation(
        trainState.stations,
        passengerData.from,
      );
      const toStation = DataService.findStation(
        trainState.stations,
        passengerData.to,
      );
      if (!fromStation || !toStation) {
        return res.status(400).json({
          success: false,
          message: "Invalid boarding or deboarding station",
        });
      }
      if (fromStation.idx >= toStation.idx) {
        return res.status(400).json({
          success: false,
          message: "To station must be after From station",
        });
      }
      // Check if PNR already exists
      const existing = await passengersCollection.findOne({
        pnr: passengerData.pnr,
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "PNR already exists",
        });
      }
      // Find coach and berth
      const coach = trainState.coaches.find(
        (c) => c.coach_name === passengerData.coach,
      );
      if (!coach) {
        return res.status(400).json({
          success: false,
          message: "Invalid coach",
        });
      }
      const berth = coach.berths.find(
        (b) => b.berth_no === passengerData.seat_no,
      );
      if (!berth) {
        return res.status(400).json({
          success: false,
          message: "Invalid berth number",
        });
      }
      // Check if berth is available for this journey
      const isAvailable = this.checkBerthAvailability(
        berth,
        fromStation.idx,
        toStation.idx,
      );
      if (!isAvailable) {
        return res.status(400).json({
          success: false,
          message: "Berth not available for selected journey",
        });
      }
      // Create new passenger document matching MongoDB schema
      const newPassenger = {
        PNR_Number: passengerData.pnr,
        Train_Number: trainState.trainNo,
        Journey_Date: passengerData.journey_date || trainState.journeyDate,
        Name: passengerData.name,
        Age: parseInt(passengerData.age),
        Gender: passengerData.gender,
        PNR_Status: passengerData.pnr_status || "CNF",
        Class: passengerData.class,
        Rac_status: passengerData.rac_status || "-",
        Boarding_Station: passengerData.from,
        Deboarding_Station: passengerData.to,
        Assigned_Coach: passengerData.coach,
        Assigned_berth: parseInt(passengerData.seat_no),
        Berth_Type: berth.berth_type,
        NO_show: false,
      };
      // Insert into MongoDB
      await passengersCollection.insertOne(newPassenger);

      // Update berth segmentOccupancy in trainState
      if (!berth.segmentOccupancy) {
        berth.segmentOccupancy = new Array(trainState.stations.length).fill(
          null,
        );
      }
      for (let i = fromStation.idx; i < toStation.idx; i++) {
        berth.segmentOccupancy[i] = newPassenger.PNR_Number;
      }

      // Also update legacy segments if they exist
      if (berth.segments) {
        for (let i = fromStation.idx; i < toStation.idx; i++) {
          berth.segments[i].status = "occupied";
          berth.segments[i].pnr = newPassenger.PNR_Number;
        }
      }

      // Update berth overall status
      berth.updateStatus();
      // Update statistics
      trainState.stats.totalPassengers++;
      // Check if passenger has RAC status (PNR_Status is "RAC")
      if (newPassenger.PNR_Status === "RAC") {
        // Add to RAC queue
        const racNumber = newPassenger.Rac_status
          ? parseInt(newPassenger.Rac_status)
          : 999;

        trainState.racQueue.push({
          pnr: newPassenger.PNR_Number,
          name: newPassenger.Name,
          age: newPassenger.Age,
          gender: newPassenger.Gender,
          racNumber: racNumber,
          class: newPassenger.Class,
          from: fromStation.code,
          fromIdx: fromStation.idx,
          to: toStation.code,
          toIdx: toStation.idx,
          pnrStatus: newPassenger.PNR_Status,
          racStatus: newPassenger.Rac_status
            ? `RAC ${newPassenger.Rac_status}`
            : "RAC",
          coach: newPassenger.Assigned_Coach,
          seatNo: newPassenger.Assigned_berth,
          berthType: newPassenger.Berth_Type,
        });

        // Sort RAC queue by RAC number
        trainState.racQueue.sort((a, b) => a.racNumber - b.racNumber);

        trainState.stats.racPassengers++;
      } else if (newPassenger.PNR_Status === "CNF") {
        trainState.stats.cnfPassengers++;
      }
      // Recalculate vacant berths
      trainState.stats.vacantBerths = this.countVacantBerths(trainState);

      // Broadcast update via WebSocket
      if (wsManager) {
        wsManager.broadcastTrainUpdate("PASSENGER_ADDED", {
          passenger: newPassenger,
          stats: trainState.stats,
        });
      }
      res.json({
        success: true,
        message: "Passenger added successfully",
        data: newPassenger,
      });
    } catch (error) {
      console.error("❌ Error getting passenger counts:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Helper method to check berth availability
  checkBerthAvailability(berth, fromIdx, toIdx) {
    // Check segmentOccupancy first (modern approach)
    if (berth.segmentOccupancy && Array.isArray(berth.segmentOccupancy)) {
      for (let i = fromIdx; i < toIdx; i++) {
        if (
          berth.segmentOccupancy[i] !== null &&
          berth.segmentOccupancy[i] !== undefined
        ) {
          return false; // Segment is occupied
        }
      }
      return true;
    }

    // Fallback to legacy segments
    if (berth.segments && Array.isArray(berth.segments)) {
      for (let i = fromIdx; i < toIdx; i++) {
        if (berth.segments[i].status !== "vacant") {
          return false;
        }
      }
      return true;
    }

    return false; // No valid data structure found
  }

  // Helper method to count vacant berths at current station
  countVacantBerths(trainState) {
    let count = 0;
    const currentIdx = trainState.currentStationIdx;

    for (const coach of trainState.coaches) {
      for (const berth of coach.berths) {
        // Count vacant berths at CURRENT station using segment occupancy
        if (
          berth.segmentOccupancy &&
          berth.segmentOccupancy[currentIdx] === null
        ) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Get all passengers
   */
  getAllPassengers(req, res) {
    try {
      const trainState = trainController.getGlobalTrainState();
      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized",
        });
      }

      const passengers = trainState.getAllPassengers();

      res.json({
        success: true,
        data: {
          total: passengers.length,
          passengers: passengers,
        },
      });
    } catch (error) {
      console.error("❌ Error adding passenger:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get passengers by status
   */
  getPassengersByStatus(req, res) {
    try {
      const { status } = req.params;
      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized",
        });
      }

      const allPassengers = trainState.getAllPassengers();
      let filtered = [];

      switch (status.toLowerCase()) {
        case "cnf":
          filtered = allPassengers.filter((p) => p.pnrStatus === "CNF");
          break;
        case "rac":
          filtered = allPassengers.filter((p) => p.pnrStatus.startsWith("RAC"));
          break;
        case "boarded":
          filtered = allPassengers.filter((p) => p.boarded);
          break;
        case "no-show":
          filtered = allPassengers.filter((p) => p.noShow);
          break;
        case "upcoming":
          filtered = allPassengers.filter(
            (p) => p.fromIdx > trainState.currentStationIdx && !p.noShow,
          );
          break;
        case "missed":
          filtered = allPassengers.filter(
            (p) =>
              p.fromIdx <= trainState.currentStationIdx &&
              !p.boarded &&
              !p.noShow,
          );
          break;
        default:
          return res.status(400).json({
            success: false,
            message: `Invalid status: ${status}`,
          });
      }

      res.json({
        success: true,
        data: {
          status: status,
          count: filtered.length,
          passengers: filtered,
        },
      });
    } catch (error) {
      console.error("❌ Error getting passengers by status:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get passenger counts by status
   */
  getPassengerCounts(req, res) {
    try {
      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized",
        });
      }

      const allPassengers = trainState.getAllPassengers();

      const counts = {
        total: trainState.stats.totalPassengers,
        cnf: trainState.stats.cnfPassengers,
        rac: trainState.stats.racPassengers,
        racCnf: trainState.stats.totalRACUpgraded || 0,
        boarded: allPassengers.filter((p) => p.boarded).length,
        noShow: allPassengers.filter((p) => p.noShow).length,
        upcoming: allPassengers.filter(
          (p) => p.fromIdx > trainState.currentStationIdx && !p.noShow,
        ).length,
        missed: allPassengers.filter(
          (p) =>
            p.fromIdx <= trainState.currentStationIdx &&
            !p.boarded &&
            !p.noShow,
        ).length,
      };

      res.json({
        success: true,
        data: counts,
      });
    } catch (error) {
      console.error("❌ Error getting passenger counts:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new PassengerController();
