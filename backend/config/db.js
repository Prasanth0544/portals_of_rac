// backend/config/db.js - DYNAMIC DATABASE VERSION

const { MongoClient } = require('mongodb');
require('dotenv').config();

let stationsClient = null;
let passengersClient = null;

class Database {
  constructor() {
    this.stationsDb = null;
    this.passengersDb = null;
    this.trainDetailsDb = null;
    this.stationsCollection = null;
    this.passengersCollection = null;
    this.trainDetailsCollection = null;
    this.currentTrainNo = null;
    this.config = null;
    this.mongoUri = null;
    this.stationsDbName = null;
    this.passengersDbName = null;
    this.trainDetailsDbName = null;
    this.stationsCollectionName = null;
    this.passengersCollectionName = null;
    this.trainDetailsCollectionName = null;
  }

  /**
   * Connect to MongoDB using dynamic configuration
   */
  async connect(config = null) {
    try {
      // Use provided config or global config only. No env/default fallbacks.
      const finalConfig = config || global.RAC_CONFIG || {};

      // Validate required config
      if (!finalConfig.mongoUri || !finalConfig.stationsDb || !finalConfig.passengersDb || 
          !finalConfig.stationsCollection || !finalConfig.passengersCollection) {
        throw new Error('Database configuration missing. Please submit configuration via /api/config/setup from the frontend.');
      }

      this.config = finalConfig;
      this.mongoUri = finalConfig.mongoUri;
      this.stationsDbName = finalConfig.stationsDb;
      this.passengersDbName = finalConfig.passengersDb;
      this.trainDetailsDbName = finalConfig.trainDetailsDb || finalConfig.stationsDb;
      this.stationsCollectionName = finalConfig.stationsCollection;
      this.passengersCollectionName = finalConfig.passengersCollection;
      this.trainDetailsCollectionName = finalConfig.trainDetailsCollection || 'Trains_Details';
      this.currentTrainNo = finalConfig.trainNo;

      // Create MongoDB clients
      stationsClient = new MongoClient(this.mongoUri);
      passengersClient = new MongoClient(this.mongoUri);
      
      // Connect to stations database
      await stationsClient.connect();
      this.stationsDb = stationsClient.db(this.stationsDbName);
      this.stationsCollection = this.stationsDb.collection(this.stationsCollectionName);
      
      console.log('');
      console.log('╔════════════════════════════════════════════╗');
      console.log('║     ✅ MongoDB Connected (Stations)       ║');
      console.log('╚════════════════════════════════════════════╝');
      console.log(`📦 Database: ${this.stationsDbName}`);
      console.log(`📁 Collection: ${this.stationsCollectionName}`);
      console.log('');

      // Connect to passengers database
      await passengersClient.connect();
      this.passengersDb = passengersClient.db(this.passengersDbName);
      this.passengersCollection = this.passengersDb.collection(this.passengersCollectionName);
      
      console.log('╔════════════════════════════════════════════╗');
      console.log('║   ✅ MongoDB Connected (Passengers)       ║');
      console.log('╚════════════════════════════════════════════╝');
      console.log(`📦 Database: ${this.passengersDbName}`);
      console.log(`📁 Collection: ${this.passengersCollectionName}`);
      console.log('');
      
      // Initialize Train Details collection (can be in same or different DB)
      this.trainDetailsDb = stationsClient.db(this.trainDetailsDbName);
      this.trainDetailsCollection = this.trainDetailsDb.collection(this.trainDetailsCollectionName);
      console.log('╔════════════════════════════════════════════╗');
      console.log('║   ✅ MongoDB Connected (Train Details)     ║');
      console.log('╚════════════════════════════════════════════╝');
      console.log(`📦 Database: ${this.trainDetailsDbName}`);
      console.log(`📁 Collection: ${this.trainDetailsCollectionName}`);
      console.log('');

      return this;
    } catch (err) {
      console.error('❌ MongoDB connection error:', err);
      throw err;
    }
  }

