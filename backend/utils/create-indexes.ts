/**
 * create-indexes.ts
 * Database index creation for performance optimization
 */

import { Collection, IndexDescription } from 'mongodb';

const db = require('../config/db');

interface IndexStats {
    name: string;
    accesses: { ops: number };
}

/**
 * Create all necessary indexes
 */
async function createAllIndexes(): Promise<boolean> {
    try {
        console.log('\n🔍 Starting database index creation...\n');

        const passengersCollection: Collection = db.getPassengersCollection();
        const berthsCollection: Collection = db.getBeerthsCollection?.();
        const trainCollection: Collection = db.getTrainCollection?.();

        if (!passengersCollection) {
            console.warn('⚠️ Collections not initialized. Skipping index creation.');
            return false;
        }

        // ============= PASSENGERS COLLECTION INDEXES =============

        console.log('📋 Creating Passengers collection indexes...');

        await passengersCollection.createIndex({ PNR_Number: 1 }, {
            name: 'idx_pnr_number',
            unique: true
        });
        console.log('   ✅ PNR_Number index created');

        await passengersCollection.createIndex({ PNR_Status: 1 }, {
            name: 'idx_pnr_status'
        });
        console.log('   ✅ PNR_Status index created');

        await passengersCollection.createIndex({ Online_Status: 1 }, {
            name: 'idx_online_status'
        });
        console.log('   ✅ Online_Status index created');

        await passengersCollection.createIndex(
            { PNR_Status: 1, Online_Status: 1, Boarded: 1 },
            { name: 'idx_reallocation_filter' }
        );
        console.log('   ✅ Reallocation filter compound index created');

        await passengersCollection.createIndex({ Train_Number: 1 }, {
            name: 'idx_train_number'
        });
        console.log('   ✅ Train_Number index created');

        await passengersCollection.createIndex({ Coach_Number: 1 }, {
            name: 'idx_coach_number'
        });
        console.log('   ✅ Coach_Number index created');

        await passengersCollection.createIndex(
            { From_Station: 1, To_Station: 1 },
            { name: 'idx_journey' }
        );
        console.log('   ✅ Journey (From-To) compound index created');

        await passengersCollection.createIndex({ Boarded: 1 }, {
            name: 'idx_boarded'
        });
        console.log('   ✅ Boarded status index created');

        await passengersCollection.createIndex({ NO_show: 1 }, {
            name: 'idx_no_show'
        });
        console.log('   ✅ NO_show index created');

        await passengersCollection.createIndex(
            { createdAt: 1 },
            { name: 'idx_created_at', expireAfterSeconds: 86400 }
        );
        console.log('   ✅ TTL (createdAt) index created');

        // ============= BERTHS COLLECTION INDEXES =============

        if (berthsCollection) {
            console.log('\n🔍 Creating Berths collection indexes...');

            await berthsCollection.createIndex(
                { coach: 1, berthNo: 1 },
                { name: 'idx_coach_berth', unique: true }
            );
            console.log('   ✅ Coach-Berth compound index created');

            await berthsCollection.createIndex({ type: 1 }, {
                name: 'idx_berth_type'
            });
            console.log('   ✅ Berth Type index created');

            await berthsCollection.createIndex({ class: 1 }, {
                name: 'idx_berth_class'
            });
            console.log('   ✅ Class index created');

            await berthsCollection.createIndex({ status: 1 }, {
                name: 'idx_berth_status'
            });
            console.log('   ✅ Status index created');
        }

        // ============= TRAIN COLLECTION INDEXES =============

        if (trainCollection) {
            console.log('\n🔍 Creating Train collection indexes...');

            await trainCollection.createIndex({ trainNo: 1 }, {
                name: 'idx_train_train_no',
                unique: true
            });
            console.log('   ✅ Train Number index created');

            await trainCollection.createIndex({ currentStationIdx: 1 }, {
                name: 'idx_current_station'
            });
            console.log('   ✅ Current Station index created');

            await trainCollection.createIndex({ journeyStarted: 1 }, {
                name: 'idx_journey_started'
            });
            console.log('   ✅ Journey Status index created');
        }

        console.log('\n✅ All indexes created successfully!\n');
        console.log('📊 Index Summary:');
        console.log('   Passengers Collection: 10 indexes');
        console.log('   Berths Collection: 4 indexes');
        console.log('   Train Collection: 3 indexes');
        console.log('   Total: 17 indexes\n');

        return true;
    } catch (error: any) {
        console.error('❌ Error creating indexes:', error.message);
        if (process.env.NODE_ENV !== 'development') {
            throw error;
        }
        return false;
    }
}

/**
 * Drop all indexes (utility for development)
 */
async function dropAllIndexes(): Promise<boolean> {
    try {
        console.log('\n⚠️  Dropping all indexes...\n');

        const passengersCollection: Collection = db.getPassengersCollection();
        const berthsCollection: Collection = db.getBeerthsCollection?.();
        const trainCollection: Collection = db.getTrainCollection?.();

        if (passengersCollection) {
            await passengersCollection.dropIndexes();
            console.log('   ✅ Passengers collection indexes dropped');
        }

        if (berthsCollection) {
            await berthsCollection.dropIndexes();
            console.log('   ✅ Berths collection indexes dropped');
        }

        if (trainCollection) {
            await trainCollection.dropIndexes();
            console.log('   ✅ Train collection indexes dropped');
        }

        console.log('\n✅ All indexes dropped\n');
        return true;
    } catch (error: any) {
        console.error('❌ Error dropping indexes:', error.message);
        return false;
    }
}

/**
 * Rebuild all indexes
 */
async function rebuildIndexes(): Promise<boolean> {
    try {
        console.log('\n🔄 Rebuilding indexes...\n');
        await dropAllIndexes();
        await createAllIndexes();
        console.log('✅ Indexes rebuilt successfully!\n');
        return true;
    } catch (error: any) {
        console.error('❌ Error rebuilding indexes:', error.message);
        return false;
    }
}

/**
 * Get index statistics
 */
async function getIndexStats(): Promise<IndexStats[] | null> {
    try {
        const passengersCollection: Collection = db.getPassengersCollection();

        const stats = await passengersCollection.aggregate([
            { $indexStats: {} }
        ]).toArray();

        return stats as IndexStats[];
    } catch (error: any) {
        console.error('Error getting index stats:', error.message);
        return null;
    }
}

module.exports = {
    createAllIndexes,
    dropAllIndexes,
    rebuildIndexes,
    getIndexStats
};

export { createAllIndexes, dropAllIndexes, rebuildIndexes, getIndexStats };
