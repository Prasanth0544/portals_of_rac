/**
 * Reallocation Behavior Tests
 * Tests for RAC passenger reallocation eligibility and allocation logic
 */

// Mock the database module
jest.mock('../config/db', () => ({
    getPassengersCollection: () => ({
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
        findOne: jest.fn().mockResolvedValue(null)
    }),
    getTrainStateCollection: () => ({
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
    })
}));

// Mock websocket
jest.mock('../config/websocket', () => ({
    broadcast: jest.fn(),
    sendToClient: jest.fn()
}));

const EligibilityService = require('../services/reallocation/EligibilityService');
const RACQueueService = require('../services/reallocation/RACQueueService');

/**
 * Helper: Create a mock train state for testing
 */
function createMockTrainState(options = {}) {
    const stations = options.stations || ['STA', 'STB', 'STC', 'STD', 'STE'];

    // Create a simple train state structure
    const trainState = {
        stations: stations,
        currentStation: options.currentStation || 'STB',
        currentStationIdx: options.currentStationIdx || 1,

        // RAC Queue
        racQueue: options.racQueue || [],

        // Coaches with berths
        coaches: options.coaches || {},

        // Helper methods
        findPassenger: function (pnr) {
            for (const coachNo of Object.keys(this.coaches)) {
                const coach = this.coaches[coachNo];
                for (const berth of coach.berths || []) {
                    for (const passenger of berth.passengers || []) {
                        if (passenger.pnr === pnr) {
                            return { passenger, berth, coachNo };
                        }
                    }
                }
            }
            return null;
        },

        getAllPassengers: function () {
            const passengers = [];
            for (const coachNo of Object.keys(this.coaches)) {
                const coach = this.coaches[coachNo];
                for (const berth of coach.berths || []) {
                    passengers.push(...(berth.passengers || []));
                }
            }
            return passengers;
        },

        getBoardedRACPassengers: function () {
            // Return RAC passengers who are boarded
            return this.racQueue.filter(p => p.boarded && !p.noShow);
        },

        getVacantBerths: function () {
            return options.vacantBerths || [];
        },

        logEvent: jest.fn()
    };

    return trainState;
}

/**
 * Helper: Create a mock RAC passenger
 */
function createRACPassenger(overrides = {}) {
    return {
        pnr: overrides.pnr || 'PNR001',
        name: overrides.name || 'Test Passenger',
        pnrStatus: 'RAC',
        racStatus: overrides.racStatus || 'RAC 1',
        passengerStatus: overrides.passengerStatus || 'online',
        boarded: overrides.boarded !== undefined ? overrides.boarded : true,
        from: overrides.from || 'STA',
        to: overrides.to || 'STE',
        fromIdx: overrides.fromIdx !== undefined ? overrides.fromIdx : 0,
        toIdx: overrides.toIdx !== undefined ? overrides.toIdx : 4,
        class: overrides.class || '3A',
        coach: overrides.coach || 'B1',
        seat: overrides.seat || 'RAC1',
        noShow: overrides.noShow || false,
        coPassenger: overrides.coPassenger || null,
        ...overrides
    };
}

/**
 * Helper: Create a mock vacant segment
 */
function createVacantSegment(overrides = {}) {
    return {
        coach: overrides.coach || 'B1',
        berthNo: overrides.berthNo || '1',
        berthType: overrides.berthType || 'LB',
        fullBerthNo: overrides.fullBerthNo || 'B1-1-LB',
        fromIdx: overrides.fromIdx !== undefined ? overrides.fromIdx : 1,
        toIdx: overrides.toIdx !== undefined ? overrides.toIdx : 4,
        class: overrides.class || '3A',
        vacancyId: overrides.vacancyId || 'VAC001',
        ...overrides
    };
}

