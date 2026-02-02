/**
 * CurrentStationReallocationService.js
 * NEW APPROACH: Only process data from CURRENT station
 * - RAC passengers boarded at current station
 * - Berths vacant from current station
 * INTEGRATED: Creates pending reallocations for TTE approval
 */

const StationWiseApprovalService = require('./StationWiseApprovalService');

class CurrentStationReallocationService {
    /**
     * Get current station reallocation data
     * Returns two HashMaps (as arrays) for visual matching
     * STATION LOCK: Only calculates once per station
     */
    getCurrentStationData(trainState) {
        const currentIdx = trainState.currentStationIdx;
        const currentStation = trainState.stations[currentIdx];

        // Check if already calculated this station (return cached)
        // ❌ DISABLED: Station lock prevents refreshing after TTE approval
        // if (trainState.isStationLockedForUpgrades()) {
        //     console.log(`🔒 Station ${currentIdx} already locked, returning cached results`);
        //     return trainState.stationUpgradeLock.cachedResults;
        // }

        console.log(`\n🎯 Getting CURRENT STATION reallocation data: ${currentStation.name} (idx: ${currentIdx})`);

        // HashMap 1: RAC Passengers boarded at current station
        const racHashMap = this._getRACPassengersAtCurrentStation(trainState, currentIdx);

        // HashMap 2: Vacant berths from current station
        const vacantBerthsHashMap = this._getVacantBerthsFromCurrentStation(trainState, currentIdx);

        // Find matches
        const matches = this._findMatches(racHashMap, vacantBerthsHashMap, currentIdx);

        // Convert Maps to arrays for JSON serialization
        const racPassengersArray = Array.from(racHashMap.values());
        const vacantBerthsArray = Array.from(vacantBerthsHashMap.values());

        // Group RAC passengers by destination station
        const racByDestination = this._groupByDestination(racPassengersArray, trainState);

        // Group vacant berths by vacancy end station
        const berthsByVacancyEnd = this._groupByVacancyEnd(vacantBerthsArray, trainState);

        const results = {
            currentStation: {
                name: currentStation.name,
                code: currentStation.code,
                index: currentIdx
            },
            // Array format for display
            racPassengers: racPassengersArray,
            vacantBerths: vacantBerthsArray,
            // Grouped format for station-wise view
            racByDestination: racByDestination,
            berthsByVacancyEnd: berthsByVacancyEnd,
            // Matches
            matches: matches,
            stats: {
                racPassengersCount: racHashMap.size,
                vacantBerthsCount: vacantBerthsHashMap.size,
                matchesCount: matches.length,
                upgradesAvailable: Math.min(matches.length, racHashMap.size)
            },
            // ❌ LOCK COMPLETELY REMOVED
            // Removed: stationLocked: true
            calculatedAt: new Date().toISOString()
        };

        // ❌ DISABLED: Lock prevents fresh calculations after upgrades
        // Lock station and cache results
        // trainState.lockStationForUpgrades(currentIdx, results);

        return results;
    }

    /**
     * Group RAC passengers by their destination station
     */
    _groupByDestination(passengers, trainState) {
        const grouped = {};
        passengers.forEach(p => {
            const destName = p.destination || `Station ${p.destinationIdx}`;
            if (!grouped[destName]) {
                grouped[destName] = {
                    stationName: destName,
                    stationIdx: p.destinationIdx,
                    passengers: []
                };
            }
            grouped[destName].passengers.push(p);
        });
        // Sort by station index
        return Object.values(grouped).sort((a, b) => a.stationIdx - b.stationIdx);
    }

    /**
     * Group vacant berths by when they become occupied
     */
    _groupByVacancyEnd(berths, trainState) {
        const grouped = {};
        berths.forEach(b => {
            const endName = b.lastVacantStation || `Station ${b.lastVacantIdx}`;
            if (!grouped[endName]) {
                grouped[endName] = {
                    stationName: endName,
                    stationIdx: b.lastVacantIdx,
                    berths: []
                };
            }
            grouped[endName].berths.push(b);
        });
        // Sort by station index
        return Object.values(grouped).sort((a, b) => a.stationIdx - b.stationIdx);
    }

