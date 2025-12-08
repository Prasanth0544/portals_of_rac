/**
 * RAC Reallocation System - API Test Suite
 * Tests all major API endpoints for the current version
 * 
 * Run with: node test_api.js
 * Make sure the backend server is running on port 5000
 */

const API_BASE = 'http://localhost:5000/api';

// Test results tracking
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function log(emoji, message) {
    console.log(`${emoji} ${message}`);
}

function logTest(name, success, details = '') {
    const status = success ? '✅' : '❌';
    console.log(`   ${status} ${name}${details ? ': ' + details : ''}`);
    results.tests.push({ name, success, details });
    if (success) results.passed++;
    else results.failed++;
}

async function testAPI() {
    console.log('\n' + '='.repeat(60));
    console.log('🚂 RAC REALLOCATION SYSTEM - API TEST SUITE');
    console.log('='.repeat(60) + '\n');

    let authToken = null;

    try {
        // ═══════════════════════════════════════════════════════════
        // 1. AUTHENTICATION TESTS
        // ═══════════════════════════════════════════════════════════
        log('🔐', 'Testing Authentication APIs...\n');

        // Staff Login (Admin)
        console.log('   Testing Staff Login...');
        const loginRes = await fetch(`${API_BASE}/auth/staff/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employeeId: 'ADMIN_01',
                password: 'Prasanth@123'
            })
        });
        const loginData = await loginRes.json();
        logTest('Staff Login (Admin)', loginData.success, loginData.success ? 'Token received' : loginData.message);

        if (loginData.success && loginData.token) {
            authToken = loginData.token;
        }

        // Token Verification
        if (authToken) {
            const verifyRes = await fetch(`${API_BASE}/auth/verify`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const verifyData = await verifyRes.json();
            logTest('Token Verification', verifyData.success, verifyData.user?.role || '');
        }

        // ═══════════════════════════════════════════════════════════
        // 2. TRAIN STATE TESTS
        // ═══════════════════════════════════════════════════════════
        log('\n🚂', 'Testing Train State APIs...\n');

        // Get Train State
        const stateRes = await fetch(`${API_BASE}/train/state`);
        const stateData = await stateRes.json();
        logTest('Get Train State', stateData.success,
            stateData.success ? `Train: ${stateData.data?.trainName || stateData.data?.trainNo}` : stateData.message);

        let trainState = stateData.data;
        let currentStation = null;

        if (trainState?.stations && trainState?.currentStationIdx !== undefined) {
            currentStation = trainState.stations[trainState.currentStationIdx];
            log('   📍', `Current Station: ${currentStation?.name} (Index: ${trainState.currentStationIdx})`);
            log('   👥', `Total Passengers: ${trainState.stats?.totalPassengers || 0}`);
            log('   🎫', `RAC Queue: ${trainState.racQueue?.length || 0} passengers`);
        }

        // Get Train Stats
        const statsRes = await fetch(`${API_BASE}/train/stats`);
        const statsData = await statsRes.json();
        logTest('Get Train Stats', statsData.success,
            statsData.success ? `CNF: ${statsData.data?.cnfPassengers || 0}, RAC: ${statsData.data?.racPassengers || 0}` : '');

        // ═══════════════════════════════════════════════════════════
        // 3. RAC QUEUE TESTS
        // ═══════════════════════════════════════════════════════════
        log('\n🎫', 'Testing RAC Queue APIs...\n');

        const racRes = await fetch(`${API_BASE}/train/rac-queue`);
        const racData = await racRes.json();
        logTest('Get RAC Queue', racData.success,
            racData.success ? `${racData.data?.queue?.length || 0} RAC passengers` : '');

        if (racData.success && racData.data?.queue?.length > 0) {
            const firstRAC = racData.data.queue[0];
            log('   📋', `First RAC: ${firstRAC.name} (PNR: ${firstRAC.pnr})`);
            log('   🟢', `Status: ${firstRAC.passengerStatus || 'Unknown'} | Boarded: ${firstRAC.boarded || false}`);
        }

        // ═══════════════════════════════════════════════════════════
        // 4. VACANT BERTHS TESTS
        // ═══════════════════════════════════════════════════════════
        log('\n🛏️', 'Testing Vacant Berths APIs...\n');

        const vacantRes = await fetch(`${API_BASE}/train/vacant-berths`);
        const vacantData = await vacantRes.json();
        logTest('Get Vacant Berths', vacantData.success,
            vacantData.success ? `${vacantData.data?.vacancies?.length || 0} vacant berths` : vacantData.message);

        if (vacantData.success && vacantData.data?.vacancies?.length > 0) {
            const firstVacant = vacantData.data.vacancies[0];
            log('   🛏️', `First Vacant: ${firstVacant.fullBerthNo || firstVacant.berthId} (${firstVacant.type || firstVacant.berthType})`);
        }

        // ═══════════════════════════════════════════════════════════
        // 5. PASSENGER TESTS
        // ═══════════════════════════════════════════════════════════
        log('\n👥', 'Testing Passenger APIs...\n');

        // Get All Passengers
        const passengersRes = await fetch(`${API_BASE}/passengers/all`);
        const passengersData = await passengersRes.json();
        logTest('Get All Passengers', passengersData.success,
            passengersData.success ? `${passengersData.data?.total || 0} passengers` : '');

        // Get Passenger Counts
        const countsRes = await fetch(`${API_BASE}/passengers/counts`);
        const countsData = await countsRes.json();
        logTest('Get Passenger Counts', countsData.success,
            countsData.success ? `CNF: ${countsData.data?.cnf || 0}, RAC: ${countsData.data?.rac || 0}, NoShow: ${countsData.data?.noShow || 0}` : '');

        // ═══════════════════════════════════════════════════════════
        // 6. REALLOCATION TESTS
        // ═══════════════════════════════════════════════════════════
        log('\n🔄', 'Testing Reallocation APIs...\n');

        // Get Eligibility Matrix
        const eligibilityRes = await fetch(`${API_BASE}/reallocation/eligibility`);
        const eligibilityData = await eligibilityRes.json();
        logTest('Get Eligibility Matrix', eligibilityData.success,
            eligibilityData.success ? `${eligibilityData.data?.eligibilityMatrix?.length || 0} eligible matches` : eligibilityData.message);

        // Get Pending Reallocations
        const pendingRes = await fetch(`${API_BASE}/reallocation/pending`);
        const pendingData = await pendingRes.json();
        logTest('Get Pending Reallocations', pendingData.success !== undefined,
            `${pendingData.data?.pending?.length || pendingData.data?.length || 0} pending`);

        // Get Current Station Matching
        const matchingRes = await fetch(`${API_BASE}/reallocation/current-station-matching`);
        const matchingData = await matchingRes.json();
        logTest('Get Current Station Matching', matchingData.success !== false,
            matchingData.racPassengers ? `RAC: ${matchingData.racPassengers?.length || 0}, Vacant: ${matchingData.vacantBerths?.length || 0}` : matchingData.message || '');

        // ═══════════════════════════════════════════════════════════
        // 7. TTE PORTAL TESTS
        // ═══════════════════════════════════════════════════════════
        log('\n👮', 'Testing TTE APIs...\n');

        // Get Action History
        if (authToken) {
            const historyRes = await fetch(`${API_BASE}/tte/action-history`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const historyData = await historyRes.json();
            logTest('Get Action History', historyData.success,
                historyData.success ? `${historyData.data?.length || 0} actions` : '');

            // Get TTE Statistics
            const tteStatsRes = await fetch(`${API_BASE}/tte/statistics`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const tteStatsData = await tteStatsRes.json();
            logTest('Get TTE Statistics', tteStatsData.success, '');

            // Get Upgraded Passengers
            const upgradedRes = await fetch(`${API_BASE}/tte/upgraded-passengers`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const upgradedData = await upgradedRes.json();
            logTest('Get Upgraded Passengers', upgradedData.success,
                upgradedData.success ? `${upgradedData.data?.length || 0} upgraded` : '');
        }

        // ═══════════════════════════════════════════════════════════
        // 8. VISUALIZATION TESTS
        // ═══════════════════════════════════════════════════════════
        log('\n📊', 'Testing Visualization APIs...\n');

        // Segment Matrix
        const matrixRes = await fetch(`${API_BASE}/visualization/segment-matrix`);
        const matrixData = await matrixRes.json();
        logTest('Get Segment Matrix', matrixData.success,
            matrixData.success ? `${matrixData.data?.coaches?.length || 0} coaches` : matrixData.message);

        // Heatmap
        const heatmapRes = await fetch(`${API_BASE}/visualization/heatmap`);
        const heatmapData = await heatmapRes.json();
        logTest('Get Heatmap', heatmapData.success, '');

        // ═══════════════════════════════════════════════════════════
        // 9. PUSH NOTIFICATIONS TESTS
        // ═══════════════════════════════════════════════════════════
        log('\n🔔', 'Testing Push Notification APIs...\n');

        const vapidRes = await fetch(`${API_BASE}/push/vapid-public-key`);
        const vapidData = await vapidRes.json();
        logTest('Get VAPID Public Key', vapidData.success,
            vapidData.success ? 'Key retrieved' : vapidData.message);

    } catch (error) {
        console.error('\n❌ Test Suite Error:', error.message);
    }

    // ═══════════════════════════════════════════════════════════
    // TEST SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   📈 Total:  ${results.passed + results.failed}`);
    console.log(`   🎯 Score:  ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    console.log('='.repeat(60) + '\n');

    // List failed tests
    const failedTests = results.tests.filter(t => !t.success);
    if (failedTests.length > 0) {
        console.log('❌ Failed Tests:');
        failedTests.forEach(t => console.log(`   - ${t.name}: ${t.details}`));
        console.log('');
    }
}

// Run tests
testAPI();
