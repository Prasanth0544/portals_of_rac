/**
 * resetAdmin.ts
 * Delete and recreate ADMIN_01 account with correct password
 */

import bcrypt from 'bcrypt';
import { MongoClient, Db, Collection, DeleteResult } from 'mongodb';

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'rac';

interface TTEUser {
    employeeId: string;
    passwordHash: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'TTE';
    active: boolean;
    trainAssigned: number | null;
    phone: string;
    permissions: string[];
    createdAt: Date;
    lastLogin: Date | null;
}

async function resetAdmin(): Promise<void> {
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db: Db = client.db(DB_NAME);
        const tteUsersCollection: Collection<TTEUser> = db.collection('tte_users');

        // Delete existing ADMIN_01
        const deleteResult: DeleteResult = await tteUsersCollection.deleteOne({ employeeId: 'ADMIN_01' });
        console.log(`🗑️  Deleted ${deleteResult.deletedCount} ADMIN_01 account(s)`);

        // Create new ADMIN_01 with correct password
        const passwordHash = await bcrypt.hash('Prasanth@123', 12);

        await tteUsersCollection.insertOne({
            employeeId: 'ADMIN_01',
            passwordHash: passwordHash,
            email: 'prasanth@gmail.com',
            name: 'Prasanth Gannavarapu',
            role: 'ADMIN',
            active: true,
            trainAssigned: null,
            phone: '9392629863',
            permissions: ['ALL'],
            createdAt: new Date(),
            lastLogin: null
        });

        console.log('✅ Created new ADMIN_01 account');
        console.log('\n📋 Login with:');
        console.log('   Employee ID: ADMIN_01');
        console.log('   Password: Prasanth@123');

    } catch (error: any) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

resetAdmin();
