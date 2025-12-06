/**
 * RAC Reallocation System - Eligibility Matrix Test
 * Tests the eligibility rules for RAC-to-CNF upgrades
 * 
 * Run with: node test_eligibility.js
 * Make sure the backend server is running on port 5000
 */

const API_BASE = 'http://localhost:5000/api';

async function testEligibility() {
    console.log('\n' + '═'.repeat(60));
    console.log('🎯 RAC ELIGIBILITY MATRIX TEST');
    console.log('═'.repeat(60) + '\n');

    try {
        // ═══════════════════════════════════════════════════════════
        // 1. CHECK TRAIN STATE
        // ═══════════════════════════════════════════════════════════
        console.log('1️⃣  Getting train state...\n');

        const stateRes = await fetch(`${API_BASE}/train/state`);
        const stateData = await stateRes.json();

        if (!stateData.success) {
            console.log('❌ Train not initialized. Please initialize first.');
            return;
        }

        const { currentStationIdx, stations, racQueue } = stateData.data;
        const currentStation = stations[currentStationIdx];

        console.log(`   📍 Current Station: ${currentStation?.name} (Index: ${currentStationIdx})`);
        console.log(`   🚂 Total Stations: ${stations.length}`);
        console.log(`   🎫 RAC Queue Size: ${racQueue?.length || 0}\n`);

        // ═══════════════════════════════════════════════════════════
        // 2. GET RAC QUEUE DETAILS
        // ═══════════════════════════════════════════════════════════
        console.log('2️⃣  Analyzing RAC Queue...\n');

        const racRes = await fetch(`${API_BASE}/train/rac-queue`);
        const racData = await racRes.json();

        if (racData.success && racData.data?.queue?.length > 0) {
            const queue = racData.data.queue;

            // Count by status
            const boarded = queue.filter(r => r.boarded).length;
            const online = queue.filter(r => r.passengerStatus === 'Online').length;
            const eligible = queue.filter(r =>
                r.boarded &&
                r.passengerStatus === 'Online' &&
                r.fromIdx <= currentStationIdx &&
                r.toIdx > currentStationIdx
            ).length;

            console.log(`   👥 Total RAC: ${queue.length}`);
            console.log(`   ✅ Boarded: ${boarded}`);
            console.log(`   🌐 Online: ${online}`);
            console.log(`   🎯 Potentially Eligible: ${eligible}\n`);

            // Show first 5 RAC passengers
            console.log('   📋 Sample RAC Passengers:');
            console.log('   ' + '─'.repeat(50));

            queue.slice(0, 5).forEach((r, i) => {
                const eligibilityStatus = [];
                if (!r.boarded) eligibilityStatus.push('NOT_BOARDED');
                if (r.passengerStatus !== 'Online') eligibilityStatus.push('OFFLINE');
                if (r.fromIdx > currentStationIdx) eligibilityStatus.push('NOT_YET_BOARDED');
                if (r.toIdx <= currentStationIdx) eligibilityStatus.push('ALREADY_DEBOARDED');

                const status = eligibilityStatus.length === 0 ? '✅ ELIGIBLE' : `❌ ${eligibilityStatus.join(', ')}`;

                console.log(`   ${i + 1}. ${r.name} (${r.pnr})`);
                console.log(`      RAC: ${r.racStatus} | ${r.from} → ${r.to}`);
                console.log(`      Boarded: ${r.boarded} | Status: ${r.passengerStatus || 'Unknown'}`);
                console.log(`      ${status}`);
                console.log('');
            });
        } else {
            console.log('   ⚠️  No RAC passengers in queue\n');
        }

        // ═══════════════════════════════════════════════════════════
        // 3. GET VACANT BERTHS
        // ═══════════════════════════════════════════════════════════
        console.log('3️⃣  Getting vacant berths...\n');

        const vacantRes = await fetch(`${API_BASE}/train/vacant-berths`);
        const vacantData = await vacantRes.json();

        if (vacantData.success && vacantData.data?.vacancies?.length > 0) {
            const vacancies = vacantData.data.vacancies;

            console.log(`   🛏️  Total Vacant Berths: ${vacancies.length}\n`);

            // Group by coach
            const byCoach = {};
            vacancies.forEach(v => {
                const coach = v.coachNo || v.coach || 'Unknown';
                byCoach[coach] = (byCoach[coach] || 0) + 1;
            });

            console.log('   By Coach:');
            Object.entries(byCoach).forEach(([coach, count]) => {
                console.log(`      ${coach}: ${count} vacant`);
            });

            // Show first 5 vacant berths
            console.log('\n   📋 Sample Vacant Berths:');
            console.log('   ' + '─'.repeat(50));

            vacancies.slice(0, 5).forEach((v, i) => {
                console.log(`   ${i + 1}. ${v.fullBerthNo || `${v.coachNo}-${v.berthNo}`} (${v.type})`);
                console.log(`      Vacant from: ${v.vacantFrom || 'N/A'} to ${v.vacantTo || 'N/A'}`);
                console.log('');
            });
        } else {
            console.log('   ⚠️  No vacant berths available\n');
        }

        // ═══════════════════════════════════════════════════════════
        // 4. GET ELIGIBILITY MATRIX
        // ═══════════════════════════════════════════════════════════
        console.log('4️⃣  Getting eligibility matrix...\n');

        const eligibilityRes = await fetch(`${API_BASE}/reallocation/eligibility`);
        const eligibilityData = await eligibilityRes.json();

        if (eligibilityData.success) {
            const matrix = eligibilityData.data?.eligibilityMatrix || [];

            console.log(`   🎯 Eligible Matches: ${matrix.length}\n`);

            if (matrix.length > 0) {
                console.log('   📋 Top Eligible Matches:');
                console.log('   ' + '─'.repeat(50));

                matrix.slice(0, 5).forEach((match, i) => {
                    console.log(`   ${i + 1}. ${match.passenger?.name || match.name} (${match.passenger?.pnr || match.pnr})`);
                    console.log(`      Current: ${match.passenger?.coach || match.coach}-${match.passenger?.seatNo || match.seatNo}`);
                    console.log(`      Offered: ${match.berth?.fullBerthNo || match.offeredBerth} (${match.berth?.type || match.berthType})`);
                    console.log(`      Score: ${match.score || 'N/A'}`);
                    console.log('');
                });
            } else {
                console.log('   ⚠️  No eligible matches found');
                console.log('\n   Possible reasons:');
                console.log('   - No RAC passengers are boarded');
                console.log('   - All boarded RAC passengers are Offline');
                console.log('   - No matching vacant berths for journey segments');
                console.log('   - Journey not started or already completed');
            }
        } else {
            console.log(`   ❌ Error: ${eligibilityData.error || eligibilityData.message}`);
        }

        // ═══════════════════════════════════════════════════════════
        // 5. GET CURRENT STATION MATCHING (Phase 1)
        // ═══════════════════════════════════════════════════════════
        console.log('\n5️⃣  Getting current station matching data...\n');

        const matchingRes = await fetch(`${API_BASE}/reallocation/current-station-matching`);
        const matchingData = await matchingRes.json();

        if (matchingData.success !== false) {
            console.log(`   🎫 RAC Passengers at station: ${matchingData.racPassengers?.length || 0}`);
            console.log(`   🛏️  Vacant Berths at station: ${matchingData.vacantBerths?.length || 0}`);
            console.log(`   🔗 Possible Matches: ${matchingData.matches?.length || 0}`);
        } else {
            console.log(`   ❌ Error: ${matchingData.message || 'Could not get matching data'}`);
        }

        // ═══════════════════════════════════════════════════════════
        // SUMMARY
        // ═══════════════════════════════════════════════════════════
        console.log('\n' + '═'.repeat(60));
        console.log('📊 ELIGIBILITY RULES SUMMARY');
        console.log('═'.repeat(60));
        console.log(`
   For a RAC passenger to be eligible for upgrade:
   
   ✅ Rule 1: Passenger must be BOARDED (physically on train)
   ✅ Rule 2: Passenger must be ONLINE (app/connectivity status)
   ✅ Rule 3: Journey must OVERLAP with vacant segment
   ✅ Rule 4: Gender constraints must be satisfied
   ✅ Rule 5: Not marked as NO_SHOW
   ✅ Rule 6: Haven't previously DENIED this berth
   ✅ Rule 7: Not already upgraded
`);
        console.log('═'.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

// Run test
testEligibility();
