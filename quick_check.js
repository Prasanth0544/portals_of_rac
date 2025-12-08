/**
 * RAC Reallocation System - Quick API Data Check
 * Queries the running backend API to verify data integrity
 * 
 * Run with: node quick_check.js
 * Make sure the backend server is running on port 5000
 */

const API_BASE = 'http://localhost:5000/api';

async function checkData() {
    try {
        console.log('\n' + '═'.repeat(60));
        console.log('🔍 RAC SYSTEM - DATA CHECK (via API)');
        console.log('═'.repeat(60) + '\n');

        // ═══════════════════════════════════════════════════════════
        // 1. CHECK SERVER HEALTH
        // ═══════════════════════════════════════════════════════════
        console.log('🏥 SERVER HEALTH CHECK');
        console.log('─'.repeat(40));

        const healthRes = await fetch(`${API_BASE}/health`);
        const healthData = await healthRes.json();
        console.log(`   Status: ${healthData.status || 'OK'}`);
        console.log(`   Server: ${healthRes.ok ? '✅ Running' : '❌ Not responding'}\n`);

        // ═══════════════════════════════════════════════════════════
        // 2. GET TRAIN STATE
        // ═══════════════════════════════════════════════════════════
        console.log('🚂 TRAIN STATE');
        console.log('─'.repeat(40));

        const stateRes = await fetch(`${API_BASE}/train/state`);
        const stateData = await stateRes.json();

        if (stateData.success && stateData.data) {
            const train = stateData.data;
            console.log(`   Train Number:     ${train.trainNo || 'N/A'}`);
            console.log(`   Train Name:       ${train.trainName || 'N/A'}`);
            console.log(`   Journey Date:     ${train.journeyDate || 'N/A'}`);
            console.log(`   Status:           ${train.journeyStatus || 'N/A'}`);
            console.log(`   Current Station:  ${train.stations?.[train.currentStationIdx]?.name || 'N/A'} (Index: ${train.currentStationIdx})`);
            console.log(`   Total Stations:   ${train.stations?.length || 0}`);
        } else {
            console.log('   ⚠️  Train not initialized');
        }

        // ═══════════════════════════════════════════════════════════
        // 3. PASSENGER COUNTS BY STATUS
        // ═══════════════════════════════════════════════════════════
        console.log('\n📊 PASSENGER COUNTS BY STATUS');
        console.log('─'.repeat(40));

        const countsRes = await fetch(`${API_BASE}/passengers/counts`);
        const countsData = await countsRes.json();

        if (countsData.success && countsData.data) {
            const counts = countsData.data;
            console.log(`   Total Passengers:     ${counts.total || 0}`);
            console.log(`   Confirmed (CNF):      ${counts.cnf || 0}`);
            console.log(`   RAC:                  ${counts.rac || 0}`);
            console.log(`   Waiting List (WL):    ${counts.wl || 0}`);
            console.log(`   Boarded:              ${counts.boarded || 0}`);
            console.log(`   No-Show:              ${counts.noShow || 0}`);
        } else {
            console.log('   ⚠️  Could not fetch passenger counts');
        }

        // ═══════════════════════════════════════════════════════════
        // 4. RAC QUEUE DETAILS
        // ═══════════════════════════════════════════════════════════
        console.log('\n🎫 RAC QUEUE DETAILS');
        console.log('─'.repeat(40));

        const racRes = await fetch(`${API_BASE}/train/rac-queue`);
        const racData = await racRes.json();

        if (racData.success && racData.data?.queue) {
            const queue = racData.data.queue;
            const boarded = queue.filter(r => r.boarded).length;
            const online = queue.filter(r => r.passengerStatus === 'Online').length;

            console.log(`   Total RAC:            ${queue.length}`);
            console.log(`   Boarded RAC:          ${boarded}`);
            console.log(`   Online RAC:           ${online}`);

            // Show first RAC passenger
            if (queue.length > 0) {
                const sample = queue[0];
                console.log('\n   � First RAC Passenger:');
                console.log(`      Name:     ${sample.name}`);
                console.log(`      PNR:      ${sample.pnr}`);
                console.log(`      RAC:      ${sample.racStatus}`);
                console.log(`      Route:    ${sample.from} → ${sample.to}`);
                console.log(`      Boarded:  ${sample.boarded}`);
                console.log(`      Status:   ${sample.passengerStatus || 'Unknown'}`);
            }
        } else {
            console.log('   ⚠️  No RAC queue data available');
        }

        // ═══════════════════════════════════════════════════════════
        // 5. VACANT BERTHS
        // ═══════════════════════════════════════════════════════════
        console.log('\n�️  VACANT BERTHS');
        console.log('─'.repeat(40));

        const vacantRes = await fetch(`${API_BASE}/train/vacant-berths`);
        const vacantData = await vacantRes.json();

        if (vacantData.success && vacantData.data?.vacancies) {
            const vacancies = vacantData.data.vacancies;
            console.log(`   Total Vacant:         ${vacancies.length}`);

            // Group by type
            const byType = {};
            vacancies.forEach(v => {
                const type = v.type || v.berthType || 'Unknown';
                byType[type] = (byType[type] || 0) + 1;
            });

            if (Object.keys(byType).length > 0) {
                console.log('\n   By Berth Type:');
                Object.entries(byType).forEach(([type, count]) => {
                    console.log(`      ${type}: ${count}`);
                });
            }

            // Show first vacant berth
            if (vacancies.length > 0) {
                const sample = vacancies[0];
                console.log('\n   📋 First Vacant Berth:');
                console.log(`      Berth:      ${sample.fullBerthNo || `${sample.coachNo}-${sample.berthNo}`}`);
                console.log(`      Type:       ${sample.type || sample.berthType}`);
                console.log(`      Vacant:     ${sample.vacantFrom || 'N/A'} → ${sample.vacantTo || 'N/A'}`);
            }
        } else {
            console.log('   ⚠️  No vacant berths or journey not started');
        }

        // ═══════════════════════════════════════════════════════════
        // 6. ELIGIBILITY MATRIX
        // ═══════════════════════════════════════════════════════════
        console.log('\n🎯 ELIGIBILITY MATRIX');
        console.log('─'.repeat(40));

        const eligibilityRes = await fetch(`${API_BASE}/reallocation/eligibility`);
        const eligibilityData = await eligibilityRes.json();

        if (eligibilityData.success) {
            const matrix = eligibilityData.data?.eligibilityMatrix || [];
            console.log(`   Eligible Matches:     ${matrix.length}`);

            if (matrix.length > 0) {
                const sample = matrix[0];
                console.log('\n   📋 Top Eligible Match:');
                console.log(`      Passenger:  ${sample.passenger?.name || sample.name}`);
                console.log(`      PNR:        ${sample.passenger?.pnr || sample.pnr}`);
                console.log(`      Offered:    ${sample.berth?.fullBerthNo || sample.offeredBerth}`);
                console.log(`      Score:      ${sample.score || 'N/A'}`);
            }
        } else {
            console.log(`   ⚠️  ${eligibilityData.message || 'Could not fetch eligibility data'}`);
        }

        // ═══════════════════════════════════════════════════════════
        // 7. TRAIN STATS
        // ═══════════════════════════════════════════════════════════
        console.log('\n� TRAIN STATS');
        console.log('─'.repeat(40));

        const statsRes = await fetch(`${API_BASE}/train/stats`);
        const statsData = await statsRes.json();

        if (statsData.success && statsData.data) {
            const stats = statsData.data;
            console.log(`   CNF Passengers:       ${stats.cnfPassengers || 0}`);
            console.log(`   RAC Passengers:       ${stats.racPassengers || 0}`);
            console.log(`   Boarded:              ${stats.boardedPassengers || 0}`);
            console.log(`   No-Shows:             ${stats.noShowCount || 0}`);
            console.log(`   Upgrades Done:        ${stats.upgradesCompleted || 0}`);
        } else {
            console.log('   ⚠️  Could not fetch train stats');
        }

        // ═══════════════════════════════════════════════════════════
        // SUMMARY
        // ═══════════════════════════════════════════════════════════
        console.log('\n' + '═'.repeat(60));
        console.log('✅ DATA CHECK COMPLETE');
        console.log('═'.repeat(60) + '\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('   Make sure the backend server is running on port 5000');
        process.exit(1);
    }
}

checkData();
