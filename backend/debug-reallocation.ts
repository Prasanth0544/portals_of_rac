/**
 * debug-reallocation.ts
 * Debug script to check reallocation data
 */

import { Collection, Document } from 'mongodb';

const db = require('./config/db');

interface PassengerDocument {
    Name: string;
    PNR_Number: string;
    From_Station: string;
    To_Station: string;
    Coach_No: string;
    Seat_No: string;
    PNR_status: string;
    Passenger_Status?: string;
    RAC_Status?: string;
    NO_show?: boolean;
    Boarded?: boolean;
}

async function debugReallocation(): Promise<void> {
    try {
        await db.connect();
        const collection: Collection<PassengerDocument> = db.getPassengersCollection();

        console.log('\n========== REALLOCATION DEBUG ==========\n');

        // 1. Check no-show passengers
        const noShows = await collection.find({ NO_show: true }).toArray();
        console.log(`📋 NO-SHOW PASSENGERS: ${noShows.length}`);
        noShows.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.Name} (${p.PNR_Number})`);
            console.log(`      From: ${p.From_Station} To: ${p.To_Station}`);
            console.log(`      Berth: ${p.Coach_No}-${p.Seat_No}`);
            console.log(`      Status: ${p.PNR_status}`);
        });

        // 2. Check boarded RAC passengers  
        const racBoarded = await collection.find({
            PNR_status: 'RAC',
            Boarded: true
        }).toArray();
        console.log(`\n👥 BOARDED RAC PASSENGERS: ${racBoarded.length}`);
        racBoarded.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.Name} (${p.PNR_Number})`);
            console.log(`      From: ${p.From_Station} To: ${p.To_Station}`);
            console.log(`      Seat: ${p.Coach_No}-${p.Seat_No}`);
            console.log(`      Status: ${p.Passenger_Status || 'Offline'}`);
            console.log(`      RAC: ${p.RAC_Status}`);
        });

        // 3. Check online RAC passengers
        const racOnline = await collection.find({
            PNR_status: 'RAC',
            Boarded: true,
            Passenger_Status: 'online'
        }).toArray();
        console.log(`\n✅ ONLINE + BOARDED RAC: ${racOnline.length}`);
        racOnline.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.Name} (${p.PNR_Number}) - ${p.From_Station}→${p.To_Station}`);
        });

        console.log('\n========================================\n');

        if (noShows.length === 0) {
            console.log('⚠️  NO NO-SHOW PASSENGERS FOUND!');
            console.log('   → Mark a passenger as no-show first\n');
        }

        if (racOnline.length === 0) {
            console.log('⚠️  NO ONLINE+BOARDED RAC PASSENGERS!');
            console.log('   → RAC passengers must be both BOARDED and ONLINE\n');
        }

        process.exit(0);
    } catch (error: any) {
        console.error('Error:', error);
        process.exit(1);
    }
}

debugReallocation();
