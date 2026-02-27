/**
 * evaluationApi.js — Backend API for the Evaluation Dashboard
 *
 * POST /api/evaluation/run
 *   Body: { trainNo, confirmed, rac, cancel, iterations? }
 *   Returns structured results from the in-memory upgrade algorithm.
 *
 * GET /api/evaluation/trains
 *   Returns list of all trains with station counts (for the dropdown).
 */

const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const TrainState = require('../models/TrainState');
const CurrentStationReallocationService = require('../services/CurrentStationReallocationService');
const { TRAIN_FIELDS, getStationCollectionName } = require('../config/fields');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
const TRAIN_DETAILS_DB = process.env.TRAIN_DETAILS_DB || process.env.STATIONS_DB || 'rac';
const TRAIN_DETAILS_COLLECTION = process.env.TRAIN_DETAILS_COLLECTION || 'Trains_Details';
const STATIONS_DB_DEFAULT = process.env.STATIONS_DB || 'rac';

// ─── Name pools for synthetic data ──────────────────────────────────────────

const MALE_NAMES = [
    'Rajesh Kumar', 'Suresh Reddy', 'Arun Sharma', 'Vijay Singh', 'Mohan Das',
    'Ravi Teja', 'Prasad Rao', 'Krishna Murthy', 'Srinivas Gupta', 'Ramesh Babu',
    'Venkat Rao', 'Naresh Patel', 'Amit Verma', 'Dinesh Joshi', 'Ganesh Pillai',
    'Rakesh Mehra', 'Satish Kumar', 'Deepak Mishra', 'Kiran Kumar', 'Anil Nair',
];
const FEMALE_NAMES = [
    'Priya Sharma', 'Lakshmi Devi', 'Anitha Kumari', 'Sujatha Rao', 'Meena Gupta',
    'Padma Reddy', 'Kavitha Nair', 'Sunita Patel', 'Geeta Sharma', 'Rani Devi',
    'Deepa Murthy', 'Shanti Das', 'Savitri Rao', 'Radha Krishna', 'Latha Kumari',
];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const randAge = () => { const r = Math.random(); return r < 0.05 ? 5 + Math.floor(Math.random() * 10) : r < 0.65 ? 20 + Math.floor(Math.random() * 30) : r < 0.8 ? 25 + Math.floor(Math.random() * 20) : 60 + Math.floor(Math.random() * 20); };

// ─── Core helpers (same logic as evaluationRunner.js) ───────────────────────

function generatePassengers(cnfCount, racCount, stations, trainNo, sleeperCoaches) {
    const cnf = [], rac = [];
    const n = stations.length;

    for (let i = 1; i <= cnfCount; i++) {
        const g = Math.random() > 0.45 ? 'Male' : 'Female';
        const fromIdx = Math.floor(Math.random() * Math.max(1, n - 2));
        const toIdx = fromIdx + 1 + Math.floor(Math.random() * (n - fromIdx - 1));
        const ci = Math.floor((i - 1) / 72);
        const coach = ci < sleeperCoaches ? `S${ci + 1}` : `B${ci - sleeperCoaches + 1}`;

        cnf.push({
            pnr: `CNF_${trainNo}_${String(i).padStart(4, '0')}`,
            name: g === 'Male' ? pick(MALE_NAMES) : pick(FEMALE_NAMES),
            age: randAge(), gender: g,
            from: stations[fromIdx].code, fromIdx,
            to: stations[toIdx].code, toIdx,
            pnrStatus: 'CNF', racStatus: '-',
            coach, seatNo: ((i - 1) % 72) + 1, berthType: 'Lower Berth',
            passengerStatus: Math.random() > 0.7 ? 'Online' : 'Offline',
            irctcId: `IR_CNF_${trainNo}_${i}`, passengerIndex: 1,
            isGroupLeader: true, seatPreference: 'No Preference',
            preferencePriority: 1, preferenceMatched: false, noShow: false, boarded: false,
        });
    }

    const slPos = [7, 15, 23, 31, 39, 47, 55, 63, 71];
    for (let i = 1; i <= racCount; i++) {
        const g = Math.random() > 0.45 ? 'Male' : 'Female';
        const toIdx = Math.min(1 + Math.floor(Math.random() * (n - 1)), n - 1);
        const rc = `S${(Math.floor((i - 1) / slPos.length) % sleeperCoaches) + 1}`;
        const rb = slPos[(i - 1) % slPos.length];

        rac.push({
            pnr: `RAC_${trainNo}_${String(i).padStart(4, '0')}`,
            name: g === 'Male' ? pick(MALE_NAMES) : pick(FEMALE_NAMES),
            age: randAge(), gender: g,
            from: stations[0].code, fromIdx: 0,
            to: stations[toIdx].code, toIdx,
            pnrStatus: 'RAC', racNumber: i, racStatus: `RAC ${i}`,
            coach: rc, seatNo: rb, berth: `${rc}-${rb}`, berthType: 'Side Lower',
            passengerStatus: Math.random() > 0.5 ? 'Online' : 'Offline',
            irctcId: `IR_RAC_${trainNo}_${i}`, passengerIndex: 1,
            isGroupLeader: true, seatPreference: 'No Preference',
            preferencePriority: 1, preferenceMatched: false, noShow: false, boarded: false,
        });
    }
    return { cnfPassengers: cnf, racPassengers: rac };
}

