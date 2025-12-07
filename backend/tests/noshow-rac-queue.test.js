/**
 * No-Show and RAC Queue Movement Tests
 * Tests for marking passengers as no-show and RAC queue dynamics
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

const NoShowService = require('../services/reallocation/NoShowService');
const RACQueueService = require('../services/reallocation/RACQueueService');

/**
 * Helper: Create a mock berth with segment occupancy
 */
function createMockBerth(overrides = {}) {
    const numSegments = overrides.numSegments || 5;

    return {
        berthNo: overrides.berthNo || '1',
        berthType: overrides.berthType || 'LB',
        fullBerthNo: overrides.fullBerthNo || 'B1-1-LB',
        segmentOccupancy: overrides.segmentOccupancy || new Array(numSegments).fill(null),
        passengers: overrides.passengers || [],
        status: 'occupied',
        updateStatus: jest.fn(function () {
            // Check if any segment is still occupied
            const hasOccupant = this.segmentOccupancy.some(s => s !== null);
            this.status = hasOccupant ? 'occupied' : 'vacant';
        })
    };
}

/**
 * Helper: Create a mock passenger for no-show testing
 */
function createMockPassenger(overrides = {}) {
    return {
        pnr: overrides.pnr || 'PNR001',
        name: overrides.name || 'Test Passenger',
        pnrStatus: overrides.pnrStatus || 'CNF',
        from: overrides.from || 'STA',
        to: overrides.to || 'STE',
        fromIdx: overrides.fromIdx !== undefined ? overrides.fromIdx : 0,
        toIdx: overrides.toIdx !== undefined ? overrides.toIdx : 4,
        boarded: overrides.boarded !== undefined ? overrides.boarded : false,
        noShow: overrides.noShow || false,
        ...overrides
    };
}

/**
 * Helper: Create a mock train state for no-show testing
 */
function createMockTrainState(options = {}) {
    const stations = options.stations || ['STA', 'STB', 'STC', 'STD', 'STE'];

    // Setup default berth with passenger
    const defaultPassenger = createMockPassenger();
    const defaultBerth = createMockBerth({
        passengers: [defaultPassenger],
        segmentOccupancy: [
            defaultPassenger.pnr,
            defaultPassenger.pnr,
            defaultPassenger.pnr,
            defaultPassenger.pnr,
            null
        ]
    });

    const trainState = {
        stations: stations,
        currentStation: options.currentStation || 'STB',
        currentStationIdx: options.currentStationIdx || 1,

        racQueue: options.racQueue || [],

        coaches: options.coaches || {
            'B1': {
                berths: [defaultBerth]
            }
        },

        stats: options.stats || {
            totalNoShow: 0,
            racNoShow: 0
        },

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

        logEvent: jest.fn()
    };

    return trainState;
}

describe('No-Show Service Tests', () => {

    describe('markNoShow', () => {

        test('should mark passenger as no-show and deallocate berth', async () => {
            const passenger = createMockPassenger({
                pnr: 'PNR001',
                boarded: false,
                fromIdx: 0,
                toIdx: 4
            });

            const berth = createMockBerth({
                passengers: [passenger],
                segmentOccupancy: ['PNR001', 'PNR001', 'PNR001', 'PNR001', null]
            });

            const trainState = createMockTrainState({
                coaches: {
                    'B1': { berths: [berth] }
                }
            });

            const result = await NoShowService.markNoShow(trainState, 'PNR001');

            expect(result.success).toBe(true);
            expect(passenger.noShow).toBe(true);

            // Check that segment occupancy was cleared
            expect(berth.segmentOccupancy[0]).toBe(null);
            expect(berth.segmentOccupancy[1]).toBe(null);
            expect(berth.segmentOccupancy[2]).toBe(null);
            expect(berth.segmentOccupancy[3]).toBe(null);
        });

        test('should NOT mark already boarded passenger as no-show', async () => {
            const passenger = createMockPassenger({
                pnr: 'PNR001',
                boarded: true  // Already boarded
            });

            const berth = createMockBerth({
                passengers: [passenger]
            });

            const trainState = createMockTrainState({
                coaches: {
                    'B1': { berths: [berth] }
                }
            });

            await expect(NoShowService.markNoShow(trainState, 'PNR001'))
                .rejects.toThrow();
        });

        test('should NOT mark passenger twice as no-show', async () => {
            const passenger = createMockPassenger({
                pnr: 'PNR001',
                boarded: false,
                noShow: true  // Already no-show
            });

            const berth = createMockBerth({
                passengers: [passenger]
            });

            const trainState = createMockTrainState({
                coaches: {
                    'B1': { berths: [berth] }
                }
            });

            await expect(NoShowService.markNoShow(trainState, 'PNR001'))
                .rejects.toThrow();
        });

        test('should throw error for non-existent passenger', async () => {
            const trainState = createMockTrainState({
                coaches: {
                    'B1': { berths: [] }
                }
            });

            await expect(NoShowService.markNoShow(trainState, 'NONEXISTENT'))
                .rejects.toThrow();
        });

    });

});

