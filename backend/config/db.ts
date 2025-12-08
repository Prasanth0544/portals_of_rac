// backend/config/db.ts
// TypeScript version with full type safety

import { MongoClient, Db, Collection, Document } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

// Type definitions
interface DatabaseConfig {
    mongoUri: string;
    stationsDb: string;
    passengersDb: string;
    trainDetailsDb?: string;
    stationsCollection: string;
    passengersCollection: string;
    trainDetailsCollection?: string;
    trainNo?: string;
}

let stationsClient: MongoClient | null = null;
let passengersClient: MongoClient | null = null;

class Database {
    private stationsDb: Db | null = null;
    private passengersDb: Db | null = null;
    private trainDetailsDb: Db | null = null;
    private stationsCollection: Collection<Document> | null = null;
    private passengersCollection: Collection<Document> | null = null;
    private trainDetailsCollection: Collection<Document> | null = null;
    private currentTrainNo: string | null = null;
    private config: DatabaseConfig | null = null;
    private mongoUri: string | null = null;
    private stationsDbName: string | null = null;
    private passengersDbName: string | null = null;
    private trainDetailsDbName: string | null = null;
    private stationsCollectionName: string | null = null;
    private passengersCollectionName: string | null = null;
    private trainDetailsCollectionName: string | null = null;

    constructor() {
        // All properties initialized above
    }

