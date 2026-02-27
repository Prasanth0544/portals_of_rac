// backend/services/CrossClassUpgradeService.js
// Voluntary cross-class upgrade: Sleeper RAC → 3A/2A when vacant berth covers full remaining journey
// Pricing: 3A = ₹20/km  |  2A = ₹40/km  (remaining km = deboard_km - current_station_km)

const VacancyService = require('./reallocation/VacancyService');

const UPGRADE_RATES = {
    AC_3_Tier: 20,  // ₹ per km
    AC_2_Tier: 40,  // ₹ per km
};

const CLASS_LABELS = {
    AC_3_Tier: '3-Tier AC (3A)',
    AC_2_Tier: '2nd AC (2A)',
};

class CrossClassUpgradeService {
    /**
     * Get km distance from station at given index
     * Station objects have trainState.stations[i].distance (cumulative km from origin)
     */
    _getKm(stations, idx) {
        const station = stations[idx];
        return station?.distance ?? 0;
    }

    /**
     * Remaining km for a passenger = km(deboard) - km(current)
     */
    _remainingKm(stations, currentIdx, toIdx) {
        return Math.max(0, this._getKm(stations, toIdx) - this._getKm(stations, currentIdx));
    }

    /**
     * Round cost to nearest ₹10
     */
    _roundCost(raw) {
        return Math.round(raw / 10) * 10;
    }

    /**
     * Get all eligible cross-class upgrade pairs:
     * Sleeper RAC passenger ↔ 3A/2A vacant berth covering fromIdx..toIdx
     *
     * A berth "covers" a passenger's journey if the vacant segment's
     * fromIdx <= currentStationIdx AND toIdx >= passenger.toIdx
     *
     * @returns {Array} list of { passenger, berth, targetClass, remainingKm, cost }
     */
    getEligibleUpgrades(trainState) {
        const { stations, racQueue, currentStationIdx } = trainState;
        const currentIdx = currentStationIdx || 0;

        // Only Sleeper RAC passengers — boarded check is optional (if field missing assume true)
        const racPassengers = (racQueue || []).filter(p =>
            p.pnrStatus === 'RAC' &&
            (
                p.class === 'SL' || p.class === 'Sleeper' ||
                p.class === 'sleeper' || p.class === 'sl'
            ) &&
            (p.boarded === true || p.boarded === undefined || p.boarded === null) &&
            !p.noShow
        );

        if (racPassengers.length === 0) return [];

        // Get all vacant berths across 3A and 2A
        const allVacant = VacancyService.getVacantBerths(trainState).filter(v =>
            v.class === 'AC_3_Tier' || v.class === 'AC_2_Tier'
        );

        if (allVacant.length === 0) return [];

        const results = [];

        racPassengers.forEach(passenger => {
            const paxToIdx = passenger.toIdx;

            // Find vacant berths whose segment covers from now until passenger deboard
            const matchingBerths = allVacant.filter(v =>
                v.fromIdx <= currentIdx && v.toIdx >= paxToIdx
            );

            matchingBerths.forEach(berth => {
                const remainingKm = this._remainingKm(stations, currentIdx, paxToIdx);
                const rate = UPGRADE_RATES[berth.class] || 0;
                const cost = this._roundCost(remainingKm * rate);

                results.push({
                    passenger: {
                        pnr: passenger.pnr,
                        name: passenger.name,
                        age: passenger.age,
                        gender: passenger.gender,
                        racStatus: passenger.racStatus,
                        currentCoach: passenger.coach,
                        currentBerth: passenger.berth,
                        from: passenger.from,
                        to: passenger.to,
                        fromIdx: passenger.fromIdx,
                        toIdx: passenger.toIdx,
                        irctcId: passenger.irctcId || passenger.IRCTC_ID,
                    },
                    berth: {
                        fullBerthNo: berth.berth,
                        coach: berth.coach,
                        berthNo: berth.berthNo,
                        type: berth.type,
                        class: berth.class,
                        classLabel: CLASS_LABELS[berth.class],
                        vacantFromIdx: berth.fromIdx,
                        vacantToIdx: berth.toIdx,
                    },
                    targetClass: berth.class,
                    currentStation: stations[currentIdx]?.name || 'Unknown',
                    deboard: passenger.to,
                    remainingKm,
                    ratePerKm: rate,
                    cost,
                    costBreakdown: `${remainingKm} km × ₹${rate}/km = ₹${cost}`,
                });
            });
        });

        // Sort: cheapest first, then by RAC position
        results.sort((a, b) => a.cost - b.cost || 0);
        return results;
    }