describe('Reallocation Eligibility Tests', () => {

    describe('Stage 1 Eligibility - Basic Constraints', () => {

        test('RAC passenger with full journey coverage should be eligible', () => {
            // Rule 3 requires vacant segment to FULLY cover passenger's remaining journey
            // RAC passenger: STA -> STD (indices 0 -> 3)
            // Vacant segment: STA -> STE (indices 0 -> 4) - fully covers passenger journey
            // Current station: STB (idx 1)

            const racPassenger = createRACPassenger({
                fromIdx: 0,
                toIdx: 3,  // Journey ends at STD
                boarded: true,
                passengerStatus: 'online'
            });

            const vacantSegment = createVacantSegment({
                fromIdx: 0,
                toIdx: 4  // Vacant all the way to STE - covers full journey
            });

            const trainState = createMockTrainState({
                currentStationIdx: 1,
                racQueue: [racPassenger]
            });

            const result = EligibilityService.checkStage1Eligibility(
                racPassenger,
                vacantSegment,
                1 /* currentStationIdx */,
                trainState
            );

            expect(result.eligible).toBe(true);
        });

        test('RAC passenger without journey overlap should NOT be eligible', () => {
            // RAC passenger: STA -> STB (indices 0 -> 1)
            // Vacant segment: STC -> STE (indices 2 -> 4)
            // No overlap

            const racPassenger = createRACPassenger({
                fromIdx: 0,
                toIdx: 1,  // Already deboarded before vacancy starts
                boarded: true
            });

            const vacantSegment = createVacantSegment({
                fromIdx: 2,
                toIdx: 4
            });

            const trainState = createMockTrainState({
                currentStationIdx: 1,
                racQueue: [racPassenger]
            });

            const result = EligibilityService.checkStage1Eligibility(
                racPassenger,
                vacantSegment,
                1,
                trainState
            );

            expect(result.eligible).toBe(false);
        });

        test('RAC passenger who has not boarded should NOT be eligible', () => {
            const racPassenger = createRACPassenger({
                boarded: false,  // Not yet boarded
                fromIdx: 0,
                toIdx: 4
            });

            const vacantSegment = createVacantSegment({
                fromIdx: 1,
                toIdx: 3
            });

            const trainState = createMockTrainState({
                currentStationIdx: 1,
                racQueue: [racPassenger]
            });

            const result = EligibilityService.checkStage1Eligibility(
                racPassenger,
                vacantSegment,
                1,
                trainState
            );

            expect(result.eligible).toBe(false);
        });

        test('RAC passenger marked as no-show should NOT be eligible', () => {
            const racPassenger = createRACPassenger({
                boarded: true,
                noShow: true,  // Marked as no-show
                fromIdx: 0,
                toIdx: 4
            });

            const vacantSegment = createVacantSegment({
                fromIdx: 1,
                toIdx: 3
            });

            const trainState = createMockTrainState({
                currentStationIdx: 1,
                racQueue: [racPassenger]
            });

            const result = EligibilityService.checkStage1Eligibility(
                racPassenger,
                vacantSegment,
                1,
                trainState
            );

            expect(result.eligible).toBe(false);
        });

    });

    describe('Eligibility Matrix Generation', () => {

        test('checkStage1Eligibility correctly validates multiple passengers', () => {
            // Test that checkStage1Eligibility works correctly for different scenarios
            const vacantSegment = createVacantSegment({
                fromIdx: 0,
                toIdx: 4
            });

            const trainState = createMockTrainState({
                currentStationIdx: 1
            });

            // Test 1: Eligible passenger (boarded, journey overlap, correct class)
            const eligiblePassenger = createRACPassenger({
                pnr: 'RAC001',
                fromIdx: 0,
                toIdx: 4,
                boarded: true
            });

            const result1 = EligibilityService.checkStage1Eligibility(
                eligiblePassenger, vacantSegment, 1, trainState
            );
            expect(result1.eligible).toBe(true);

            // Test 2: Not eligible - not boarded
            const notBoardedPassenger = createRACPassenger({
                pnr: 'RAC002',
                fromIdx: 0,
                toIdx: 4,
                boarded: false
            });

            const result2 = EligibilityService.checkStage1Eligibility(
                notBoardedPassenger, vacantSegment, 1, trainState
            );
            expect(result2.eligible).toBe(false);
            expect(result2.failedRule).toBe('Rule 2');
        });

    });

});