describe('RAC Queue Movement Tests', () => {

    describe('Queue Priority Ordering', () => {

        test('RAC queue should maintain priority order', () => {
            const racQueue = [
                { pnr: 'RAC001', racStatus: 'RAC 1', name: 'First', boarded: true, passengerStatus: 'online' },
                { pnr: 'RAC002', racStatus: 'RAC 2', name: 'Second', boarded: true, passengerStatus: 'online' },
                { pnr: 'RAC003', racStatus: 'RAC 3', name: 'Third', boarded: true, passengerStatus: 'online' }
            ];

            const trainState = { racQueue, getAllPassengers: () => racQueue };

            const grouped = RACQueueService.getRACByPriority(trainState);

            expect(grouped['1']).toBeDefined();
            expect(grouped['1'][0].pnr).toBe('RAC001');
            expect(grouped['2'][0].pnr).toBe('RAC002');
            expect(grouped['3'][0].pnr).toBe('RAC003');
        });

    });

    describe('Queue Movement After No-Show', () => {

        test('removing passenger should update RAC queue', () => {
            const racQueue = [
                { pnr: 'RAC001', racStatus: 'RAC 1', name: 'First' },
                { pnr: 'RAC002', racStatus: 'RAC 2', name: 'Second' },
                { pnr: 'RAC003', racStatus: 'RAC 3', name: 'Third' }
            ];

            const trainState = { racQueue };

            // Remove RAC001 (simulating upgrade or no-show)
            RACQueueService.removeFromRACQueue(trainState, 'RAC001');

            expect(trainState.racQueue.length).toBe(2);
            expect(trainState.racQueue[0].pnr).toBe('RAC002');
            expect(trainState.racQueue[1].pnr).toBe('RAC003');
        });

        test('queue stats should update after removal', () => {
            const racQueue = [
                { pnr: 'RAC001', boarded: true, passengerStatus: 'online' },
                { pnr: 'RAC002', boarded: true, passengerStatus: 'online' },
                { pnr: 'RAC003', boarded: false, passengerStatus: 'offline' }
            ];

            const trainState = { racQueue };

            // Get initial stats
            let stats = RACQueueService.getRACStats(trainState);
            expect(stats.total).toBe(3);
            expect(stats.boarded).toBe(2);

            // Remove one passenger
            RACQueueService.removeFromRACQueue(trainState, 'RAC001');

            // Stats should update
            stats = RACQueueService.getRACStats(trainState);
            expect(stats.total).toBe(2);
            expect(stats.boarded).toBe(1);
        });

    });

    describe('Integrated No-Show and Queue Update', () => {

        test('full no-show scenario: mark no-show -> berth vacant -> queue updated', async () => {
            // Setup: CNF passenger and RAC queue
            const cnfPassenger = createMockPassenger({
                pnr: 'CNF001',
                pnrStatus: 'CNF',
                boarded: false,
                fromIdx: 0,
                toIdx: 4
            });

            const racQueue = [
                { pnr: 'RAC001', racStatus: 'RAC 1', boarded: true, passengerStatus: 'online', fromIdx: 1, toIdx: 4 },
                { pnr: 'RAC002', racStatus: 'RAC 2', boarded: true, passengerStatus: 'online', fromIdx: 0, toIdx: 3 }
            ];

            const berth = createMockBerth({
                passengers: [cnfPassenger],
                segmentOccupancy: ['CNF001', 'CNF001', 'CNF001', 'CNF001', null]
            });

            const trainState = createMockTrainState({
                coaches: {
                    'B1': { berths: [berth] }
                },
                racQueue: racQueue
            });

            // Step 1: Mark CNF as no-show
            const noShowResult = await NoShowService.markNoShow(trainState, 'CNF001');

            expect(noShowResult.success).toBe(true);
            expect(cnfPassenger.noShow).toBe(true);

            // Step 2: Verify berth is now vacant in those segments
            expect(berth.segmentOccupancy.every(s => s === null)).toBe(true);

            // Step 3: RAC queue should still have 2 passengers (ready for upgrade offer)
            expect(trainState.racQueue.length).toBe(2);

            // Step 4: If RAC001 gets upgraded, remove from queue
            RACQueueService.removeFromRACQueue(trainState, 'RAC001');

            // Verify queue movement
            expect(trainState.racQueue.length).toBe(1);
            expect(trainState.racQueue[0].pnr).toBe('RAC002');
        });

    });

});

describe('Edge Cases', () => {

    test('should handle empty RAC queue gracefully', () => {
        const trainState = { racQueue: [] };

        const result = RACQueueService.getRACQueue(trainState);
        const stats = RACQueueService.getRACStats(trainState);

        expect(result).toEqual([]);
        expect(stats.total).toBe(0);
    });

    test('should handle null/undefined trainState properties', () => {
        const trainState = { racQueue: null };

        // Should not throw, should return empty
        expect(() => RACQueueService.getRACQueue(trainState)).not.toThrow();
    });

});