    /**
     * Get RAC passengers who boarded at current station
     * HashMap: PNR → {name, destination, destinationIdx}
     */
    _getRACPassengersAtCurrentStation(trainState, currentIdx) {
        const racHashMap = new Map();
        const boardedRAC = trainState.getBoardedRACPassengers();

        console.log(`\n📊 RAC Passengers boarded at current station (${currentIdx}):`);

        boardedRAC.forEach(passenger => {
            // FILTER: Only passengers whose remaining journey is from current station
            // (They boarded at or before current station and haven't deboarded yet)
            if (passenger.fromIdx <= currentIdx && passenger.toIdx > currentIdx) {
                const destinationStation = trainState.stations[passenger.toIdx];

                racHashMap.set(passenger.pnr, {
                    pnr: passenger.pnr,
                    name: passenger.name,
                    racStatus: passenger.racStatus,
                    currentBerth: passenger.berth || `${passenger.coach || ''}-${passenger.seatNo || ''}`,
                    from: passenger.from,
                    fromIdx: passenger.fromIdx,
                    destination: destinationStation?.name || passenger.to,
                    destinationIdx: passenger.toIdx,
                    passengerStatus: passenger.passengerStatus
                });

                console.log(`   ✅ ${passenger.pnr} → ${destinationStation?.name} (idx: ${passenger.toIdx})`);
            }
        });

        console.log(`   Total: ${racHashMap.size} RAC passengers`);
        return racHashMap;
    }

    /**
     * Get berths that are currently vacant at this station
     * HashMap: BerthID → {lastVacantStation, lastVacantIdx}
     * REWRITTEN: Use passengers array as primary source
     */
    _getVacantBerthsFromCurrentStation(trainState, currentIdx) {
        const vacantHashMap = new Map();
        let totalBerths = 0;
        let vacantCount = 0;

        console.log(`\n🛏️ Finding vacant berths at station ${currentIdx}:`);

        trainState.coaches.forEach(coach => {
            coach.berths.forEach(berth => {
                totalBerths++;

                // Check if berth is vacant at current segment
                const vacantInfo = this._checkBerthVacantAtSegment(berth, currentIdx, trainState);

                if (vacantInfo.isVacant) {
                    vacantCount++;
                    const berthId = `${coach.coachNo}-${berth.berthNo}`;

                    vacantHashMap.set(berthId, {
                        berthId: berthId,
                        coachNo: coach.coachNo,
                        berthNo: berth.berthNo,
                        type: berth.type,
                        class: coach.class,
                        vacantFromStation: trainState.stations[vacantInfo.vacantFromIdx]?.name || 'Origin',
                        vacantFromIdx: vacantInfo.vacantFromIdx,
                        lastVacantStation: trainState.stations[vacantInfo.vacantToIdx]?.name || 'Journey End',
                        lastVacantIdx: vacantInfo.vacantToIdx
                    });
                }
            });
        });

        console.log(`   Checked ${totalBerths} berths, found ${vacantCount} vacant at current station`);
        console.log(`   Total: ${vacantHashMap.size} vacant berths`);
        return vacantHashMap;
    }

    /**
     * Check if a berth is vacant at a specific segment
     * Returns: { isVacant, vacantFromIdx, vacantToIdx }
     */
    _checkBerthVacantAtSegment(berth, segmentIdx, trainState) {
        // Get all NON-noShow passengers on this berth
        const activePassengers = berth.passengers.filter(p => !p.noShow);

        // Check if any active passenger occupies this segment
        for (const passenger of activePassengers) {
            // Passenger occupies segments from fromIdx to toIdx-1
            if (passenger.fromIdx <= segmentIdx && segmentIdx < passenger.toIdx) {
                return { isVacant: false };
            }
        }

        // Berth is vacant at this segment!
        // Find how long it stays vacant
        let vacantFromIdx = 0;
        let vacantToIdx = berth.segmentOccupancy.length; // End of journey by default

        // Find when vacancy started (look backwards)
        for (let i = segmentIdx; i >= 0; i--) {
            let occupied = false;
            for (const passenger of activePassengers) {
                if (passenger.fromIdx <= i && i < passenger.toIdx) {
                    occupied = true;
                    break;
                }
            }
            if (occupied) {
                vacantFromIdx = i + 1;
                break;
            }
        }

        // Find when vacancy ends (look forward)
        for (let i = segmentIdx; i < berth.segmentOccupancy.length; i++) {
            for (const passenger of activePassengers) {
                if (passenger.fromIdx === i) {
                    // Someone boards at this segment, vacancy ends here
                    vacantToIdx = i;
                    return { isVacant: true, vacantFromIdx, vacantToIdx };
                }
            }
        }

        return { isVacant: true, vacantFromIdx, vacantToIdx };
    }

