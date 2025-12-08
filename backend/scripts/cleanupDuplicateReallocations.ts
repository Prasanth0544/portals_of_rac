/**
 * cleanupDuplicateReallocations.ts
 * Script to clean up duplicate pending reallocations
 * Run with: npx ts-node scripts/cleanupDuplicateReallocations.ts
 */

import { MongoClient, ObjectId, Collection, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

interface DuplicateResult {
    _id: string;
    count: number;
    ids: ObjectId[];
    firstId: ObjectId;
}

async function cleanupDuplicates(): Promise<void> {
    const uri: string = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db: Db = client.db('rac');
        const collection: Collection = db.collection('station_reallocations');

        // Find duplicates (same PNR with pending status)
        const duplicates = await collection.aggregate<DuplicateResult>([
            { $match: { status: 'pending' } },
            {
                $group: {
                    _id: '$passengerPNR',
                    count: { $sum: 1 },
                    ids: { $push: '$_id' },
                    firstId: { $first: '$_id' }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]).toArray();

        console.log(`Found ${duplicates.length} PNRs with duplicate entries`);

        if (duplicates.length === 0) {
            console.log('✅ No duplicates found!');
            return;
        }

        // For each duplicate, keep the first one and delete the rest
        let totalDeleted = 0;
        for (const dup of duplicates) {
            const idsToDelete = dup.ids.filter(id => !id.equals(dup.firstId));
            const result = await collection.deleteMany({ _id: { $in: idsToDelete } });
            totalDeleted += result.deletedCount;
            console.log(`   Deleted ${result.deletedCount} duplicates for PNR ${dup._id}`);
        }

        console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} duplicate entries.`);

    } catch (error: any) {
        console.error('Error:', error.message);
    } finally {
        await client.close();
    }
}

cleanupDuplicates();
