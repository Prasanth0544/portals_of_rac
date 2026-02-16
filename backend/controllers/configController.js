// backend/controllers/configController.js
const db = require('../config/db');
const { COLLECTIONS, DBS, DEFAULTS } = require('../config/collections');

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
        journeyDate
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
        journeyDate
      };

      // If DB was previously connected, close and reconnect with new config
      try {
        await db.close();
      } catch (error) {
        console.warn('Database was not connected or close failed:', error.message);
      }

      await db.connect(global.RAC_CONFIG);

      const active = db.getConfig();

      return res.json({
        success: true,
        message: 'Configuration applied and database connected',
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
          journeyDate
        }
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Register a new train (Admin Landing Page)
   * Validates that specific collections exist for the train before registering.
   */
  async registerTrain(req, res) {
    try {
      const { trainNo, trainName, totalCoaches, sleeperCoachesCount, threeTierACCoachesCount } = req.body;
      if (!trainNo || !trainName) {
        return res.status(400).json({ success: false, message: 'Train Number and Name are required' });
      }

      const racDb = await db.getDb(); // Connects to 'rac'
      const stationColName = `${trainNo}_stations`;

      // Check if stations collection exists in 'rac' DB
      const stationCols = await racDb.listCollections({ name: stationColName }).toArray();
      if (stationCols.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Station collection '${stationColName}' not found in RAC database. Please create it first.`
        });
      }

      // Derive passengers collection name from Trains_Details (convention: trainNo_passengers)
      const trainsCollection = racDb.collection(COLLECTIONS.TRAINS_DETAILS);

      // Check if train already exists in Trains_Details and has Passengers_Collection_Name
      let existingDoc = await trainsCollection.findOne({ trainNo });
      if (!existingDoc) {
        existingDoc = await trainsCollection.findOne({ Train_No: Number(trainNo) });
      }

      const passColName = existingDoc?.Passengers_Collection_Name
        || existingDoc?.passengersCollection
        || `${trainNo}_passengers`;

      // Validate that the passengers collection exists in PassengersDB
      const { MongoClient } = require('mongodb');
      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
      const passengersDbName = process.env.PASSENGERS_DB || 'PassengersDB';

      const client = new MongoClient(mongoUri);
      await client.connect();
      const pDb = client.db(passengersDbName);
      const passCols = await pDb.listCollections({ name: passColName }).toArray();
      await client.close();

      if (passCols.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Passenger collection '${passColName}' not found in ${passengersDbName}. Please create it first.`
        });
      }

      // Save/update Trains_Details
      const trainData = {
        trainNo,
        trainName,
        stationsCollection: stationColName,
        passengersCollection: passColName,
        status: 'REGISTERED',
        updatedAt: new Date()
      };

      // Add optional coach configuration fields
      if (totalCoaches !== undefined) trainData.totalCoaches = Number(totalCoaches);
      if (sleeperCoachesCount !== undefined) trainData.sleeperCoachesCount = Number(sleeperCoachesCount);
      if (threeTierACCoachesCount !== undefined) trainData.threeTierACCoachesCount = Number(threeTierACCoachesCount);

      await trainsCollection.updateOne(
        { trainNo },
        {
          $set: trainData,
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );

      return res.json({ success: true, message: `Train ${trainNo} (${trainName}) registered successfully.` });

    } catch (error) {
      console.error('Register train error:', error);
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

      // Normalize field names: DB may have Train_No/Train_Name (old schema)
      // or trainNo/trainName (new schema). Map both to consistent camelCase.
      const trains = rawTrains.map(doc => ({
        _id: doc._id,
        trainNo: doc.trainNo || String(doc.Train_No || ''),
        trainName: doc.trainName || doc.Train_Name || '',
        status: doc.status || 'REGISTERED',
        stationsCollection: doc.stationsCollection || (doc['Station_Collection_Name '] || '').trim() || doc.Station_Collection_Name || '',
        passengersCollection: doc.passengersCollection || doc.Passengers_Collection_Name || '',
        totalCoaches: doc.totalCoaches || doc.Total_Coaches || null,
        sleeperCoachesCount: doc.sleeperCoachesCount || doc.Sleeper_Coaches_Count || null,
        threeTierACCoachesCount: doc.threeTierACCoachesCount || doc.Three_TierAC_Coaches_Count || null,
        currentStation: doc.currentStation || null,
        totalStations: doc.totalStations || null,
        createdAt: doc.createdAt || doc.updatedAt || null,
      }));

      return res.json({
        success: true,
        data: trains
      });
    } catch (error) {
      console.error('List trains error:', error);
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
        return res.status(400).json({ success: false, message: 'Train number is required' });
      }

      // Check if train exists in Trains_Details (handle both old and new schemas)
      const racDb = await db.getDb();
      const trainsCollection = racDb.collection(COLLECTIONS.TRAINS_DETAILS);
      // Try new schema (trainNo as string) first, then old schema (Train_No as number)
      let trainDoc = await trainsCollection.findOne({ trainNo });
      if (!trainDoc) {
        trainDoc = await trainsCollection.findOne({ Train_No: Number(trainNo) });
      }

      if (!trainDoc) {
        return res.status(404).json({
          success: false,
          message: `Train ${trainNo} not found. Please register it first from the landing page.`
        });
      }

      // Normalize field names from either schema
      const normalizedStationsCol = trainDoc.stationsCollection
        || (trainDoc['Station_Collection_Name '] || '').trim()
        || trainDoc.Station_Collection_Name
        || `${trainNo}_stations`;
      const normalizedPassengersCol = trainDoc.passengersCollection
        || trainDoc.Passengers_Collection_Name
        || `${trainNo}_Passengers`;
      const normalizedTrainName = trainDoc.trainName || trainDoc.Train_Name || '';

      // Auto-derive configuration using convention
      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
      const stationsDb = process.env.STATIONS_DB || 'rac';
      const passengersDb = process.env.PASSENGERS_DB || 'PassengersDB';
      const trainDetailsDb = process.env.TRAIN_DETAILS_DB || 'rac';

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
        journeyDate: trainDoc.journeyDate || process.env.DEFAULT_JOURNEY_DATE || new Date().toISOString().split('T')[0]
      };

      return res.json({
        success: true,
        message: `Configuration for train ${trainNo} retrieved`,
        data: config
      });

    } catch (error) {
      console.error('Get train config error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new ConfigController();