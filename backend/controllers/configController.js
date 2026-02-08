// backend/controllers/configController.js
const db = require('../config/db');

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
   * Get available passenger collections from PassengersDB
   */
  async getPassengerCollections(req, res) {
    try {
      const { MongoClient } = require('mongodb');

      // Use environment variable or default
      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
      const passengersDbName = process.env.PASSENGERS_DB || 'PassengersDB';

      const client = new MongoClient(mongoUri);
      await client.connect();

      const db = client.db(passengersDbName);
      const collections = await db.listCollections().toArray();

      await client.close();

      // Extract collection names
      const collectionNames = collections.map(col => col.name);

      return res.json({
        success: true,
        data: {
          database: passengersDbName,
          collections: collectionNames
        }
      });
    } catch (error) {
      console.error('Error fetching passenger collections:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch passenger collections',
        error: error.message
      });
    }
  }
}

module.exports = new ConfigController();