describe('RAC Queue Service Tests', () => {

    describe('getRACQueue', () => {

        test('should return empty array for empty racQueue', () => {
            const trainState = createMockTrainState({ racQueue: [] });

            const result = RACQueueService.getRACQueue(trainState);

            expect(result).toEqual([]);
        });

        test('should return all RAC passengers with details', () => {
            const racQueue = [
                createRACPassenger({ pnr: 'RAC001', name: 'Passenger A' }),
                createRACPassenger({ pnr: 'RAC002', name: 'Passenger B' })
            ];

            const trainState = createMockTrainState({ racQueue });

            const result = RACQueueService.getRACQueue(trainState);

            expect(result.length).toBe(2);
            expect(result[0].pnr).toBe('RAC001');
            expect(result[1].pnr).toBe('RAC002');
        });

    });

    describe('getBoardedOnlineRAC', () => {

        test('should filter only boarded online RAC passengers', () => {
            const passengers = [
                createRACPassenger({ pnr: 'RAC001', boarded: true, passengerStatus: 'online' }),
                createRACPassenger({ pnr: 'RAC002', boarded: true, passengerStatus: 'offline' }),
                createRACPassenger({ pnr: 'RAC003', boarded: false, passengerStatus: 'online' }),
                createRACPassenger({ pnr: 'RAC004', boarded: true, passengerStatus: 'online', noShow: true })
            ];

            const trainState = createMockTrainState({
                coaches: {
                    'B1': {
                        berths: [{ passengers }]
                    }
                }
            });

            const result = RACQueueService.getBoardedOnlineRAC(trainState);

            // Only RAC001 should qualify (boarded + online + not no-show)
            expect(result.length).toBe(1);
            expect(result[0].pnr).toBe('RAC001');
        });

    });

    describe('getRACStats', () => {

        test('should return accurate statistics', () => {
            const racQueue = [
                createRACPassenger({ pnr: 'RAC001', boarded: true, passengerStatus: 'online' }),
                createRACPassenger({ pnr: 'RAC002', boarded: true, passengerStatus: 'offline' }),
                createRACPassenger({ pnr: 'RAC003', boarded: false, passengerStatus: 'online' }),
                createRACPassenger({ pnr: 'RAC004', boarded: true, passengerStatus: 'online', noShow: true })
            ];

            const trainState = createMockTrainState({ racQueue });

            const stats = RACQueueService.getRACStats(trainState);

            expect(stats.total).toBe(4);
            expect(stats.boarded).toBe(3);
            expect(stats.notBoarded).toBe(1);
            expect(stats.noShow).toBe(1);
        });

    });

    describe('addToRACQueue and removeFromRACQueue', () => {

        test('should add passenger to RAC queue', () => {
            const trainState = createMockTrainState({ racQueue: [] });
            const newPassenger = createRACPassenger({ pnr: 'RAC_NEW' });

            const result = RACQueueService.addToRACQueue(trainState, newPassenger);

            expect(result.success).toBe(true);
            expect(trainState.racQueue.length).toBe(1);
        });

        test('should not add duplicate passenger', () => {
            const existingPassenger = createRACPassenger({ pnr: 'RAC001' });
            const trainState = createMockTrainState({ racQueue: [existingPassenger] });

            const result = RACQueueService.addToRACQueue(trainState, existingPassenger);

            expect(result.success).toBe(false);
            expect(trainState.racQueue.length).toBe(1);
        });

        test('should remove passenger from RAC queue', () => {
            const passenger = createRACPassenger({ pnr: 'RAC001' });
            const trainState = createMockTrainState({ racQueue: [passenger] });

            const result = RACQueueService.removeFromRACQueue(trainState, 'RAC001');

            expect(result.success).toBe(true);
            expect(trainState.racQueue.length).toBe(0);
        });

        test('should handle removing non-existent passenger', () => {
            const trainState = createMockTrainState({ racQueue: [] });

            const result = RACQueueService.removeFromRACQueue(trainState, 'NONEXISTENT');

            expect(result.success).toBe(false);
        });

    });

});