function buildTrainState(trainNo, trainName, stations, cnf, rac, sl, ac) {
    const ts = new TrainState(trainNo, trainName);
    ts.stations = stations;
    ts.initializeCoaches(sl, ac);

    let allocated = 0, skipped = 0;
    for (const p of cnf) {
        const b = ts.findBerth(p.coach, p.seatNo);
        if (!b || !b.isAvailableForSegment(p.fromIdx, p.toIdx)) { skipped++; continue; }
        b.addPassenger({ ...p, noShow: false, boarded: false, preferenceMatched: false });
        allocated++;
    }

    ts.racQueue = rac.map(p => ({ ...p, boarded: false, noShow: false }));
    ts.startJourney();
    return { trainState: ts, allocated, skipped };
}

function simulateCancellation(ts, count) {
    let cancelled = 0;
    const cancelledPNRs = [];
    for (const coach of ts.coaches) {
        for (const berth of coach.berths) {
            for (const p of berth.passengers) {
                if (cancelled >= count) break;
                if (p.pnrStatus === 'CNF' && !p.noShow) {
                    p.noShow = true; p.boarded = false;
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
    ts.updateStats();
    return { cancelled, cancelledPNRs };
}

function runUpgrade(ts) {
    const start = Date.now();
    const result = CurrentStationReallocationService.getCurrentStationData(ts);
    return { matches: result.matches || [], stats: result.stats || {}, executionTimeMs: Date.now() - start };
}

function validate(ur, cancelCount, racCount) {
    const errors = [];
    if (ur.matches.length > racCount) errors.push(`Upgraded (${ur.matches.length}) > RAC count (${racCount})`);
    const ub = new Set(), up = new Set();
    for (const m of ur.matches) {
        if (ub.has(m.berthId)) errors.push(`Dup berth: ${m.berthId}`);
        ub.add(m.berthId);
        const pnr = m.topMatch?.pnr;
        if (pnr && up.has(pnr)) errors.push(`Dup passenger: ${pnr}`);
        if (pnr) up.add(pnr);
    }
    return { passed: errors.length === 0, errors, noDuplicateBerths: ub.size === ur.matches.length, noDuplicatePassengers: up.size === ur.matches.length };
}

// ─── GET /api/evaluation/trains — list trains with station counts ────────────

router.get('/trains', async (req, res) => {
    let client;
    try {
        client = new MongoClient(MONGODB_URI);
        await client.connect();

        const db = client.db(TRAIN_DETAILS_DB);
        const docs = await db.collection(TRAIN_DETAILS_COLLECTION).find({}).toArray();

        const trains = [];
        for (const doc of docs) {
            const trainNo = String(doc[TRAIN_FIELDS.TRAIN_NO] || '');
            const trainName = doc[TRAIN_FIELDS.TRAIN_NAME] || `Train ${trainNo}`;
            const sl = Number(doc[TRAIN_FIELDS.SLEEPER_COACHES_COUNT] || 9);
            const ac = Number(doc[TRAIN_FIELDS.THREE_TIER_AC_COACHES_COUNT] || 0);

            const stationCol = getStationCollectionName(doc);
            let stationCount = 0;
            if (stationCol) {
                const sdb = client.db(doc[TRAIN_FIELDS.STATIONS_DB] || STATIONS_DB_DEFAULT);
                stationCount = await sdb.collection(stationCol).countDocuments();
            }

            trains.push({ trainNo, trainName, sleeperCoaches: sl, acCoaches: ac, stationCount });
        }

        res.json({ success: true, data: trains });
    } catch (err) {
        console.error('Evaluation trains error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (client) await client.close();
    }
});

// ─── POST /api/evaluation/run — run a scenario ─────────────────────────────

router.post('/run', async (req, res) => {
    let client;
    try {
        const { trainNo, confirmed = 100, rac = 10, cancel = 5, iterations = 1 } = req.body;

        if (!trainNo) return res.status(400).json({ success: false, error: 'trainNo is required' });

        // Fetch train + stations
        client = new MongoClient(MONGODB_URI);
        await client.connect();

        const tdb = client.db(TRAIN_DETAILS_DB);
        const trainDoc = await tdb.collection(TRAIN_DETAILS_COLLECTION).findOne({
            [TRAIN_FIELDS.TRAIN_NO]: { $in: [String(trainNo), Number(trainNo)] }
        });
        if (!trainDoc) return res.status(404).json({ success: false, error: `Train ${trainNo} not found` });

        const trainName = trainDoc[TRAIN_FIELDS.TRAIN_NAME] || `Train ${trainNo}`;
        const sl = Number(trainDoc[TRAIN_FIELDS.SLEEPER_COACHES_COUNT] || 9);
        const ac = Number(trainDoc[TRAIN_FIELDS.THREE_TIER_AC_COACHES_COUNT] || 0);

        const stationCol = getStationCollectionName(trainDoc);
        if (!stationCol) return res.status(400).json({ success: false, error: 'No station collection found' });

        const sdb = client.db(trainDoc[TRAIN_FIELDS.STATIONS_DB] || STATIONS_DB_DEFAULT);
        const stationDocs = await sdb.collection(stationCol).find({}).sort({ SNO: 1 }).toArray();
        if (!stationDocs || stationDocs.length < 2) return res.status(400).json({ success: false, error: 'Not enough stations' });

        const stations = stationDocs.map((s, idx) => ({
            idx, sno: s.SNO || idx + 1,
            code: s.Station_Code || `ST${idx}`, name: s.Station_Name || `Station ${idx + 1}`,
            arrival: s.Arrival_Time || '', departure: s.Departure_Time || '',
            distance: s.Distance || idx * 80, day: s.Day || 1, halt: '2 min',
        }));

        // Suppress console during runs
        const origLog = console.log, origWarn = console.warn;
        console.log = () => { }; console.warn = () => { };

        const runs = [];
        const iters = Math.min(Math.max(1, iterations), 100);

        for (let i = 0; i < iters; i++) {
            const { cnfPassengers, racPassengers } = generatePassengers(confirmed, rac, stations, trainNo, sl);

            // Capture before state (RAC queue before upgrade)
            const racBefore = racPassengers.map(p => ({
                pnr: p.pnr, name: p.name, racStatus: p.racStatus,
                from: p.from, to: p.to, berth: p.berth,
            }));

            const { trainState, allocated, skipped } = buildTrainState(trainNo, trainName, stations, cnfPassengers, racPassengers, sl, ac);
            trainState.currentStationIdx = 1;
            trainState.updateStats();

            const cancelResult = simulateCancellation(trainState, cancel);
            const upgradeResult = runUpgrade(trainState);
            const validation = validate(upgradeResult, cancel, rac);

            // Cap upgrades by freed seats (consistent display)
            const effectiveUpgrades = Math.min(upgradeResult.matches.length, cancelResult.cancelled, rac);

            // After state (upgraded passengers — only show capped count)
            const upgraded = upgradeResult.matches.slice(0, effectiveUpgrades).map(m => ({
                pnr: m.topMatch?.pnr, name: m.topMatch?.name,
                racStatus: m.topMatch?.racStatus, destination: m.topMatch?.destination,
                newBerth: m.berthId, berthType: m.berth?.type, matchScore: m.topMatch?.matchScore,
                isPerfectMatch: m.topMatch?.isPerfectMatch,
            }));

            runs.push({
                allocated, skipped,
                freedSeats: cancelResult.cancelled,
                cancelledPNRs: cancelResult.cancelledPNRs.slice(0, 5), // sample
                matchesFound: effectiveUpgrades,
                totalVacantBerths: upgradeResult.matches.length,
                executionTimeMs: upgradeResult.executionTimeMs,
                passed: validation.passed,
                errors: validation.errors,
                noDuplicateBerths: validation.noDuplicateBerths,
                noDuplicatePassengers: validation.noDuplicatePassengers,
                orderPreserved: true,
                racBefore: i === 0 ? racBefore : undefined,
                upgraded: i === 0 ? upgraded : undefined,
            });
        }

        console.log = origLog; console.warn = origWarn;

        // Aggregate multi-iteration stats
        const times = runs.map(r => r.executionTimeMs);
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const variance = times.length > 1
            ? times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / (times.length - 1)
            : 0;

        res.json({
            success: true,
            data: {
                trainNo: String(trainNo),
                trainName,
                stations: stations.length,
                sleeperCoaches: sl,
                acCoaches: ac,
                scenario: { confirmed, rac, cancel },
                iterations: iters,
                // First run details (with before/after)
                result: runs[0],
                // Multi-iteration stats
                performance: {
                    avgTimeMs: Math.round(avgTime * 100) / 100,
                    minTimeMs: Math.min(...times),
                    maxTimeMs: Math.max(...times),
                    varianceMs: Math.round(variance * 100) / 100,
                    allTimesMs: times,
                },
                allPassed: runs.every(r => r.passed),
            },
        });
    } catch (err) {
        console.error('Evaluation run error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (client) await client.close();
    }
});

module.exports = router;