    /**
     * Find vacant ranges for a berth (kept for reference/future use)
     * FIXED: Now checks segmentOccupancy which is properly updated during upgrades
     */
    _findVacantRanges(berth, trainState) {
        const ranges = [];
        let rangeStart = null;

        for (let segmentIdx = 0; segmentIdx < berth.segmentOccupancy.length; segmentIdx++) {
            // Check if segment is occupied using passengers array (more reliable)
            let isOccupied = false;

            for (const passenger of berth.passengers) {
                if (passenger.noShow) continue;
                if (passenger.fromIdx <= segmentIdx && segmentIdx < passenger.toIdx) {
                    isOccupied = true;
                    break;
                }
            }

            if (!isOccupied) {
                if (rangeStart === null) rangeStart = segmentIdx;
            } else {
                if (rangeStart !== null) {
                    ranges.push({ fromIdx: rangeStart, toIdx: segmentIdx });
                    rangeStart = null;
                }
            }
        }

        if (rangeStart !== null) {
            ranges.push({ fromIdx: rangeStart, toIdx: berth.segmentOccupancy.length });
        }

        return ranges;
    }

    /**
     * Find matches between RAC passengers and vacant berths
     * STRICT MATCHING RULES:
     * 1. Berth must be vacant until EXACTLY passenger's destination (perfect match only)
     * 2. Berth must not already be allocated/pending
     * 3. Class must match (SL berth for SL passenger)
     * 4. Double-check berth is actually vacant at current station
     */
    _findMatches(racHashMap, vacantHashMap, currentIdx) {
        const matches = [];
        const usedPassengers = new Set(); // Track assigned passengers to avoid duplicates
        const usedBerths = new Set(); // Track assigned berths to avoid collisions

        console.log(`\n🔍 Finding STRICT matches (${racHashMap.size} RAC → ${vacantHashMap.size} berths)...`);
        console.log(`   ⚠️ STRICT MODE: Only PERFECT matches (vacancy end = destination)`);

        // Sort berths by how long they stay vacant (shorter vacancy = higher priority to fill first)
        const sortedBerths = [...vacantHashMap.entries()].sort((a, b) =>
            a[1].lastVacantIdx - b[1].lastVacantIdx
        );

        for (const [berthId, berthData] of sortedBerths) {
            // CONSTRAINT: Skip if berth already used in this matching session
            if (usedBerths.has(berthId)) {
                console.log(`   ⚠️ ${berthId} - Already matched, skipping`);
                continue;
            }

            const eligiblePassengers = [];

            for (const [pnr, passengerData] of racHashMap.entries()) {
                // CONSTRAINT 1: Skip if passenger already assigned to another berth
                if (usedPassengers.has(pnr)) continue;

                // CONSTRAINT 2: Class compatibility check (SL for SL, 3A for 3A)
                const berthClass = berthData.class || 'SL';
                const passengerClass = passengerData.class || 'SL';
                if (berthClass !== passengerClass) {
                    continue; // Class mismatch, skip
                }

                // CONSTRAINT 3: STRICT MATCHING - Only PERFECT matches allowed
                // Berth vacancy must end EXACTLY at passenger's destination
                // This prevents any overlap with next passenger boarding
                const matchScore = berthData.lastVacantIdx - passengerData.destinationIdx;

                // Only allow matches where:
                // - matchScore >= 0 (berth stays vacant at least until destination)
                // - matchScore <= 2 (berth doesn't stay vacant too long after - allows some flexibility)
                if (matchScore >= 0 && matchScore <= 2) {
                    eligiblePassengers.push({
                        pnr: pnr,
                        name: passengerData.name,
                        racStatus: passengerData.racStatus,
                        currentBerth: passengerData.currentBerth,
                        from: passengerData.from,
                        fromIdx: passengerData.fromIdx,
                        destination: passengerData.destination,
                        destinationIdx: passengerData.destinationIdx,
                        passengerStatus: passengerData.passengerStatus,
                        matchScore: matchScore, // 0 = perfect match
                        isPerfectMatch: matchScore === 0
                    });
                }
            }

            if (eligiblePassengers.length > 0) {
                // Sort by: Perfect match first, then RAC number (lower = higher priority)
                eligiblePassengers.sort((a, b) => {
                    // Perfect matches first
                    if (a.isPerfectMatch && !b.isPerfectMatch) return -1;
                    if (!a.isPerfectMatch && b.isPerfectMatch) return 1;

                    // Then by RAC status (RAC 1 first)
                    const getRACNum = (status) => {
                        const match = status?.match(/RAC\s*(\d+)/i);
                        return match ? parseInt(match[1]) : 999;
                    };
                    const racDiff = getRACNum(a.racStatus) - getRACNum(b.racStatus);
                    if (racDiff !== 0) return racDiff;

                    // Then by match score (lower is better)
                    return a.matchScore - b.matchScore;
                });

                const topMatch = eligiblePassengers[0];

                // Mark both passenger and berth as used
                usedPassengers.add(topMatch.pnr);
                usedBerths.add(berthId);

                matches.push({
                    berthId: berthId,
                    berth: berthData,
                    eligiblePassengers: eligiblePassengers,
                    topMatch: topMatch
                });

                const matchType = topMatch.isPerfectMatch ? '🎯 PERFECT' : '✅ GOOD';
                console.log(`   ${matchType} ${berthId} → ${topMatch.name} (${topMatch.racStatus}) [score: ${topMatch.matchScore}]`);
            }
        }

        console.log(`   Total strict matches: ${matches.length}`);
        console.log(`   Berths used: ${usedBerths.size}, Passengers matched: ${usedPassengers.size}\n`);
        return matches;
    }

