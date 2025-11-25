// backend/scripts/resetAdmin.js
// Delete and recreate ADMIN_01 account with correct password

const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'rac';

async function resetAdmin() {
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db(DB_NAME);
        const tteUsersCollection = db.collection('tte_users');

        // Delete existing ADMIN_01
        const deleteResult = await tteUsersCollection.deleteOne({ employeeId: 'ADMIN_01' });
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

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

resetAdmin();
