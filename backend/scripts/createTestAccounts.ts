/**
 * createTestAccounts.ts
 * Run this script ONCE to create test accounts in MongoDB
 */

import bcrypt from 'bcrypt';
import { MongoClient, Db, Collection, InsertOneResult } from 'mongodb';

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

interface PassengerAccount {
    IRCTC_ID: string;
    email: string;
    passwordHash: string;
    name: string;
    phone: string;
    active: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    createdAt: Date;
    lastLogin: Date | null;
}

async function createTestAccounts(): Promise<void> {
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db: Db = client.db(DB_NAME);

        // Hash passwords
        const adminPasswordHash = await bcrypt.hash('Prasanth@123', 12);
        const ttePasswordHash = await bcrypt.hash('Prasanth@123', 12);
        const passengerPasswordHash = await bcrypt.hash('Prasanth@123', 12);

        // 1. Create tte_users collection and insert Admin + TTE accounts
        const tteUsersCollection: Collection<TTEUser> = db.collection('tte_users');

        // Check if already exists
        const existingAdmin = await tteUsersCollection.findOne({ employeeId: 'ADMIN_01' });
        if (existingAdmin) {
            console.log('⚠️  ADMIN_01 already exists, skipping...');
        } else {
            await tteUsersCollection.insertOne({
                employeeId: 'ADMIN_01',
                passwordHash: adminPasswordHash,
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
            console.log('✅ Created ADMIN_01 account');
        }

        const existingTTE = await tteUsersCollection.findOne({ employeeId: 'TTE_01' });
        if (existingTTE) {
            console.log('⚠️  TTE_01 already exists, skipping...');
        } else {
            await tteUsersCollection.insertOne({
                employeeId: 'TTE_01',
                passwordHash: ttePasswordHash,
                email: 'tte@railway.com',
                name: 'TTE Staff',
                role: 'TTE',
                active: true,
                trainAssigned: 17225,
                phone: '9876543210',
                permissions: ['MARK_BOARDING', 'MARK_NO_SHOW', 'VIEW_PASSENGERS'],
                createdAt: new Date(),
                lastLogin: null
            });
            console.log('✅ Created TTE_01 account');
        }

        // 2. Create passenger_accounts collection and insert test passenger
        const passengerAccountsCollection: Collection<PassengerAccount> = db.collection('passenger_accounts');

        const existingPassenger = await passengerAccountsCollection.findOne({ IRCTC_ID: 'IR_0001' });
        if (existingPassenger) {
            console.log('⚠️  IR_0001 already exists, skipping...');
        } else {
            await passengerAccountsCollection.insertOne({
                IRCTC_ID: 'IR_0001',
                email: 'prasanthgannavarapu12@gmail.com',
                passwordHash: passengerPasswordHash,
                name: 'Prasanth Gannavarapu',
                phone: '9515796516',
                active: true,
                emailVerified: true,
                phoneVerified: false,
                createdAt: new Date(),
                lastLogin: null
            });
            console.log('✅ Created IR_0001 passenger account');
        }

        console.log('\n🎉 All test accounts created successfully!');
        console.log('\n📋 Test Credentials:');
        console.log('   Admin: ADMIN_01 / Prasanth@123');
        console.log('   TTE: TTE_01 / Prasanth@123');
        console.log('   Passenger: IR_0001 / Prasanth@123');
        console.log('   Passenger Email: prasanthgannavarapu12@gmail.com / Prasanth@123');

    } catch (error: any) {
        console.error('❌ Error creating test accounts:', error);
    } finally {
        await client.close();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

// Run the script
createTestAccounts();
