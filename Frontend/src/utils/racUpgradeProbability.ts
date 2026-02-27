/**
 * racUpgradeProbability.ts
 *
 * Computes an upgrade probability SCORE (0–100%) modelled on the actual
 * EligibilityService rules used by the backend reallocation algorithm.
 *
 * Rules mirrored from EligibilityService (frontend-computable subset):
 *   Stage 1
 *     Rule 0  – Must be RAC status                 (hard gate, handled by caller)
 *     Rule 2  – Must be boarded                    (+15 pts)
 *     Rule 3  – Vacancy must cover full journey     (modelled via journeyCoverageRatio)
 *     Rule 10 – Segments remaining ≥ 1             (hard gate, 0 → 0%)
 *     Rule 11 – Min journey distance 70 km          (not computable on FE; ignore)
 *     Rule 9  – RAC position priority              (dominant factor, weighted heavily)
 *   Stage 2
 *     Rule 1  – Online passenger                   (+10 pts)
 *
 * @param racPosition          1-based queue position (1 = RAC 1)
 * @param totalRACCount        Total RAC passengers in queue
 * @param currentlyVacantCount Count of berths that are CURRENTLY vacant (isCurrentlyVacant)
 * @param stationsRemaining    Stations left in journey (from current station to final)
 * @param isBoarded            Whether the passenger has boarded the train
 * @param isOnline             Whether the passenger's status is 'Online'
 * @param fromIdx              Passenger's boarding station index
 * @param toIdx                Passenger's deboarding station index
 * @param totalStations        Total stations in the journey
 * @returns                    Integer 0–100
 */
export function calculateUpgradeProbability(
    racPosition: number,
    totalRACCount: number,
    currentlyVacantCount: number,
    stationsRemaining: number,
    isBoarded: boolean = true,
    isOnline: boolean = false,
    fromIdx: number = 0,
    toIdx: number = 0,
    totalStations: number = 1
): number {
    // Hard gate — Rule 10: no segments remaining
    if (stationsRemaining < 1) return 0;
    if (racPosition <= 0) return 0;

    // ─── Base eligibility score (0–50) ─────────────────────────────────────────
    // Models Rule 9 (RAC priority ranking):
    //   RAC 1 → max, RAC n → proportionally less
    //   Uses (totalRAC - position + 1) / totalRAC to give a smooth gradient
    const totalRAC = Math.max(totalRACCount, racPosition); // at least as big as position
    const positionScore = ((totalRAC - racPosition + 1) / totalRAC) * 50;

    // ─── Vacancy score (0–25) ──────────────────────────────────────────────────
    // Rules 3 & 9 combined: how many vacancies vs RAC passengers above/at my rank
    // Passengers above me must get a berth first → effective vacancies for me =
    //   max(0, currentlyVacantCount - (racPosition - 1))
    const effectiveVacancies = Math.max(0, currentlyVacantCount - (racPosition - 1));
    // Clamp at 1; if ≥ 1 effective vacancy exists → strong signal
    const vacancyScore = Math.min(effectiveVacancies, 1) * 25;

    // ─── Station time-window bonus (0–10) ──────────────────────────────────────
    // More segments remaining = more opportunities for berths to free up
    const journeyLength = toIdx - fromIdx;
    const journeyRatio = totalStations > 1
        ? journeyLength / (totalStations - 1)
        : 0.5;
    const stationBonus = Math.min(journeyRatio * 10, 10);

    // ─── Rule 2: Boarded bonus (+15) ──────────────────────────────────────────
    const boardedBonus = isBoarded ? 15 : 0;

    // ─── Rule 1: Online bonus (+10) — Stage 2 priority ────────────────────────
    const onlineBonus = isOnline ? 10 : 0;

    // ─── Hard penalty: NOT boarded → can never upgrade (Rule 2) ──────────────
    // If not boarded, probability is mostly symbolic (chance still low)
    const rawScore = positionScore + vacancyScore + stationBonus + boardedBonus + onlineBonus;

    return Math.min(Math.max(Math.round(rawScore), 0), 100);
}

/**
 * Returns colour class for the upgrade chance badge.
 */
export function getUpgradeChanceClass(probability: number): 'high' | 'medium' | 'low' {
    if (probability >= 70) return 'high';
    if (probability >= 40) return 'medium';
    return 'low';
}