    /**
     * Connect to MongoDB using dynamic configuration
     */
    async connect(config: DatabaseConfig | null = null): Promise<Database> {
        try {
            const finalConfig = config || global.RAC_CONFIG || ({} as Partial<DatabaseConfig>);

            if (!finalConfig.mongoUri || !finalConfig.stationsDb || !finalConfig.passengersDb ||
                !finalConfig.stationsCollection || !finalConfig.passengersCollection) {

                console.warn('⚠️ Partial config. Initializing Trains_Details only for bootstrapping...');

                this.mongoUri = finalConfig.mongoUri || "mongodb://localhost:27017";
                this.trainDetailsDbName = (finalConfig as any).trainDetailsDb || "rac";
                this.trainDetailsCollectionName = (finalConfig as any).trainDetailsCollection || "Trains_Details";

                if (stationsClient) await stationsClient.close();

                stationsClient = new MongoClient(this.mongoUri);
                await stationsClient.connect();

                this.trainDetailsDb = stationsClient.db(this.trainDetailsDbName);
                this.trainDetailsCollection = this.trainDetailsDb.collection(this.trainDetailsCollectionName);

                console.log('✅ Connected to Trains_Details (Bootstrap Mode)');
                return this;
            }

            this.config = finalConfig as DatabaseConfig;
            this.mongoUri = finalConfig.mongoUri;
            this.stationsDbName = finalConfig.stationsDb;
            this.passengersDbName = finalConfig.passengersDb;
            this.trainDetailsDbName = finalConfig.trainDetailsDb || finalConfig.stationsDb;
            this.stationsCollectionName = finalConfig.stationsCollection;
            this.passengersCollectionName = finalConfig.passengersCollection;
            this.trainDetailsCollectionName = finalConfig.trainDetailsCollection || 'Trains_Details';
            this.currentTrainNo = finalConfig.trainNo || null;

            stationsClient = new MongoClient(this.mongoUri);
            passengersClient = new MongoClient(this.mongoUri);

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

            await passengersClient.connect();
            this.passengersDb = passengersClient.db(this.passengersDbName);
            this.passengersCollection = this.passengersDb.collection(this.passengersCollectionName);

            console.log('╔════════════════════════════════════════════╗');
            console.log('║   ✅ MongoDB Connected (Passengers)       ║');
            console.log('╚════════════════════════════════════════════╝');
            console.log(`📦 Database: ${this.passengersDbName}`);
            console.log(`📁 Collection: ${this.passengersCollectionName}`);
            console.log('');

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
    switchTrain(trainNo: string, stationsCollectionName: string | null = null, passengersCollectionName: string | null = null): void {
        this.currentTrainNo = trainNo;

        if (!stationsCollectionName || !passengersCollectionName) {
            throw new Error('Collection names are required when switching trains.');
        }

        this.stationsCollectionName = stationsCollectionName;
        this.passengersCollectionName = passengersCollectionName;

        this.stationsCollection = this.stationsDb!.collection(stationsCollectionName);
        this.passengersCollection = this.passengersDb!.collection(passengersCollectionName);

        console.log(`\n🔄 Switched to train ${trainNo}`);
        console.log(`📁 Stations: ${stationsCollectionName}`);
        console.log(`📁 Passengers: ${passengersCollectionName}\n`);
    }

    /**
     * Switch databases and collections based on Train_Details metadata
     */
    switchTrainByDetails({ stationsDb, stationsCollection, passengersDb, passengersCollection, trainNo }: {
        stationsDb: string;
        stationsCollection: string;
        passengersDb: string;
        passengersCollection: string;
        trainNo?: string;
    }): void {
        this.currentTrainNo = trainNo || this.currentTrainNo;
        if (!stationsDb || !stationsCollection || !passengersDb || !passengersCollection) {
            throw new Error('All DB and collection names are required for switchTrainByDetails');
        }

        this.stationsDbName = stationsDb;
        this.passengersDbName = passengersDb;
        this.stationsCollectionName = stationsCollection;
        this.passengersCollectionName = passengersCollection;

        this.stationsDb = stationsClient!.db(stationsDb);
        this.passengersDb = passengersClient!.db(passengersDb);

        this.stationsCollection = this.stationsDb.collection(stationsCollection);
        this.passengersCollection = this.passengersDb.collection(passengersCollection);

        console.log(`\n🔄 Switched databases for train ${this.currentTrainNo}`);
        console.log(`📦 Stations DB: ${stationsDb} / 📁 ${stationsCollection}`);
        console.log(`📦 Passengers DB: ${passengersDb} / 📁 ${passengersCollection}`);
    }

    getStationsDb(): Db {
        if (!this.stationsDb) {
            throw new Error('Stations database not connected. Call connect() first.');
        }
        return this.stationsDb;
    }

    getPassengersDb(): Db {
        if (!this.passengersDb) {
            throw new Error('Passengers database not connected. Call connect() first.');
        }
        return this.passengersDb;
    }

    getStationsCollection(): Collection<Document> {
        if (!this.stationsCollection) {
            throw new Error('Stations collection not initialized. Call connect() first.');
        }
        return this.stationsCollection;
    }

    getPassengersCollection(): Collection<Document> {
        if (!this.passengersCollection) {
            throw new Error('Passengers collection not initialized. Call connect() first.');
        }
        return this.passengersCollection;
    }

    getTrainDetailsCollection(): Collection<Document> {
        if (!this.trainDetailsCollection) {
            throw new Error('Train details collection not initialized. Call connect() first.');
        }
        return this.trainDetailsCollection;
    }

    getStationReallocationCollection(): Collection<Document> {
        if (!this.passengersDb) {
            throw new Error('Passengers database not initialized. Call connect() first.');
        }
        return this.passengersDb.collection('station_reallocations');
    }

    async close(): Promise<void> {
        try {
            if (stationsClient) await stationsClient.close();
            if (passengersClient) await passengersClient.close();
            console.log('📦 MongoDB connections closed');
        } catch (err) {
            console.error('Error closing MongoDB connections:', err);
        }
    }

    /**
     * Get the main 'rac' database for authentication collections
     */
    async getDb(): Promise<Db> {
        if (!stationsClient) {
            stationsClient = new MongoClient(this.mongoUri || 'mongodb://localhost:27017');
            await stationsClient.connect();
        }
        return stationsClient.db('rac');
    }

    /**
     * Get current configuration
     */
    getConfig(): DatabaseConfig & { trainNo: string | null } {
        return {
            mongoUri: this.mongoUri || '',
            stationsDb: this.stationsDbName || '',
            passengersDb: this.passengersDbName || '',
            stationsCollection: this.stationsCollectionName || '',
            passengersCollection: this.passengersCollectionName || '',
            trainDetailsDb: this.trainDetailsDbName || undefined,
            trainDetailsCollection: this.trainDetailsCollectionName || undefined,
            trainNo: this.currentTrainNo
        };
    }
}

const dbInstance = new Database();
module.exports = dbInstance;
export default dbInstance;
