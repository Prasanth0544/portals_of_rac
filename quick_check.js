/**
 * RAC Reallocation System - Quick MongoDB Data Check
 * Directly queries MongoDB to verify data integrity
 * 
 * Run with: node quick_check.js
 * Make sure MongoDB is running
 */

const db = require('./backend/config/db');

async function checkData() {
    try {
        console.log('\n' + '═'.repeat(60));
        console.log('🔍 RAC SYSTEM - MONGODB DATA CHECK');
        console.log('═'.repeat(60) + '\n');

        await db.connect();
        console.log('✅ Connected to MongoDB\n');

        const collection = db.getPassengersCollection();

        // ═══════════════════════════════════════════════════════════
        // 1. PASSENGER COUNTS BY STATUS
        // ═══════════════════════════════════════════════════════════
        console.log('📊 PASSENGER COUNTS BY STATUS');
        console.log('─'.repeat(40));

        const totalPassengers = await collection.countDocuments();
        const cnfCount = await collection.countDocuments({ PNR_Status: "CNF" });
        const racCount = await collection.countDocuments({ PNR_Status: "RAC" });
        const wlCount = await collection.countDocuments({ PNR_Status: "WL" });

        console.log(`   Total Passengers:     ${totalPassengers}`);
        console.log(`   Confirmed (CNF):      ${cnfCount}`);
        console.log(`   RAC:                  ${racCount}`);
        console.log(`   Waiting List (WL):    ${wlCount}`);

        // ═══════════════════════════════════════════════════════════
        // 2. RAC PASSENGER DETAILS
        // ═══════════════════════════════════════════════════════════
        console.log('\n🎫 RAC PASSENGER DETAILS');
        console.log('─'.repeat(40));

        const onlineRAC = await collection.countDocuments({
            PNR_Status: "RAC",
            Passenger_Status: "Online"
        });
        const offlineRAC = await collection.countDocuments({
            PNR_Status: "RAC",
            Passenger_Status: { $in: ["Offline", null, ""] }
        });
        const boardedRAC = await collection.countDocuments({
            PNR_Status: "RAC",
            Boarded: true
        });
        const noShowRAC = await collection.countDocuments({
            PNR_Status: "RAC",
            NO_show: true
        });

        console.log(`   Online RAC:           ${onlineRAC}`);
        console.log(`   Offline RAC:          ${offlineRAC}`);
        console.log(`   Boarded RAC:          ${boardedRAC}`);
        console.log(`   No-Show RAC:          ${noShowRAC}`);

        // ═══════════════════════════════════════════════════════════
        // 3. CONFIRMED PASSENGER DETAILS
        // ═══════════════════════════════════════════════════════════
        console.log('\n✅ CONFIRMED PASSENGER DETAILS');
        console.log('─'.repeat(40));

        const boardedCNF = await collection.countDocuments({
            PNR_Status: "CNF",
            Boarded: true
        });
        const noShowCNF = await collection.countDocuments({
            PNR_Status: "CNF",
            NO_show: true
        });
        const upgradedFromRAC = await collection.countDocuments({
            Upgraded_From: "RAC"
        });

        console.log(`   Boarded CNF:          ${boardedCNF}`);
        console.log(`   No-Show CNF:          ${noShowCNF}`);
        console.log(`   Upgraded from RAC:    ${upgradedFromRAC}`);

        // ═══════════════════════════════════════════════════════════
        // 4. STATION-WISE DISTRIBUTION
        // ═══════════════════════════════════════════════════════════
        console.log('\n🚉 TOP BOARDING STATIONS');
        console.log('─'.repeat(40));

        const stationCounts = await collection.aggregate([
            { $group: { _id: "$Boarding_Station", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]).toArray();

        stationCounts.forEach((s, i) => {
            console.log(`   ${i + 1}. ${s._id}: ${s.count} passengers`);
        });

        // ═══════════════════════════════════════════════════════════
        // 5. BERTH TYPE DISTRIBUTION
        // ═══════════════════════════════════════════════════════════
        console.log('\n🛏️  BERTH TYPE DISTRIBUTION');
        console.log('─'.repeat(40));

        const berthCounts = await collection.aggregate([
            { $group: { _id: "$Berth_Type", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();

        berthCounts.forEach(b => {
            console.log(`   ${b._id || 'Unknown'}: ${b.count}`);
        });

        // ═══════════════════════════════════════════════════════════
        // 6. SAMPLE PASSENGERS
        // ═══════════════════════════════════════════════════════════
        console.log('\n📋 SAMPLE RAC PASSENGER');
        console.log('─'.repeat(40));

        const sampleRAC = await collection.findOne({ PNR_Status: "RAC" });
        if (sampleRAC) {
            console.log(`   IRCTC ID:       ${sampleRAC.IRCTC_ID || 'N/A'}`);
            console.log(`   PNR:            ${sampleRAC.PNR_Number}`);
            console.log(`   Name:           ${sampleRAC.Name}`);
            console.log(`   Age:            ${sampleRAC.Age}`);
            console.log(`   Gender:         ${sampleRAC.Gender}`);
            console.log(`   Mobile:         ${sampleRAC.Mobile || 'N/A'}`);
            console.log(`   Email:          ${sampleRAC.Email || 'N/A'}`);
            console.log(`   Train:          ${sampleRAC.Train_Number} - ${sampleRAC.Train_Name || ''}`);
            console.log(`   Date:           ${sampleRAC.Journey_Date}`);
            console.log(`   Class:          ${sampleRAC.Class}`);
            console.log(`   PNR Status:     ${sampleRAC.PNR_Status}`);
            console.log(`   RAC Status:     ${sampleRAC.Rac_status}`);
            console.log(`   Boarding:       ${sampleRAC.Boarding_Station}`);
            console.log(`   Deboarding:     ${sampleRAC.Deboarding_Station}`);
            console.log(`   Coach:          ${sampleRAC.Assigned_Coach}`);
            console.log(`   Berth:          ${sampleRAC.Assigned_berth}`);
            console.log(`   Berth Type:     ${sampleRAC.Berth_Type}`);
            console.log(`   Passenger Stat: ${sampleRAC.Passenger_Status || 'Unknown'}`);
            console.log(`   Boarded:        ${sampleRAC.Boarded || false}`);
            console.log(`   No-Show:        ${sampleRAC.NO_show || false}`);
        } else {
            console.log('   ⚠️  No RAC passengers found');
        }

        console.log('\n📋 SAMPLE CNF PASSENGER');
        console.log('─'.repeat(40));

        const sampleCNF = await collection.findOne({ PNR_Status: "CNF" });
        if (sampleCNF) {
            console.log(`   IRCTC ID:       ${sampleCNF.IRCTC_ID || 'N/A'}`);
            console.log(`   PNR:            ${sampleCNF.PNR_Number}`);
            console.log(`   Name:           ${sampleCNF.Name}`);
            console.log(`   Coach-Berth:    ${sampleCNF.Assigned_Coach}-${sampleCNF.Assigned_berth}`);
            console.log(`   Status:         ${sampleCNF.PNR_Status}`);
            console.log(`   Boarded:        ${sampleCNF.Boarded || false}`);
            console.log(`   No-Show:        ${sampleCNF.NO_show || false}`);
            if (sampleCNF.Upgraded_From) {
                console.log(`   Upgraded From:  ${sampleCNF.Upgraded_From}`);
            }
        } else {
            console.log('   ⚠️  No CNF passengers found');
        }

        // ═══════════════════════════════════════════════════════════
        // 7. DATA QUALITY CHECK
        // ═══════════════════════════════════════════════════════════
        console.log('\n🔍 DATA QUALITY CHECK');
        console.log('─'.repeat(40));

        const missingIRCTC = await collection.countDocuments({
            $or: [
                { IRCTC_ID: { $exists: false } },
                { IRCTC_ID: null },
                { IRCTC_ID: "" }
            ]
        });
        const missingEmail = await collection.countDocuments({
            $or: [
                { Email: { $exists: false } },
                { Email: null },
                { Email: "" }
            ]
        });
        const missingMobile = await collection.countDocuments({
            $or: [
                { Mobile: { $exists: false } },
                { Mobile: null },
                { Mobile: "" }
            ]
        });

        console.log(`   Missing IRCTC_ID:     ${missingIRCTC}`);
        console.log(`   Missing Email:        ${missingEmail}`);
        console.log(`   Missing Mobile:       ${missingMobile}`);

        // ═══════════════════════════════════════════════════════════
        // SUMMARY
        // ═══════════════════════════════════════════════════════════
        console.log('\n' + '═'.repeat(60));
        console.log('✅ DATA CHECK COMPLETE');
        console.log('═'.repeat(60) + '\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

checkData();
