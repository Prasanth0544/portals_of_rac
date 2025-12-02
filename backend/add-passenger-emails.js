// backend/add-passenger-emails.js
// Add email addresses to passengers for testing notifications

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function addEmailsToPassengers() {
    try {
        console.log('📧 Adding email addresses to passengers...\n');

        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get Passengers collection
        const db = mongoose.connection.db;
        const passengersCollection = db.collection('Passengers');

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
        const testEmail = 'prasanthgannavarapu5@gmail.com'; // Your email for testing

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

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addEmailsToPassengers();