  /**
   * Switch to a different collection (for multi-train support)
   */
  switchTrain(trainNo, stationsCollectionName = null, passengersCollectionName = null) {
    this.currentTrainNo = trainNo;
    
    if (!stationsCollectionName || !passengersCollectionName) {
      throw new Error('Collection names are required when switching trains.');
    }
    
    this.stationsCollectionName = stationsCollectionName;
    this.passengersCollectionName = passengersCollectionName;
    
    this.stationsCollection = this.stationsDb.collection(stationsCollectionName);
    this.passengersCollection = this.passengersDb.collection(passengersCollectionName);
    
    console.log(`\n🔄 Switched to train ${trainNo}`);
    console.log(`📁 Stations: ${stationsCollectionName}`);
    console.log(`📁 Passengers: ${passengersCollectionName}\n`);
  }

  /**
   * Switch databases and collections based on Train_Details metadata
   */
  switchTrainByDetails({ stationsDb, stationsCollection, passengersDb, passengersCollection, trainNo }) {
    this.currentTrainNo = trainNo || this.currentTrainNo;
    if (!stationsDb || !stationsCollection || !passengersDb || !passengersCollection) {
      throw new Error('All DB and collection names are required for switchTrainByDetails');
    }

    // Re-point databases using existing clients
    this.stationsDbName = stationsDb;
    this.passengersDbName = passengersDb;
    this.stationsCollectionName = stationsCollection;
    this.passengersCollectionName = passengersCollection;

    this.stationsDb = this.stationsDb.client ? this.stationsDb.client.db(stationsDb) : stationsClient.db(stationsDb);
    this.passengersDb = this.passengersDb.client ? this.passengersDb.client.db(passengersDb) : passengersClient.db(passengersDb);

    this.stationsCollection = this.stationsDb.collection(stationsCollection);
    this.passengersCollection = this.passengersDb.collection(passengersCollection);

    console.log(`\n🔄 Switched databases for train ${this.currentTrainNo}`);
    console.log(`📦 Stations DB: ${stationsDb} / 📁 ${stationsCollection}`);
    console.log(`📦 Passengers DB: ${passengersDb} / 📁 ${passengersCollection}`);
  }

  getStationsDb() {
    if (!this.stationsDb) {
      throw new Error('Stations database not connected. Call connect() first.');
    }
    return this.stationsDb;
  }

  getPassengersDb() {
    if (!this.passengersDb) {
      throw new Error('Passengers database not connected. Call connect() first.');
    }
    return this.passengersDb;
  }

  getStationsCollection() {
    if (!this.stationsCollection) {
      throw new Error('Stations collection not initialized. Call connect() first.');
    }
    return this.stationsCollection;
  }

  getPassengersCollection() {
    if (!this.passengersCollection) {
      throw new Error('Passengers collection not initialized. Call connect() first.');
    }
    return this.passengersCollection;
  }

  getTrainDetailsCollection() {
    if (!this.trainDetailsCollection) {
      throw new Error('Train details collection not initialized. Call connect() first.');
    }
    return this.trainDetailsCollection;
  }

  async close() {
    try {
      if (stationsClient) await stationsClient.close();
      if (passengersClient) await passengersClient.close();
      console.log('📦 MongoDB connections closed');
    } catch (err) {
      console.error('Error closing MongoDB connections:', err);
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      mongoUri: this.mongoUri,
      stationsDb: this.stationsDbName,
      passengersDb: this.passengersDbName,
      stationsCollection: this.stationsCollectionName,
      passengersCollection: this.passengersCollectionName,
      trainDetailsDb: this.trainDetailsDbName,
      trainDetailsCollection: this.trainDetailsCollectionName,
      trainNo: this.currentTrainNo
    };
  }
}

const dbInstance = new Database();
module.exports = dbInstance;