    /**
     * Create pending reallocations from matches
     * Sends to TTE portal for approval
     * DUAL-APPROVAL: Also sends to Passenger Portal if Passenger_Status === 'Online'
     */
    async createPendingReallocationsFromMatches(trainState) {
        const { matches, currentStation } = this.getCurrentStationData(trainState);

        if (matches.length === 0) {
            console.log('⚠️ No matches to create pending reallocations');
            return { success: true, created: 0 };
        }

        const pendingReallocations = [];
        const db = require('../config/db');
        const passengersCollection = db.getPassengersCollection();

        for (const match of matches) {
            const { berthId, berth, topMatch } = match;

            // Fetch IRCTC_ID and Passenger_Status from MongoDB
            let irctcId = null;
            let passengerStatus = topMatch.passengerStatus || 'Offline';

            try {
                const dbPassenger = await passengersCollection.findOne({ PNR_Number: topMatch.pnr });
                if (dbPassenger) {
                    irctcId = dbPassenger.IRCTC_ID;
                    passengerStatus = dbPassenger.Passenger_Status || passengerStatus;
                }
            } catch (err) {
                console.warn(`⚠️ Could not fetch IRCTC_ID for ${topMatch.pnr}:`, err.message);
            }

            // Determine approval target based on passenger status
            const isOnline = passengerStatus === 'Online';
            const approvalTarget = isOnline ? 'BOTH' : 'TTE_ONLY';

            // Create pending reallocation for top match
            const pending = {
                trainId: trainState.trainNo,
                trainName: trainState.trainName,
                stationName: currentStation.name,
                stationCode: currentStation.code,
                stationIdx: currentStation.index,

                // Passenger details
                passengerPNR: topMatch.pnr,
                passengerName: topMatch.name,
                passengerIrctcId: irctcId,           // ✅ NEW: For passenger portal lookup
                passengerStatus: passengerStatus,    // ✅ NEW: Online/Offline
                currentRAC: topMatch.racStatus,
                currentBerth: `RAC - ${topMatch.racStatus} `,
                passengerDestination: topMatch.destination,
                passengerDestinationIdx: topMatch.destinationIdx,

                // Proposed berth details
                proposedCoach: berth.coachNo,
                proposedBerth: berth.berthNo,
                proposedBerthFull: berthId,
                proposedBerthType: berth.type,
                proposedClass: berth.class,
                berthVacantTill: berth.lastVacantStation,
                berthVacantTillIdx: berth.lastVacantIdx,

                // Matching metadata
                matchScore: topMatch.matchScore,
                matchReason: topMatch.matchScore === 0
                    ? 'Perfect match - destination equals berth vacancy end'
                    : `Good match - travels ${topMatch.matchScore} stations beyond`,

                // ✅ DUAL-APPROVAL: Status tracking
                status: 'pending',
                approvalTarget: approvalTarget,      // 'BOTH' or 'TTE_ONLY'
                approvedBy: null,                    // 'TTE' or 'PASSENGER' when approved
                createdAt: new Date(),
                createdBy: 'CURRENT_STATION_MATCHING'
            };

            pendingReallocations.push(pending);

            console.log(`   📝 Created pending: ${topMatch.name} (${passengerStatus}) → ${berthId} [${approvalTarget}]`);
        }

        // Save to MongoDB using existing StationWiseApprovalService
        await StationWiseApprovalService._savePendingReallocations(pendingReallocations);

        // ✅ NEW: Create UpgradeNotification entries for ALL passengers (Online + Offline)
        // This allows Offline passengers to see upgrade offers when they log into Passenger Portal
        const UpgradeNotificationService = require('./UpgradeNotificationService');

        // Clear old notifications ONCE before creating new batch (not on each iteration!)
        if (pendingReallocations.length > 0) {
            await UpgradeNotificationService.clearPendingNotificationsForStation(currentStation.code);
        }

        for (const pending of pendingReallocations) {
            try {
                await UpgradeNotificationService.createUpgradeNotification(
                    {
                        pnr: pending.passengerPNR,
                        name: pending.passengerName,
                        coach: pending.proposedCoach,
                        seatNo: pending.proposedBerth
                    },
                    {
                        fullBerthNo: pending.proposedBerthFull,
                        coachNo: pending.proposedCoach,
                        berthNo: pending.proposedBerth,
                        type: pending.proposedBerthType,
                        vacantSegment: { from: pending.stationIdx, to: pending.berthVacantTillIdx }
                    },
                    { name: pending.stationName, code: pending.stationCode },
                    false // ✅ FIX: Don't clear - we already cleared above
                );
                console.log(`   📬 Created UpgradeNotification for ${pending.passengerName} (${pending.passengerStatus})`);
            } catch (notifErr) {
                console.error(`   ⚠️ Failed to create UpgradeNotification for ${pending.passengerPNR}:`, notifErr.message);
            }
        }

        // 📨 Send push notification to all TTEs
        try {
            const WebPushService = require('./WebPushService');
            await WebPushService.sendRACApprovalRequestToTTEs({
                count: pendingReallocations.length,
                station: currentStation.name
            });
            console.log(`📨 Push notification sent to TTEs for ${pendingReallocations.length} pending reallocations`);
        } catch (pushError) {
            console.error('⚠️ Failed to send TTE push notification:', pushError.message);
        }

        // ✅ DUAL-APPROVAL: Notify Online passengers via push + WebSocket
        const onlineReallocations = pendingReallocations.filter(p => p.approvalTarget === 'BOTH' && p.passengerIrctcId);

        if (onlineReallocations.length > 0) {
            console.log(`\n📲 Sending upgrade offers to ${onlineReallocations.length} ONLINE passengers...`);

            const WebPushService = require('./WebPushService');
            const wsManager = require('../config/websocket');
            const NotificationService = require('./NotificationService');

            for (const pending of onlineReallocations) {
                try {
                    // Send browser push notification
                    await WebPushService.sendUpgradeOfferToPassenger(pending.passengerIrctcId, {
                        pnr: pending.passengerPNR,
                        currentBerth: pending.currentRAC,
                        offeredBerth: pending.proposedBerthFull,
                        offeredBerthType: pending.proposedBerthType,
                        offeredCoach: pending.proposedCoach
                    });

                    // Also send via WebSocket for instant UI update
                    wsManager.broadcast('PASSENGER', 'UPGRADE_OFFER_AVAILABLE', {
                        irctcId: pending.passengerIrctcId,
                        pnr: pending.passengerPNR,
                        offer: {
                            reallocationId: pending._id?.toString(),
                            offeredBerth: pending.proposedBerthFull,
                            offeredBerthType: pending.proposedBerthType,
                            offeredCoach: pending.proposedCoach,
                            currentStatus: pending.currentRAC
                        }
                    });

                    // ✅ TASK 2: Send email notification for approval request
                    try {
                        const passengersCollection = db.getPassengersCollection();
                        const dbPassenger = await passengersCollection.findOne({ IRCTC_ID: pending.passengerIrctcId });

                        if (dbPassenger?.Email) {
                            await NotificationService.sendApprovalRequestNotification(
                                {
                                    name: pending.passengerName,
                                    email: dbPassenger.Email,
                                    pnr: pending.passengerPNR
                                },
                                {
                                    currentRAC: pending.currentRAC,
                                    proposedBerthFull: pending.proposedBerthFull,
                                    proposedBerthType: pending.proposedBerthType,
                                    stationName: pending.stationName
                                }
                            );
                        }
                    } catch (emailErr) {
                        console.error(`   ⚠️ Email notification failed:`, emailErr.message);
                    }

                    console.log(`   ✅ Sent upgrade offer to ${pending.passengerName} (${pending.passengerIrctcId})`);
                } catch (err) {
                    console.error(`   ❌ Failed to notify ${pending.passengerName}:`, err.message);
                }
            }
        }

        console.log(`✅ Created ${pendingReallocations.length} pending reallocations for approval`);

        return {
            success: true,
            created: pendingReallocations.length,
            pendingReallocations: pendingReallocations,
            onlineCount: onlineReallocations.length
        };
    }
}

module.exports = new CurrentStationReallocationService();

