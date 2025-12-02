// backend/controllers/passengerController.js
const DataService = require("../services/DataService");
const PassengerService = require("../services/PassengerService");
const db = require("../config/db");
const wsManager = require("../config/websocket");
const trainController = require("./trainController");

class PassengerController {
  /**
   * Get PNR details (PUBLIC - no authentication required)
   */
  async getPNRDetails(req, res) {
    try {
      const { pnr } = req.params;

      if (!pnr) {
        return res.status(400).json({
          success: false,
          message: "PNR number is required",
        });
      }

      const trainState = trainController.getGlobalTrainState();
      const passengerDetails = await PassengerService.getPassengerDetails(pnr, trainState);

      res.json({
        success: true,
        data: passengerDetails
      });
    } catch (error) {
      console.error("❌ Error getting PNR details:", error);

      const statusCode = error.message === 'PNR not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get passenger details by IRCTC_ID (for passenger portal)
   */
  async getPassengerByIRCTC(req, res) {
    try {
      const { irctcId } = req.params;

      if (!irctcId) {
        return res.status(400).json({
          success: false,
          message: "IRCTC ID is required",
        });
      }

      // Find passenger in database by IRCTC_ID
      const passenger = await db.getPassengersCollection().findOne({
        IRCTC_ID: irctcId
      });

      if (!passenger) {
        return res.status(404).json({
          success: false,
          message: "No booking found for this IRCTC ID"
        });
      }

      // Passenger already has Train_Name, Train_Number, Booking_Date, etc. from database
      // No need to enrich with train state data

      res.json({
        success: true,
        data: passenger
      });
    } catch (error) {
      console.error("❌ Error getting passenger by IRCTC ID:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Mark passenger as no-show (self-cancellation)
   */
  async markNoShow(req, res) {
    try {
      const { pnr } = req.body;

      if (!pnr) {
        return res.status(400).json({
          success: false,
          message: "PNR number is required",
        });
      }

      const passengersCollection = db.getPassengersCollection();
      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized",
        });
      }

      // Update MongoDB
      const result = await passengersCollection.updateOne(
        { PNR_Number: pnr },
        { $set: { NO_show: true } },
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "PNR not found",
        });
      }

      // Update in-memory state
      const passenger = trainState.findPassengerByPNR(pnr);
      if (passenger) {
        passenger.noShow = true;

        // Free up the berth
        const location = trainState.findPassenger(pnr);
        if (location) {
          location.berth.removePassenger(pnr);
          location.berth.updateStatus();
        }

        trainState.stats.totalNoShows++;
        trainState.updateStats();
      }

      // Broadcast update
      if (wsManager) {
        wsManager.broadcastTrainUpdate("NO_SHOW_MARKED", {
          pnr: pnr,
          stats: trainState.stats,
        });
      }

      res.json({
        success: true,
        message: "Passenger marked as no-show successfully",
        data: { pnr: pnr },
      });
    } catch (error) {
      console.error("❌ Error marking no-show:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

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
    const isRACBerth = berth.type === "Side Lower";
    const maxAllowed = isRACBerth ? 2 : 1;

    // Check segmentOccupancy first (modern approach with arrays)
    if (berth.segmentOccupancy && Array.isArray(berth.segmentOccupancy)) {
      for (let i = fromIdx; i < toIdx; i++) {
        const occupants = berth.segmentOccupancy[i] || [];
        if (occupants.length >= maxAllowed) {
          return false; // Segment is fully occupied
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

      // Use getAllPassengers() which includes both berth passengers AND RAC queue
      const allPassengers = trainState.getAllPassengers();

      const counts = {
        total: allPassengers.length,
        cnf: allPassengers.filter((p) => p.pnrStatus === "CNF").length,
        rac: allPassengers.filter((p) => p.pnrStatus === "RAC").length,
        boarded: allPassengers.filter((p) => p.boarded && !p.noShow).length,
        noShow: allPassengers.filter((p) => p.noShow).length,
        online: allPassengers.filter((p) => p.passengerStatus && p.passengerStatus.toLowerCase() === 'online').length,
        offline: allPassengers.filter((p) => !p.passengerStatus || p.passengerStatus.toLowerCase() === 'offline').length,
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

  /**
   * Get pending upgrade notifications for a passenger
   */
  getUpgradeNotifications(req, res) {
    try {
      const { pnr } = req.params;
      const UpgradeNotificationService = require("../services/UpgradeNotificationService");

      const notifications =
        UpgradeNotificationService.getPendingNotifications(pnr);

      res.json({
        success: true,
        data: {
          pnr: pnr,
          count: notifications.length,
          notifications: notifications,
        },
      });
    } catch (error) {
      console.error("❌ Error getting upgrade notifications:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Accept an upgrade offer
   */
  async acceptUpgrade(req, res) {
    try {
      const { pnr, notificationId } = req.body;

      // Validation
      if (!pnr || !notificationId) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: pnr, notificationId",
        });
      }

      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized",
        });
      }

      // Call service for business logic
      const result = await PassengerService.acceptUpgrade(pnr, notificationId, trainState);

      // Note: Actual upgrade will be performed by TTE confirmation
      // This just marks the passenger's acceptance

      // Broadcast update via WebSocket
      if (wsManager) {
        wsManager.broadcastTrainUpdate("RAC_UPGRADE_ACCEPTED", {
          pnr: pnr,
          notification: result.notification,
          passenger: result.passenger
        });
      }

      res.json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      console.error("❌ Error accepting upgrade:", error);

      const statusCode = error.message.includes('not found') ? 404 :
        error.message.includes('expired') ? 400 :
          error.message.includes('already') ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Deny an upgrade offer
   */
  async denyUpgrade(req, res) {
    try {
      const { pnr, notificationId, reason } = req.body;

      // Validation
      if (!pnr || !notificationId) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: pnr, notificationId",
        });
      }

      // Call service for business logic
      const result = await PassengerService.denyUpgrade(pnr, notificationId);

      // Broadcast update via WebSocket
      if (wsManager) {
        wsManager.broadcastTrainUpdate("RAC_UPGRADE_DENIED", {
          pnr: pnr,
          notification: result.notification,
          reason: reason || "Passenger declined"
        });
      }

      res.json({
        success: true,
        message: result.message,
        data: result.notification,
      });
    } catch (error) {
      console.error("❌ Error denying upgrade:", error);

      const statusCode = error.message.includes('not found') ? 404 :
        error.message.includes('already') ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Set passenger online/offline status
   * Used to mark passengers as available for reallocation
   */
  async setPassengerStatus(req, res) {
    try {
      const { pnr, status } = req.body;

      if (!pnr || !status) {
        return res.status(400).json({
          success: false,
          message: "PNR and status are required"
        });
      }

      if (status !== 'online' && status !== 'offline') {
        return res.status(400).json({
          success: false,
          message: "Status must be 'online' or 'offline'"
        });
      }

      const trainState = trainController.getGlobalTrainState();
      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      // Find passenger in train state
      const passengerLocation = trainState.findPassenger(pnr);
      if (!passengerLocation) {
        return res.status(404).json({
          success: false,
          message: "Passenger not found"
        });
      }

      const passenger = passengerLocation.passenger;
      const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);

      // Update in-memory state
      passenger.passengerStatus = capitalizedStatus;

      // Update MongoDB
      try {
        const passengersCollection = db.getPassengersCollection();
        await passengersCollection.updateOne(
          { PNR_Number: pnr },
          { $set: { Passenger_Status: capitalizedStatus } }
        );
        console.log(`✅ Updated passenger status in MongoDB: ${pnr} -> ${capitalizedStatus}`);
      } catch (dbError) {
        console.error(`⚠️  Failed to update MongoDB:`, dbError.message);
      }

      // Update RAC queue if this is a RAC passenger
      const racPassenger = trainState.racQueue.find(r => r.pnr === pnr);
      if (racPassenger) {
        racPassenger.passengerStatus = capitalizedStatus;
      }

      console.log(`🔄 Passenger ${pnr} status updated: ${capitalizedStatus}`);

      res.json({
        success: true,
        message: `Passenger status updated to ${capitalizedStatus}`,
        data: {
          pnr: pnr,
          name: passenger.name,
          status: capitalizedStatus,
          pnrStatus: passenger.pnrStatus
        }
      });
    } catch (error) {
      console.error("❌ Error setting passenger status:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Self-revert NO-SHOW status (passenger initiated)
   * POST /api/passenger/revert-no-show
   * Body: { pnr: "PNR_NUMBER" }
   * Headers: Authorization Bearer token (authenticated passenger)
   */
  async selfRevertNoShow(req, res) {
    try {
      const { pnr } = req.body;

      if (!pnr) {
        return res.status(400).json({
          success: false,
          message: 'PNR is required'
        });
      }

      // Optional: Verify that the authenticated user owns this PNR
      // if (req.user && req.user.pnr !== pnr) {
      //   return res.status(403).json({
      //     success: false,
      //     message: 'You can only revert your own PNR'
      //   });
      // }

      const trainState = trainController.getGlobalTrainState();

      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: 'Train not initialized'
        });
      }

      // Use the same revert method from TrainState
      const result = await trainState.revertBoardedPassengerNoShow(pnr);

      res.json({
        success: true,
        message: `NO-SHOW status reverted successfully for passenger ${pnr}`,
        pnr: result.pnr,
        passenger: result.passenger
      });
    } catch (error) {
      console.error('❌ Error self-reverting no-show:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('not marked as NO-SHOW')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Cannot revert')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get in-app notifications for passenger
   * GET /api/passenger/notifications
   */
  getInAppNotifications(req, res) {
    try {
      // Get IRCTC ID from authenticated user or query
      const irctcId = req.user?.irctcId || req.query.irctcId;

      if (!irctcId) {
        return res.status(400).json({
          success: false,
          message: 'IRCTC ID is required'
        });
      }

      const InAppNotificationService = require('../services/InAppNotificationService');
      const notifications = InAppNotificationService.getNotifications(irctcId);
      const stats = InAppNotificationService.getStats(irctcId);

      res.json({
        success: true,
        data: {
          notifications,
          stats
        }
      });
    } catch (error) {
      console.error('❌ Error getting notifications:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get unread notification count
   * GET /api/passenger/notifications/unread-count
   */
  getUnreadCount(req, res) {
    try {
      const irctcId = req.user?.irctcId || req.query.irctcId;

      if (!irctcId) {
        return res.status(400).json({
          success: false,
          message: 'IRCTC ID is required'
        });
      }

      const InAppNotificationService = require('../services/InAppNotificationService');
      const count = InAppNotificationService.getUnreadCount(irctcId);

      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Mark notification as read
   * POST /api/passenger/notifications/:id/read
   */
  markNotificationRead(req, res) {
    try {
      const { id } = req.params;
      const irctcId = req.user?.irctcId || req.body.irctcId;

      if (!irctcId) {
        return res.status(400).json({
          success: false,
          message: 'IRCTC ID is required'
        });
      }

      const InAppNotificationService = require('../services/InAppNotificationService');
      const notification = InAppNotificationService.markAsRead(irctcId, id);

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: notification
      });
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Mark all notifications as read
   * POST /api/passenger/notifications/mark-all-read
   */
  markAllNotificationsRead(req, res) {
    try {
      const irctcId = req.user?.irctcId || req.body.irctcId;

      if (!irctcId) {
        return res.status(400).json({
          success: false,
          message: 'IRCTC ID is required'
        });
      }

      const InAppNotificationService = require('../services/InAppNotificationService');
      const count = InAppNotificationService.markAllAsRead(irctcId);

      res.json({
        success: true,
        message: `Marked ${count} notifications as read`,
        data: { count }
      });
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Subscribe to push notifications
   * POST /api/passenger/push-subscribe
   */
  subscribeToPush(req, res) {
    try {
      const { irctcId, subscription } = req.body;

      if (!irctcId || !subscription) {
        return res.status(400).json({
          success: false,
          message: 'IRCTC ID and subscription are required'
        });
      }

      const PushSubscriptionService = require('../services/PushSubscriptionService');
      PushSubscriptionService.addSubscription(irctcId, subscription);

      res.json({
        success: true,
        message: 'Subscribed to push notifications'
      });
    } catch (error) {
      console.error('❌ Error subscribing to push:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Unsubscribe from push notifications
   * POST /api/passenger/push-unsubscribe
   */
  unsubscribeFromPush(req, res) {
    try {
      const { irctcId, endpoint } = req.body;

      if (!irctcId || !endpoint) {
        return res.status(400).json({
          success: false,
          message: 'IRCTC ID and endpoint are required'
        });
      }

      const PushSubscriptionService = require('../services/PushSubscriptionService');
      const removed = PushSubscriptionService.removeSubscription(irctcId, endpoint);

      res.json({
        success: removed,
        message: removed ? 'Unsubscribed successfully' : 'Subscription not found'
      });
    } catch (error) {
      console.error('❌ Error unsubscribing from push:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get VAPID public key for push subscription
   * GET /api/passenger/vapid-public-key
   */
  getVapidPublicKey(req, res) {
    try {
      const WebPushService = require('../services/WebPushService');
      const publicKey = WebPushService.getVapidPublicKey();

      res.json({
        success: true,
        publicKey
      });
    } catch (error) {
      console.error('❌ Error getting VAPID key:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new PassengerController();
