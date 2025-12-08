/**
 * add-passenger-emails.ts
 * Add email addresses to passengers for testing notifications
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI: string = process.env.MONGODB_URI || 'mongodb://localhost:27017';

interface PassengerDocument {
    Name?: string;
    PNR?: string;
    email?: string;
}

async function addEmailsToPassengers(): Promise<void> {
    try {
        console.log('📧 Adding email addresses to passengers...\n');

        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get Passengers collection
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('Database connection not established');
        }

        const passengersCollection = db.collection<PassengerDocument>('Passengers');

        // Check current passengers without emails
        const passengersWithoutEmail = await passengersCollection.find({
            $or: [
                { email: { $exists: false } },
                { email: null },
                { email: '' }
            ]
        }).toArray();

        console.log(`Found ${passengersWithoutEmail.length} passengers without email\n`);

        if (passengersWithoutEmail.length === 0) {
            console.log('✅ All passengers already have emails!');
            await mongoose.disconnect();
            return;
        }

        // Add test email to all passengers
        const testEmail = 'prasanthgannavarapu5@gmail.com';

        console.log(`Adding "${testEmail}" to all passengers...\n`);

        const updateResult = await passengersCollection.updateMany(
            {
                $or: [
                    { email: { $exists: false } },
                    { email: null },
                    { email: '' }
                ]
            },
            {
                $set: { email: testEmail }
            }
        );

        console.log(`✅ Updated ${updateResult.modifiedCount} passengers\n`);

        // Show first 5 passengers to verify
        const updatedPassengers = await passengersCollection.find({}).limit(5).toArray();
        console.log('Sample passengers:');
        updatedPassengers.forEach(p => {
            console.log(`  - ${p.Name} (${p.PNR}): ${p.email || '❌ NO EMAIL'}`);
        });

        console.log('\n✅ Done! Passengers now have email addresses.');
        console.log('🎯 Now emails will be sent when marking no-show!');

        await mongoose.disconnect();
        process.exit(0);

    } catch (error: any) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addEmailsToPassengers();
