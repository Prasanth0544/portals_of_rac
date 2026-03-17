/**
 * ═══════════════════════════════════════════════════════════════════════
 * RAC UPGRADE ALGORITHM — EVALUATION RUNNER (DATABASE-DRIVEN)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Connects to MongoDB, fetches ALL trains from Trains_Details collection,
 * loads actual station data for each train, generates synthetic passengers,
 * and evaluates the upgrade algorithm across every train in the database.
 *
 * What it does:
 *   1. Connects to MongoDB (uses .env config)
 *   2. Fetches ALL trains from Trains_Details
 *   3. Fetches real station data for each train
 *   4. Generates synthetic CNF + RAC passengers per train
 *   5. Simulates cancellations → triggers upgrade logic → measures time
 *   6. Validates correctness (order, no duplicates, freed seats)
 *   7. Prints structured results for ALL trains
 *
 * Run:  node tests/evaluationRunner.js
 * ═══════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const TrainState = require('../models/TrainState');
const CurrentStationReallocationService = require('../services/CurrentStationReallocationService');
const { TRAIN_FIELDS, getStationCollectionName } = require('../config/fields');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
const TRAIN_DETAILS_DB = process.env.TRAIN_DETAILS_DB || process.env.STATIONS_DB || 'rac';
const TRAIN_DETAILS_COLLECTION = process.env.TRAIN_DETAILS_COLLECTION || 'Trains_Details';
const STATIONS_DB = process.env.STATIONS_DB || 'rac';

// ─── NAMES FOR REALISTIC SYNTHETIC DATA ──────────────────────────────────────

const MALE_NAMES = [
    'Rajesh Kumar', 'Suresh Reddy', 'Arun Sharma', 'Vijay Singh', 'Mohan Das',
    'Ravi Teja', 'Prasad Rao', 'Krishna Murthy', 'Srinivas Gupta', 'Ramesh Babu',
    'Venkat Rao', 'Naresh Patel', 'Amit Verma', 'Dinesh Joshi', 'Ganesh Pillai',
    'Rakesh Mehra', 'Satish Kumar', 'Deepak Mishra', 'Kiran Kumar', 'Anil Nair',
    'Anand Sharma', 'Manoj Tiwari', 'Praveen Kumar', 'Harish Chandra', 'Naveen Jain',
];

const FEMALE_NAMES = [
    'Priya Sharma', 'Lakshmi Devi', 'Anitha Kumari', 'Sujatha Rao', 'Meena Gupta',
    'Padma Reddy', 'Kavitha Nair', 'Sunita Patel', 'Geeta Sharma', 'Rani Devi',
    'Deepa Murthy', 'Shanti Das', 'Savitri Rao', 'Radha Krishna', 'Latha Kumari',
    'Jyothi Prasad', 'Nirmala Devi', 'Sarita Verma', 'Uma Mahesh', 'Rekha Singh',
];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randomAge() {
    const r = Math.random();
    if (r < 0.05) return Math.floor(Math.random() * 10) + 5;
    if (r < 0.65) return Math.floor(Math.random() * 30) + 20;
    if (r < 0.80) return Math.floor(Math.random() * 20) + 25;
    return Math.floor(Math.random() * 20) + 60;
}

// ─── SCENARIO TEMPLATES ──────────────────────────────────────────────────────
// Each template is applied to EVERY train found in the database

const SCENARIO_TEMPLATES = [
    { suffix: 'a', confirmed: 100, rac: 10, cancel: 1, desc: 'Minimal cancellation' },
    { suffix: 'b', confirmed: 100, rac: 20, cancel: 5, desc: 'Small batch cancellation' },
    { suffix: 'c', confirmed: 100, rac: 50, cancel: 25, desc: 'Half RAC upgraded' },
    { suffix: 'd', confirmed: 100, rac: 0, cancel: 5, desc: 'No RAC passengers (edge)' },
    { suffix: 'e', confirmed: 500, rac: 200, cancel: 100, desc: 'High volume stress test' },
    { suffix: 'f', confirmed: 50, rac: 50, cancel: 50, desc: 'All confirmed cancelled' },
    { suffix: 'g', confirmed: 200, rac: 5, cancel: 20, desc: 'More cancellations than RAC' },
    { suffix: 'h', confirmed: 100, rac: 30, cancel: 0, desc: 'Zero cancellations (edge)' },
    { suffix: 'i', confirmed: 300, rac: 100, cancel: 50, desc: 'Mixed mid-journey station' },
    { suffix: 'j', confirmed: 100, rac: 10, cancel: 10, desc: 'Cancel count = RAC count' },
];

// ─── DATABASE: FETCH ALL TRAINS ──────────────────────────────────────────────

async function fetchAllTrains(client) {
    const db = client.db(TRAIN_DETAILS_DB);
    const collection = db.collection(TRAIN_DETAILS_COLLECTION);

    const trainDocs = await collection.find({}).toArray();

    if (!trainDocs || trainDocs.length === 0) {
        throw new Error('No trains found in Trains_Details collection!');
    }

    return trainDocs;
}

async function fetchStationsForTrain(client, trainDoc) {
    // Get station collection name — handles trailing space issue
    const stationCol = getStationCollectionName(trainDoc);
    if (!stationCol) {
        return null;
    }

    // Station collection DB — may be specified per-train, default to STATIONS_DB
    const stationsDbName = trainDoc[TRAIN_FIELDS.STATIONS_DB] || STATIONS_DB;
    const db = client.db(stationsDbName);
    const collection = db.collection(stationCol);

    const stationDocs = await collection.find({}).sort({ SNO: 1 }).toArray();

    if (!stationDocs || stationDocs.length < 2) {
        return null;
    }

    return stationDocs.map((s, idx) => ({
        idx,
        sno: s.SNO || idx + 1,
        code: s.Station_Code || s.station_code || `ST${idx}`,
        name: s.Station_Name || s.station_name || `Station ${idx + 1}`,
        arrival: s.Arrival_Time || '',
        departure: s.Departure_Time || '',
        distance: s.Distance || idx * 80,
        day: s.Day || 1,
        halt: s.Halt_Duration || '2 min',
    }));
}

// ─── SYNTHETIC DATA GENERATION ───────────────────────────────────────────────

function generatePassengers(cnfCount, racCount, stations, trainNo, sleeperCoaches) {
    const cnfPassengers = [];
    const racPassengers = [];
    const totalStations = stations.length;

    for (let i = 1; i <= cnfCount; i++) {
        const gender = Math.random() > 0.45 ? 'Male' : 'Female';
        const name = gender === 'Male' ? randomItem(MALE_NAMES) : randomItem(FEMALE_NAMES);
        const age = randomAge();

        const fromIdx = Math.floor(Math.random() * Math.max(1, totalStations - 2));
        const toIdx = fromIdx + 1 + Math.floor(Math.random() * (totalStations - fromIdx - 1));

        const coachIdx = Math.floor((i - 1) / 72);
        const coachNo = coachIdx < sleeperCoaches
            ? `S${coachIdx + 1}`
            : `B${coachIdx - sleeperCoaches + 1}`;
        const berth = ((i - 1) % 72) + 1;

        cnfPassengers.push({
            pnr: `CNF_${trainNo}_${String(i).padStart(4, '0')}`,
            name, age, gender,
            from: stations[fromIdx].code, fromIdx,
            to: stations[toIdx].code, toIdx,
            pnrStatus: 'CNF', racStatus: '-',
            coach: coachNo, seatNo: berth, berthType: 'Lower Berth',
            passengerStatus: Math.random() > 0.7 ? 'Online' : 'Offline',
            irctcId: `IR_CNF_${trainNo}_${i}`, passengerIndex: 1,
            isGroupLeader: true, seatPreference: 'No Preference',
            preferencePriority: age >= 60 ? 3 : (gender === 'Female' ? 2 : 1),
            preferenceMatched: false, noShow: false, boarded: false,
        });
    }

    const sideLowerPositions = [7, 15, 23, 31, 39, 47, 55, 63, 71];
    for (let i = 1; i <= racCount; i++) {
        const gender = Math.random() > 0.45 ? 'Male' : 'Female';
        const name = gender === 'Male' ? randomItem(MALE_NAMES) : randomItem(FEMALE_NAMES);
        const age = randomAge();

        const fromIdx = 0;
        const toIdx = Math.min(1 + Math.floor(Math.random() * (totalStations - 1)), totalStations - 1);

        const racBerthIdx = (i - 1) % sideLowerPositions.length;
        const racCoachIdx = Math.floor((i - 1) / sideLowerPositions.length);
        const racCoach = `S${(racCoachIdx % sleeperCoaches) + 1}`;
        const racBerth = sideLowerPositions[racBerthIdx];

        racPassengers.push({
            pnr: `RAC_${trainNo}_${String(i).padStart(4, '0')}`,
            name, age, gender,
            from: stations[fromIdx].code, fromIdx,
            to: stations[toIdx].code, toIdx,
            pnrStatus: 'RAC', racNumber: i, racStatus: `RAC ${i}`,
            coach: racCoach, seatNo: racBerth, berth: `${racCoach}-${racBerth}`,
            berthType: 'Side Lower',
            passengerStatus: Math.random() > 0.5 ? 'Online' : 'Offline',
            irctcId: `IR_RAC_${trainNo}_${i}`, passengerIndex: 1,
            isGroupLeader: true, seatPreference: 'No Preference',
            preferencePriority: age >= 60 ? 3 : (gender === 'Female' ? 2 : 1),
            preferenceMatched: false, noShow: false, boarded: false,
        });
    }

    return { cnfPassengers, racPassengers };
}

// ─── TRAIN STATE BUILDER ─────────────────────────────────────────────────────

function buildTrainState(trainNo, trainName, stations, cnfPassengers, racPassengers, sleeperCoaches, acCoaches) {
    const trainState = new TrainState(trainNo, trainName);
    trainState.stations = stations;
    trainState.initializeCoaches(sleeperCoaches, acCoaches);

    let allocated = 0, skipped = 0;

    for (const p of cnfPassengers) {
        const berth = trainState.findBerth(p.coach, p.seatNo);
        if (!berth || !berth.isAvailableForSegment(p.fromIdx, p.toIdx)) { skipped++; continue; }

        berth.addPassenger({
            pnr: p.pnr, passengerIndex: p.passengerIndex, irctcId: p.irctcId,
            name: p.name, age: p.age, gender: p.gender,
            seatPreference: p.seatPreference, preferencePriority: p.preferencePriority,
            isGroupLeader: p.isGroupLeader,
            from: p.from, fromIdx: p.fromIdx, to: p.to, toIdx: p.toIdx,
            pnrStatus: p.pnrStatus, racStatus: p.racStatus, berthType: p.berthType,
            passengerStatus: p.passengerStatus, noShow: false, boarded: false,
            preferenceMatched: false,
        });
        allocated++;
    }

    trainState.racQueue = racPassengers.map(p => ({ ...p, boarded: false, noShow: false }));
    trainState.startJourney();
    return { trainState, allocated, skipped };
}

// ─── CANCELLATION SIMULATOR ─────────────────────────────────────────────────

function simulateCancellation(trainState, count) {
    let cancelled = 0;
    const cancelledPNRs = [];

    for (const coach of trainState.coaches) {
        for (const berth of coach.berths) {
            for (const p of berth.passengers) {
                if (cancelled >= count) break;
                if (p.pnrStatus === 'CNF' && p.boarded && !p.noShow) {
                    p.noShow = true;
                    p.boarded = false;
                    for (let i = 0; i < berth.segmentOccupancy.length; i++) {
                        const idx = berth.segmentOccupancy[i].indexOf(p.pnr);
                        if (idx > -1) berth.segmentOccupancy[i].splice(idx, 1);
                    }
                    berth.updateStatus();
                    cancelledPNRs.push(p.pnr);
                    cancelled++;
                }
            }
            if (cancelled >= count) break;
        }
        if (cancelled >= count) break;
    }

    trainState.updateStats();
    return { cancelled, cancelledPNRs };
}

// ─── UPGRADE LOGIC RUNNER ───────────────────────────────────────────────────

function runUpgradeLogic(trainState) {
    const start = Date.now();
    const result = CurrentStationReallocationService.getCurrentStationData(trainState);
    const end = Date.now();
    return {
        matches: result.matches || [],
        stats: result.stats || {},
        executionTimeMs: end - start,
    };
}

// ─── VALIDATION ─────────────────────────────────────────────────────────────

function validateResults(upgradeResult, cancelCount, racCount) {
    const errors = [];

    if (upgradeResult.matches.length > racCount) {
        errors.push(`Upgraded (${upgradeResult.matches.length}) > RAC count (${racCount})`);
    }

    const usedBerths = new Set();
    const usedPassengers = new Set();
    for (const match of upgradeResult.matches) {
        if (usedBerths.has(match.berthId)) errors.push(`Duplicate berth: ${match.berthId}`);
        usedBerths.add(match.berthId);
        const pnr = match.topMatch?.pnr;
        if (pnr && usedPassengers.has(pnr)) errors.push(`Duplicate passenger: ${pnr}`);
        if (pnr) usedPassengers.add(pnr);
    }

    let prevRAC = 0, orderCorrect = true;
    for (const match of upgradeResult.matches) {
        const racNum = parseInt(match.topMatch?.racStatus?.match(/\d+/)?.[0] || '999');
        if (racNum < prevRAC) { orderCorrect = false; break; }
        prevRAC = racNum;
    }

    return {
        passed: errors.length === 0,
        errors,
        orderCorrect,
        noDuplicateBerths: usedBerths.size === upgradeResult.matches.length,
        noDuplicatePassengers: usedPassengers.size === upgradeResult.matches.length,
    };
}

// ─── SCENARIO RUNNER (SINGLE) ───────────────────────────────────────────────

function runScenario(trainInfo, template) {
    const { trainNo, trainName, stations, sleeperCoaches, acCoaches } = trainInfo;

    const { cnfPassengers, racPassengers } = generatePassengers(
        template.confirmed, template.rac, stations, trainNo, sleeperCoaches
    );

    const { trainState, allocated, skipped } = buildTrainState(
        trainNo, trainName, stations, cnfPassengers, racPassengers, sleeperCoaches, acCoaches
    );

    trainState.currentStationIdx = 1;
    trainState.updateStats();

    const cancelResult = simulateCancellation(trainState, template.cancel);
    const upgradeResult = runUpgradeLogic(trainState);
    const validation = validateResults(upgradeResult, template.cancel, template.rac);

    return {
        id: `${trainNo}-${template.suffix}`,
        train: `${trainName} (${trainNo})`,
        desc: template.desc,
        stations: stations.length,
        confirmed: template.confirmed,
        rac: template.rac,
        cancelRequested: template.cancel,
        allocated, skipped,
        freedSeats: cancelResult.cancelled,
        matchesFound: upgradeResult.matches.length,
        executionTimeMs: upgradeResult.executionTimeMs,
        orderCorrect: validation.orderCorrect,
        noDuplicateBerths: validation.noDuplicateBerths,
        noDuplicatePassengers: validation.noDuplicatePassengers,
        passed: validation.passed,
        errors: validation.errors,
    };
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
    let client;

    try {
        // 1. Connect to MongoDB
        console.log(`\n🔗 Connecting to MongoDB: ${MONGODB_URI}`);
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB\n');

        // 2. Fetch all trains
        console.log(`📦 Fetching trains from ${TRAIN_DETAILS_DB}.${TRAIN_DETAILS_COLLECTION}...`);
        const trainDocs = await fetchAllTrains(client);
        console.log(`✅ Found ${trainDocs.length} train(s)\n`);

        // 3. Load station data for each train
        const trainInfos = [];
        for (const doc of trainDocs) {
            const trainNo = String(doc[TRAIN_FIELDS.TRAIN_NO] || '');
            const trainName = doc[TRAIN_FIELDS.TRAIN_NAME] || doc.Train_Name || `Train ${trainNo}`;
            const sleeperCoaches = Number(doc[TRAIN_FIELDS.SLEEPER_COACHES_COUNT] || doc.Sleeper_Coaches_Count || 9);
            const acCoaches = Number(doc[TRAIN_FIELDS.THREE_TIER_AC_COACHES_COUNT] || doc.Three_TierAC_Coaches_Count || 0);

            console.log(`  🚂 ${trainName} (${trainNo}) — loading stations...`);
            const stations = await fetchStationsForTrain(client, doc);

            if (!stations || stations.length < 2) {
                console.log(`     ⚠️ Skipped — no station data found`);
                continue;
            }

            console.log(`     ✅ ${stations.length} stations: ${stations[0].code} → ${stations[stations.length - 1].code}`);
            trainInfos.push({ trainNo, trainName, stations, sleeperCoaches, acCoaches });
        }

        if (trainInfos.length === 0) {
            console.log('\n❌ No trains with valid station data found. Exiting.');
            return;
        }

        console.log(`\n🎯 Running ${SCENARIO_TEMPLATES.length} scenarios × ${trainInfos.length} trains = ${SCENARIO_TEMPLATES.length * trainInfos.length} total evaluations\n`);

        // 4. Suppress console during benchmarks
        const origLog = console.log;
        const origWarn = console.warn;
        console.log = () => { };
        console.warn = () => { };

        // 5. Run all scenarios
        const allResults = [];
        for (const trainInfo of trainInfos) {
            for (const template of SCENARIO_TEMPLATES) {
                try {
                    const result = runScenario(trainInfo, template);
                    allResults.push(result);
                } catch (err) {
                    allResults.push({
                        id: `${trainInfo.trainNo}-${template.suffix}`,
                        train: `${trainInfo.trainName} (${trainInfo.trainNo})`,
                        desc: template.desc,
                        error: err.message,
                        passed: false,
                    });
                }
            }
        }

        // 6. Restore console
        console.log = origLog;
        console.warn = origWarn;

        // ─── PRINT RESULTS ──────────────────────────────────────────────────
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════════════════════');
        console.log('  RAC UPGRADE ALGORITHM — EVALUATION RESULTS (ALL DATABASE TRAINS)');
        console.log(`  Trains: ${trainInfos.length} | Scenarios per train: ${SCENARIO_TEMPLATES.length} | Total: ${allResults.length}`);
        console.log('═══════════════════════════════════════════════════════════════════════════════');

        let passCount = 0, failCount = 0;

        // Group by train
        const trainGroups = {};
        for (const r of allResults) {
            const key = r.train || r.id;
            if (!trainGroups[key]) trainGroups[key] = [];
            trainGroups[key].push(r);
        }

        for (const [trainName, trainResults] of Object.entries(trainGroups)) {
            const trainPass = trainResults.filter(r => r.passed).length;
            const trainStatusEmoji = trainPass === trainResults.length ? '✅' : '⚠️';
            console.log(`\n${trainStatusEmoji} 🚂 ${trainName} [${trainPass}/${trainResults.length} passed]`);
            console.log('─'.repeat(75));

            for (const r of trainResults) {
                if (r.error && r.freedSeats === undefined) {
                    console.log(`  ❌ ${r.id}: ${r.desc} — ERROR: ${r.error}`);
                    failCount++;
                    continue;
                }

                const status = r.passed ? '✅' : '❌';
                const orderFlag = r.orderCorrect ? '✓' : '✗';
                const dupeFlag = (r.noDuplicateBerths && r.noDuplicatePassengers) ? '✓' : '✗';
                console.log(
                    `  ${status} ${r.id.padEnd(12)} | CNF:${String(r.confirmed).padStart(3)} RAC:${String(r.rac).padStart(3)} ` +
                    `Cancel:${String(r.cancelRequested).padStart(3)} | Freed:${String(r.freedSeats).padStart(3)} ` +
                    `Matches:${String(r.matchesFound).padStart(3)} | ${String(r.executionTimeMs).padStart(3)}ms | ` +
                    `Order:${orderFlag} Dupes:${dupeFlag} | ${r.desc}`
                );

                if (r.errors && r.errors.length > 0) {
                    console.log(`     ⚠️ ${r.errors.join(', ')}`);
                }

                if (r.passed) passCount++; else failCount++;
            }
        }

        // ─── GRAND SUMMARY ────────────────────────────────────────────────────
        console.log('\n');
        console.log('═══════════════════════════════════════════════════════════════════════════════');
        console.log('  GRAND SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════════════════════');
        console.log('');

        // Per-train summary
        console.log('  Train'.padEnd(45) + '| Stations | Scenarios | Pass | Fail');
        console.log('  ' + '─'.repeat(73));
        for (const info of trainInfos) {
            const key = `${info.trainName} (${info.trainNo})`;
            const results = trainGroups[key] || [];
            const pass = results.filter(r => r.passed).length;
            const fail = results.length - pass;
            const statusIcon = fail === 0 ? '✅' : '❌';
            console.log(
                `  ${statusIcon} ${key.padEnd(42)}| ${String(info.stations.length).padStart(8)} | ${String(results.length).padStart(9)} | ${String(pass).padStart(4)} | ${String(fail).padStart(4)}`
            );
        }

        console.log('');
        console.log('═══════════════════════════════════════════════════════════════════════════════');
        console.log(`  TOTAL: ${passCount}/${passCount + failCount} PASSED across ${trainInfos.length} trains`);
        if (failCount > 0) {
            console.log(`  ⚠️ ${failCount} scenario(s) failed — review errors above`);
        } else {
            console.log('  🎉 All scenarios passed! Upgrade algorithm is correct for ALL trains.');
        }
        console.log('═══════════════════════════════════════════════════════════════════════════════');
        console.log('');

    } catch (err) {
        console.error('\n❌ Fatal error:', err.message);
        console.error(err.stack);
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 MongoDB connection closed.');
        }
    }
}

// ─── RUN ─────────────────────────────────────────────────────────────────────
main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
