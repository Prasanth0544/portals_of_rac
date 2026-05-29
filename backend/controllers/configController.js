// backend/controllers/configController.js
const db = require("../config/db");
const { COLLECTIONS, DBS, DEFAULTS } = require("../config/collections");

class ConfigController {
  /**
   * Accept dynamic configuration from frontend and (re)connect databases.
   */
  async setup(req, res) {
    try {
      const {
        mongoUri,
        stationsDb,
        stationsCollection,
        passengersDb,
        passengersCollection,
        trainDetailsDb,
        trainDetailsCollection,
        trainNo,
        trainName,
        journeyDate,
      } = req.body;

      // Respect "same database" intent: if passengersDb is absent, use stationsDb
      const finalPassengersDb = passengersDb || stationsDb;

      // Store globally for other controllers/services
      global.RAC_CONFIG = {
        mongoUri,
        stationsDb,
        stationsCollection,
        passengersDb: finalPassengersDb,
        passengersCollection,
        trainDetailsDb,
        trainDetailsCollection,
        trainNo,
        trainName,
        journeyDate,
      };

      // If DB was previously connected, close and reconnect with new config
      try {
        await db.close();
      } catch (error) {
        console.warn(
          "Database was not connected or close failed:",
          error.message,
        );
      }

      await db.connect(global.RAC_CONFIG);

      const active = db.getConfig();

      return res.json({
        success: true,
        message: "Configuration applied and database connected",
        data: {
          mongoUri: active.mongoUri,
          stationsDb: active.stationsDb,
          stationsCollection: active.stationsCollection,
          passengersDb: active.passengersDb,
          passengersCollection: active.passengersCollection,
          trainDetailsDb: active.trainDetailsDb,
          trainDetailsCollection: active.trainDetailsCollection,
          trainNo: active.trainNo,
          trainName,
          journeyDate,
        },
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Register a new train (Admin Landing Page).
   * Auto-creates the stations and passengers collections if they do not already exist,
   * so the admin can register any new train directly from the UI without manual DB setup.
   */
  async registerTrain(req, res) {
    try {
      const {
        trainNo,
        trainName,
        totalCoaches,
        sleeperCoachesCount,
        threeTierACCoachesCount,
      } = req.body;

      if (!trainNo || !trainName) {
        return res.status(400).json({
          success: false,
          message: "Train Number and Name are required",
        });
      }

      const racDb = await db.getDb(); // Connects to 'rac'
      const trainsCollection = racDb.collection(COLLECTIONS.TRAINS_DETAILS);

      // ── Existing check (to reuse collection names if already registered) ───
      let existing = await trainsCollection.findOne({ trainNo });
      if (!existing && !isNaN(Number(trainNo))) {
        existing = await trainsCollection.findOne({ Train_Number: Number(trainNo) });
      }

      // ── Collection names (conventional or reuse existing) ─────────────────
      const stationColName = existing ? (existing.stationsCollection || existing.Station_Collection_Name || `${trainNo}_stations`) : `${trainNo}_stations`;
      const passColName    = existing ? (existing.passengersCollection || existing.Passengers_Collection_Name || `${trainNo}_passengers`) : `${trainNo}_passengers`;

      // ── Auto-create stations collection in 'rac' DB if missing ───────────
      const stationCols = await racDb.listCollections({ name: stationColName }).toArray();
      if (stationCols.length === 0) {
        await racDb.createCollection(stationColName);
        console.log(`✅ Auto-created stations collection: ${stationColName}`);
      }

      // ── Auto-create passengers collection in PassengersDB if missing ──────
      const { MongoClient } = require("mongodb");
      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017";
      const passengersDbName = process.env.PASSENGERS_DB || "PassengersDB";

      const client = new MongoClient(mongoUri);
      await client.connect();
      try {
        const pDb = client.db(passengersDbName);
        const passCols = await pDb.listCollections({ name: passColName }).toArray();
        if (passCols.length === 0) {
          await pDb.createCollection(passColName);
          console.log(`✅ Auto-created passengers collection: ${passColName} in ${passengersDbName}`);
        }
      } finally {
        await client.close();
      }

      // ── Save to Trains_Details ────────────────────────────────────────────
      const trainData = {
        trainNo,
        trainName,
        stationsCollection: stationColName,
        passengersCollection: passColName,
        status: "REGISTERED",
        updatedAt: new Date(),
      };

      if (totalCoaches !== undefined)      trainData.totalCoaches = Number(totalCoaches);
      if (sleeperCoachesCount !== undefined) trainData.sleeperCoachesCount = Number(sleeperCoachesCount);
      if (threeTierACCoachesCount !== undefined) trainData.threeTierACCoachesCount = Number(threeTierACCoachesCount);

      await trainsCollection.updateOne(
        { trainNo },
        { $set: trainData, $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
      );

      console.log(`✅ Train ${trainNo} (${trainName}) registered.`);
      return res.status(201).json({
        success: true,
        message: `Train ${trainNo} (${trainName}) registered successfully.`,
        data: { trainNo, trainName, stationsCollection: stationColName, passengersCollection: passColName },
      });
    } catch (error) {
      console.error("Register train error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * List all registered trains
   */
  async listTrains(req, res) {
    try {
      const racDb = await db.getDb();
      const trainsCollection = racDb.collection(COLLECTIONS.TRAINS_DETAILS);

      const rawTrains = await trainsCollection.find({}).toArray();

      // Normalize field names: DB may have Train_Number/Train_Name (old schema)
      // or trainNo/trainName (new schema). Map both to consistent camelCase.
      const trains = rawTrains.map((doc) => ({
        _id: doc._id,
        trainNo: doc.trainNo || String(doc.Train_Number || ""),
        trainName: doc.trainName || doc.Train_Name || "",
        status: doc.status || "REGISTERED",
        stationsCollection:
          doc.stationsCollection ||
          (doc["Station_Collection_Name "] || "").trim() ||
          doc.Station_Collection_Name ||
          "",
        passengersCollection:
          doc.passengersCollection || doc.Passengers_Collection_Name || "",
        totalCoaches: doc.totalCoaches || doc.Total_Coaches || null,
        sleeperCoachesCount:
          doc.sleeperCoachesCount || doc.Sleeper_Coaches_Count || null,
        threeTierACCoachesCount:
          doc.threeTierACCoachesCount || doc.Three_TierAC_Coaches_Count || null,
        currentStation: doc.currentStation || null,
        currentStationIdx: doc.currentStationIdx != null ? doc.currentStationIdx : null,
        totalStations: doc.totalStations || null,
        createdAt: doc.createdAt || doc.updatedAt || null,
      }));

      return res.json({
        success: true,
        data: trains,
      });
    } catch (error) {
      console.error("List trains error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get auto-derived configuration for a specific train
   * Used when navigating to /train/:trainNo to auto-configure the admin portal
   */
  async getTrainConfig(req, res) {
    try {
      const { trainNo } = req.params;

      if (!trainNo) {
        return res
          .status(400)
          .json({ success: false, message: "Train number is required" });
      }

      // Check if train exists in Trains_Details (handle both old and new schemas)
      const racDb = await db.getDb();
      const trainsCollection = racDb.collection(COLLECTIONS.TRAINS_DETAILS);
      // Try all possible field names and types (string/number)
      let trainDoc = await trainsCollection.findOne({
        $or: [
          { trainNo },
          { trainNo: Number(trainNo) },
          { Train_Number: trainNo },
          { Train_Number: Number(trainNo) },
          { Train_Number: trainNo },
          { Train_Number: Number(trainNo) },
        ]
      });

      if (!trainDoc) {
        return res.status(404).json({
          success: false,
          message: `Train ${trainNo} not found. Please register it first from the landing page.`,
        });
      }

      // Normalize field names from either schema
      const normalizedStationsCol =
        trainDoc.stationsCollection ||
        (trainDoc["Station_Collection_Name "] || "").trim() ||
        trainDoc.Station_Collection_Name ||
        `${trainNo}_stations`;
      const normalizedPassengersCol =
        trainDoc.passengersCollection ||
        trainDoc.Passengers_Collection_Name ||
        `${trainNo}_Passengers`;
      const normalizedTrainName =
        trainDoc.trainName || trainDoc.Train_Name || "";

      // Auto-derive configuration using convention
      const mongoUri =
        process.env.MONGODB_URI ||
        process.env.MONGO_URI ||
        "mongodb://localhost:27017";
      const stationsDb = process.env.STATIONS_DB || "rac";
      const passengersDb = process.env.PASSENGERS_DB || "PassengersDB";
      const trainDetailsDb = process.env.TRAIN_DETAILS_DB || "rac";

      const config = {
        mongoUri,
        stationsDb,
        stationsCollection: normalizedStationsCol,
        passengersDb,
        passengersCollection: normalizedPassengersCol,
        trainDetailsDb,
        trainDetailsCollection: COLLECTIONS.TRAINS_DETAILS,
        trainNo,
        trainName: normalizedTrainName,
        journeyDate:
          trainDoc.journeyDate ||
          process.env.DEFAULT_JOURNEY_DATE ||
          new Date().toISOString().split("T")[0],
      };

      return res.json({
        success: true,
        message: `Configuration for train ${trainNo} retrieved`,
        data: config,
      });
    } catch (error) {
      console.error("Get train config error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  /**
   * Update configuration for a specific train — persists ONLY to that train's
   * document in Trains_Details. Does NOT affect any other train.
   * Called before setupConfig so edits survive beyond the current session.
   */
  async updateTrainConfig(req, res) {
    try {
      const { trainNo } = req.params;

      if (!trainNo) {
        return res
          .status(400)
          .json({ success: false, message: "Train number is required" });
      }

      const {
        trainName,
        stationsCollection,
        passengersCollection,
        stationsDb,
        passengersDb,
        journeyDate,
      } = req.body;

      const racDb = await db.getDb();
      const trainsCollection = racDb.collection(COLLECTIONS.TRAINS_DETAILS);

      // Find the existing document (support both old and new schema keys)
      let trainDoc = await trainsCollection.findOne({ trainNo });
      if (!trainDoc) {
        trainDoc = await trainsCollection.findOne({
          Train_Number: Number(trainNo),
        });
      }

      if (!trainDoc) {
        return res.status(404).json({
          success: false,
          message: `Train ${trainNo} not found in Trains_Details. Please register it first.`,
        });
      }

      // Build the $set payload — only update fields that were actually provided
      const updateFields = { updatedAt: new Date() };

      if (trainName !== undefined) updateFields.trainName = trainName;
      if (stationsCollection !== undefined)
        updateFields.stationsCollection = stationsCollection;
      if (passengersCollection !== undefined)
        updateFields.passengersCollection = passengersCollection;
      if (stationsDb !== undefined) updateFields.stationsDb = stationsDb;
      if (passengersDb !== undefined) updateFields.passengersDb = passengersDb;
      if (journeyDate !== undefined) updateFields.journeyDate = journeyDate;

      // Use the same filter key as the found document
      const filterKey = trainDoc.trainNo
        ? { trainNo }
        : { Train_Number: Number(trainNo) };

      await trainsCollection.updateOne(filterKey, { $set: updateFields });

      console.log(
        `[ConfigController] Updated config for train ${trainNo}:`,
        updateFields,
      );

      return res.json({
        success: true,
        message: `Configuration for train ${trainNo} updated successfully.`,
        data: { trainNo, ...updateFields },
      });
    } catch (error) {
      console.error("updateTrainConfig error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  /**
   * GET /api/admin/system-config
   * Returns all system_config key-value pairs (admin panel).
   */
  async getSystemConfig(req, res) {
    try {
      const SystemConfigService = require('../services/SystemConfigService');
      const configs = await SystemConfigService.getAll();
      return res.json({ success: true, data: configs });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/admin/system-config/:key
   * Upsert a single config key-value pair.
   * Body: { value: <any> }
   */
  async setSystemConfig(req, res) {
    try {
      const { key } = req.params;
      const { value } = req.body;

      if (value === undefined) {
        return res.status(400).json({ success: false, message: '`value` is required in request body' });
      }

      const updatedBy = req.user?.employeeId || req.user?.email || 'admin';
      const SystemConfigService = require('../services/SystemConfigService');
      await SystemConfigService.set(key, value, updatedBy);

      return res.json({
        success: true,
        message: `Config '${key}' updated by ${updatedBy}`,
        data: { key, value, updatedBy },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new ConfigController();