    /**
     * Get upgrade options for a specific passenger (for passenger portal)
     * Returns distinct berth options grouped by class
     */
    getUpgradeOptionsForPassenger(trainState, irctcId) {
        const all = this.getEligibleUpgrades(trainState);
        // Normalize for comparison — handle uppercase/lowercase IRCTC IDs
        const normalizedId = (irctcId || '').trim().toUpperCase();
        const myOptions = all.filter(r => {
            const pid = (r.passenger.irctcId || '').trim().toUpperCase();
            return pid === normalizedId;
        });

        // Group by target class for UI display
        const grouped = {};
        myOptions.forEach(opt => {
            if (!grouped[opt.targetClass]) grouped[opt.targetClass] = [];
            grouped[opt.targetClass].push(opt);
        });

        return {
            hasOptions: myOptions.length > 0,
            passengerInfo: myOptions[0]?.passenger || null,
            options: grouped,
            allOptions: myOptions,
        };
    }

    /**
     * Apply cross-class upgrade in memory (trainState) and persist to DB
     * - Removes passenger from SL segmentOccupancy
     * - Puts passenger in target berth's segmentOccupancy for remaining journey
     * - Updates passenger fields in MongoDB
     */
    async applyUpgrade(trainState, pnr, targetCoach, targetBerthNo, db) {
        const currentIdx = trainState.currentStationIdx || 0;

        // Find passenger in racQueue
        const passenger = trainState.racQueue.find(p => p.pnr === pnr);
        if (!passenger) throw new Error(`Passenger ${pnr} not found in RAC queue`);

        // Find original SL berth and remove occupancy
        let originalBerth = null;
        trainState.coaches.forEach(coach => {
            if (coach.class === 'SL' || coach.class === 'Sleeper') {
                coach.berths.forEach(b => {
                    if (b.segmentOccupancy) {
                        for (let i = currentIdx; i < b.segmentOccupancy.length; i++) {
                            const idx2 = b.segmentOccupancy[i].indexOf(pnr);
                            if (idx2 !== -1) {
                                b.segmentOccupancy[i].splice(idx2, 1);
                                originalBerth = b;
                            }
                        }
                    }
                });
            }
        });

        // Find target coach and berth, assign passenger for remaining journey
        const tc = trainState.coaches.find(c => c.coachNo === targetCoach);
        if (!tc) throw new Error(`Coach ${targetCoach} not found`);

        const tb = tc.berths.find(b => b.berthNo === targetBerthNo);
        if (!tb) throw new Error(`Berth ${targetBerthNo} not found in ${targetCoach}`);

        // Occupy from currentIdx to passenger's toIdx
        for (let i = currentIdx; i < passenger.toIdx && i < tb.segmentOccupancy.length; i++) {
            if (!tb.segmentOccupancy[i].includes(pnr)) {
                tb.segmentOccupancy[i].push(pnr);
            }
        }

        // Update in-memory passenger
        const oldCoach = passenger.coach;
        const oldBerth = passenger.berth;
        passenger.coach = targetCoach;
        passenger.berth = `${targetCoach}-${targetBerthNo}`;
        passenger.class = tc.class;
        passenger.pnrStatus = 'CNF';
        passenger.crossClassUpgraded = true;
        passenger.originalCoach = oldCoach;
        passenger.originalBerth = oldBerth;

        // Remove from racQueue
        const queueIdx = trainState.racQueue.findIndex(p => p.pnr === pnr);
        if (queueIdx !== -1) trainState.racQueue.splice(queueIdx, 1);

        // Persist to MongoDB
        if (db) {
            try {
                const passengersCollection = db.getPassengersCollection();
                await passengersCollection.updateOne(
                    { PNR_Number: pnr },
                    {
                        $set: {
                            Assigned_Coach: targetCoach,
                            Assigned_berth: String(targetBerthNo),
                            Class: tc.class,
                            PNR_Status: 'CNF',
                            Cross_Class_Upgraded: true,
                            Original_Coach: oldCoach,
                            Original_Berth: oldBerth,
                            Upgrade_Timestamp: new Date().toISOString(),
                        }
                    }
                );
            } catch (dbErr) {
                console.error('DB update failed for cross-class upgrade:', dbErr);
            }
        }

        return {
            success: true,
            pnr,
            from: { coach: oldCoach, berth: oldBerth, class: 'Sleeper' },
            to: { coach: targetCoach, berth: `${targetCoach}-${targetBerthNo}`, class: tc.class },
        };
    }
}

module.exports = new CrossClassUpgradeService();
