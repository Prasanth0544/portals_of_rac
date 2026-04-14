/**
 * StationWiseApprovalService Tests - Comprehensive Coverage
 * Tests for TTE approval workflow and station-wise RAC reallocations
 */

const StationWiseApprovalService = require('../../services/StationWiseApprovalService');
const EligibilityService = require('../../services/reallocation/EligibilityService');
const VacancyService = require('../../services/reallocation/VacancyService');
const AllocationService = require('../../services/reallocation/AllocationService');
const CacheService = require('../../services/CacheService');
const db = require('../../config/db');
const wsManager = require('../../config/websocket');

jest.mock('../../services/reallocation/EligibilityService');
jest.mock('../../services/reallocation/VacancyService');
jest.mock('../../services/reallocation/AllocationService');
jest.mock('../../services/CacheService');
jest.mock('../../config/db');
jest.mock('../../config/websocket');

describe('StationWiseApprovalService - Comprehensive Tests', () => {
    let mockTrainState;
    let mockDatabase;
    let mockCollection;

    beforeEach(() => {
        jest.clearAllMocks();

        mockCollection = {
            find: jest.fn(() => ({
                sort: jest.fn(() => ({
                    toArray: jest.fn().mockResolvedValue([])
                }))
            })),
            findOne: jest.fn(),
            insertMany: jest.fn(),
            deleteMany: jest.fn(),
            updateOne: jest.fn()
        };

        mockDatabase = {
            collection: jest.fn(() => mockCollection)
        };

        db.getPassengersCollection = jest.fn(() => ({
            s: { db: mockDatabase }
        }));

        wsManager.sendToTTEs = jest.fn();
        wsManager.sendToUser = jest.fn();

        mockTrainState = {
            trainNo: '17225',
            currentStationIdx: 1,
            stations: [
                { idx: 0, code: 'STA', name: 'Station A' },
                { idx: 1, code: 'STB', name: 'Station B' },
                { idx: 2, code: 'STC', name: 'Station C' }
            ],
            getCurrentStation: jest.fn(() => ({ idx: 1, code: 'STB', name: 'Station B' })),
            getBoardedRACPassengers: jest.fn(() => [])
        };
    });

    describe('createPendingReallocations', () => {
        it('should return zero if no vacant berths', async () => {
            const result = await StationWiseApprovalService.createPendingReallocations(mockTrainState, []);

            expect(result.count).toBe(0);
            expect(result.pending).toEqual([]);
        });

        it('should create pending reallocations successfully', async () => {
            const vacantBerths = [{
                berth: {
                    fullBerthNo: 'S1-15',
                    berthNo: '15',
                    coachNo: 'S1',
                    type: 'Lower',
                    segmentOccupancy: [null, null, null]
                },
                coachNo: 'S1',
                class: 'SL'
            }];

            const mockRAC = {
                pnr: 'R001',
                name: 'John Doe',
                racStatus: 'RAC 1',
                from: 'STA',
                to: 'STC',
                fromIdx: 0,
                toIdx: 2,
                coach: 'S1',
                seat: '72'
            };

            mockTrainState.getBoardedRACPassengers.mockReturnValue([mockRAC]);
            EligibilityService.checkStage1Eligibility.mockReturnValue({ eligible: true });
            EligibilityService.checkStage2Eligibility.mockReturnValue({ eligible: true });

            mockCollection.deleteMany.mockResolvedValue({ deletedCount: 0 });
            mockCollection.insertMany.mockResolvedValue({ insertedCount: 1 });

            const result = await StationWiseApprovalService.createPendingReallocations(
                mockTrainState,
                vacantBerths
            );

            expect(result.count).toBe(1);
            expect(result.pending).toHaveLength(1);
            expect(result.pending[0].passengerPNR).toBe('R001');
            expect(wsManager.sendToTTEs).toHaveBeenCalled();
        });

        it('should skip if no eligible passengers', async () => {
            const vacantBerths = [{
                berth: {
                    segmentOccupancy: [null, null, null],
                    fullBerthNo: 'S1-15',
                    berthNo: '15',
                    coachNo: 'S1',
                    type: 'Lower'
                },
                coachNo: 'S1',
                class: 'SL'
            }];

            mockTrainState.getBoardedRACPassengers.mockReturnValue([]);

            const result = await StationWiseApprovalService.createPendingReallocations(
                mockTrainState,
                vacantBerths
            );

            expect(result.count).toBe(0);
        });

        it('should handle errors gracefully', async () => {
            mockTrainState.getCurrentStation.mockImplementation(() => {
                throw new Error('Database error');
            });

            const result = await StationWiseApprovalService.createPendingReallocations(
                mockTrainState,
                []
            );

            expect(result.count).toBe(0);
        });

        it('should return zero when vacant berths produce no vacant segments', async () => {
            const occupiedBerths = [{
                berth: {
                    segmentOccupancy: [['P1'], ['P2'], ['P3']],
                    fullBerthNo: 'S1-15',
                    berthNo: '15',
                    coachNo: 'S1',
                    type: 'Lower'
                },
                coachNo: 'S1',
                class: 'SL'
            }];

            const result = await StationWiseApprovalService.createPendingReallocations(
                mockTrainState,
                occupiedBerths
            );

            expect(result).toEqual({ count: 0, pending: [] });
        });
    });

    describe('getPendingReallocations', () => {
        it('should get pending reallocations for specific train', async () => {
            const mockPending = [
                { _id: '1', trainId: '17225', status: 'pending' },
                { _id: '2', trainId: '17225', status: 'pending' }
            ];

            const toArrayMock = jest.fn().mockResolvedValue(mockPending);
            const sortMock = jest.fn(() => ({ toArray: toArrayMock }));
            mockCollection.find = jest.fn(() => ({ sort: sortMock }));

            const result = await StationWiseApprovalService.getPendingReallocations('17225');

            expect(result).toHaveLength(2);
            expect(mockCollection.find).toHaveBeenCalledWith({ status: 'pending', trainId: '17225' });
        });

        it('should get all pending reallocations if no trainId', async () => {
            const toArrayMock = jest.fn().mockResolvedValue([]);
            const sortMock = jest.fn(() => ({ toArray: toArrayMock }));
            mockCollection.find = jest.fn(() => ({ sort: sortMock }));

            await StationWiseApprovalService.getPendingReallocations();

            expect(mockCollection.find).toHaveBeenCalledWith({ status: 'pending' });
        });

        it('should return empty array on error', async () => {
            const toArrayMock = jest.fn().mockRejectedValue(new Error('DB error'));
            const sortMock = jest.fn(() => ({ toArray: toArrayMock }));
            mockCollection.find = jest.fn(() => ({ sort: sortMock }));

            const result = await StationWiseApprovalService.getPendingReallocations('17225');

            expect(result).toEqual([]);
        });
    });

    describe('approveBatch', () => {
        it('should approve batch of reallocations', async () => {
            const reallocationIds = ['id1', 'id2'];
            const mockPending = {
                _id: 'id1',
                status: 'pending',
                passengerPNR: 'P001',
                passengerName: 'John',
                proposedCoach: 'S1',
                proposedBerth: '15',
                proposedBerthFull: 'S1-15'
            };

            mockCollection.findOne.mockResolvedValue(mockPending);
            AllocationService.applyReallocation.mockResolvedValue({ success: true });
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await StationWiseApprovalService.approveBatch(
                reallocationIds,
                'TTE123',
                mockTrainState
            );

            expect(result.success).toBe(true);
            expect(result.totalProcessed).toBe(2);
        });

        it('should skip non-pending reallocations', async () => {
            const reallocationIds = ['507f1f77bcf86cd799439011'];
            mockCollection.findOne.mockResolvedValue({ status: 'approved' });

            const result = await StationWiseApprovalService.approveBatch(
                reallocationIds,
                'TTE123',
                mockTrainState
            );

            expect(result.totalApproved).toBe(0);
        });

        it('should handle allocation failures', async () => {
            const reallocationIds = ['id1'];
            const mockPending = {
                status: 'pending',
                passengerPNR: 'P001',
                proposedCoach: 'S1',
                proposedBerth: '15'
            };

            mockCollection.findOne.mockResolvedValue(mockPending);
            AllocationService.applyReallocation.mockResolvedValue({ success: false });

            const result = await StationWiseApprovalService.approveBatch(
                reallocationIds,
                'TTE123',
                mockTrainState
            );

            expect(result.totalApproved).toBe(0);
        });

        it('should include per-id failure when findOne throws inside loop', async () => {
            const reallocationIds = ['507f1f77bcf86cd799439011'];
            mockCollection.findOne.mockRejectedValue(new Error('find fail'));

            const result = await StationWiseApprovalService.approveBatch(
                reallocationIds,
                'TTE123',
                mockTrainState
            );

            expect(result.success).toBe(true);
            expect(result.results[0]).toEqual(
                expect.objectContaining({ id: '507f1f77bcf86cd799439011', success: false, error: 'find fail' })
            );
        });

        it('should throw when outer approveBatch setup fails', async () => {
            db.getPassengersCollection.mockImplementation(() => {
                throw new Error('db access fail');
            });

            await expect(
                StationWiseApprovalService.approveBatch(['id1'], 'TTE123', mockTrainState)
            ).rejects.toThrow('db access fail');
        });

        it('should execute full approve path for valid object id', async () => {
            const validId = '507f1f77bcf86cd799439011';
            const mockPending = {
                _id: validId,
                status: 'pending',
                passengerPNR: 'P001',
                passengerName: 'John',
                proposedCoach: 'S1',
                proposedBerth: '15',
                proposedBerthFull: 'S1-15'
            };
            mockCollection.findOne.mockResolvedValue(mockPending);
            AllocationService.applyReallocation.mockResolvedValue({ success: true });
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
            const WebPushService = require('../../services/WebPushService');
            WebPushService.sendApprovalNotificationToAdmins = jest.fn().mockResolvedValue(true);

            const result = await StationWiseApprovalService.approveBatch([validId], 'TTE123', mockTrainState);
            expect(result.totalApproved).toBe(1);
            expect(WebPushService.sendApprovalNotificationToAdmins).toHaveBeenCalled();
        });

        it('should continue approval when admin push send fails', async () => {
            const validId = '507f1f77bcf86cd799439011';
            const mockPending = {
                _id: validId,
                status: 'pending',
                passengerPNR: 'P001',
                passengerName: 'John',
                proposedCoach: 'S1',
                proposedBerth: '15',
                proposedBerthFull: 'S1-15'
            };
            mockCollection.findOne.mockResolvedValue(mockPending);
            AllocationService.applyReallocation.mockResolvedValue({ success: true });
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
            const WebPushService = require('../../services/WebPushService');
            WebPushService.sendApprovalNotificationToAdmins = jest.fn().mockRejectedValue(new Error('admin push fail'));

            const result = await StationWiseApprovalService.approveBatch([validId], 'TTE123', mockTrainState);
            expect(result.totalApproved).toBe(1);
        });
    });

    describe('rejectReallocation', () => {
        it('should reject reallocation successfully', async () => {
            const validId = '507f1f77bcf86cd799439011';
            const mockPending = {
                _id: validId,
                passengerPNR: 'P001',
                proposedBerthFull: 'S1-15'
            };

            mockCollection.findOne.mockResolvedValue(mockPending);
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await StationWiseApprovalService.rejectReallocation(
                validId,
                'Not suitable',
                'TTE123'
            );

            expect(result.success).toBe(true);
            expect(mockCollection.updateOne).toHaveBeenCalled();
        });

        it('should return failure if not found', async () => {
            const validId = '507f1f77bcf86cd799439011';
            mockCollection.findOne.mockResolvedValue(null);
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 0 });

            const result = await StationWiseApprovalService.rejectReallocation(
                validId,
                'Reason',
                'TTE123'
            );

            expect(result.success).toBe(false);
        });

        it('should send notifications on rejection', async () => {
            const validId = '507f1f77bcf86cd799439011';
            const mockPending = {
                passengerIrctcId: 'IR123',
                passengerPNR: 'P001',
                proposedBerthFull: 'S1-15'
            };

            mockCollection.findOne.mockResolvedValue(mockPending);
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const WebPushService = require('../../services/WebPushService');
            WebPushService.sendPushNotification = jest.fn().mockResolvedValue(true);

            await StationWiseApprovalService.rejectReallocation(validId, 'Test', 'TTE123');

            expect(wsManager.sendToUser).toHaveBeenCalled();
            expect(WebPushService.sendPushNotification).toHaveBeenCalled();
        });

        it('should return success even if rejection push fails', async () => {
            const validId = '507f1f77bcf86cd799439011';
            mockCollection.findOne.mockResolvedValue({
                passengerIrctcId: 'IR123',
                passengerPNR: 'P001',
                proposedBerthFull: 'S1-15'
            });
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
            const WebPushService = require('../../services/WebPushService');
            WebPushService.sendPushNotification = jest.fn().mockRejectedValue(new Error('push fail'));

            const result = await StationWiseApprovalService.rejectReallocation(validId, 'Reason', 'TTE123');
            expect(result).toEqual({ success: true, message: 'Reallocation rejected' });
        });

        it('should continue rejection when websocket send fails', async () => {
            const validId = '507f1f77bcf86cd799439011';
            mockCollection.findOne.mockResolvedValue({
                passengerIrctcId: 'IR123',
                passengerPNR: 'P001',
                proposedBerthFull: 'S1-15'
            });
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
            const WebPushService = require('../../services/WebPushService');
            WebPushService.sendPushNotification = jest.fn().mockResolvedValue(true);
            wsManager.sendToUser.mockImplementation(() => {
                throw new Error('ws fail');
            });

            const result = await StationWiseApprovalService.rejectReallocation(validId, 'Reason', 'TTE123');
            expect(result).toEqual({ success: true, message: 'Reallocation rejected' });
        });

        it('should throw when rejectReallocation outer flow fails', async () => {
            db.getPassengersCollection.mockImplementation(() => {
                throw new Error('reject fail');
            });
            await expect(
                StationWiseApprovalService.rejectReallocation('507f1f77bcf86cd799439011', 'Reason', 'TTE123')
            ).rejects.toThrow('reject fail');
        });
    });

    describe('getStationWiseData', () => {
        it('should return cached data if available', async () => {
            const cachedData = { boardedRAC: [], vacantBerths: [] };
            CacheService.getReallocation.mockReturnValue(cachedData);

            const result = await StationWiseApprovalService.getStationWiseData(mockTrainState);

            expect(result).toEqual(cachedData);
            expect(CacheService.getReallocation).toHaveBeenCalled();
        });

        it('should fetch and cache station-wise data', async () => {
            CacheService.getReallocation.mockReturnValue(null);
            mockTrainState.getBoardedRACPassengers.mockReturnValue([
                { pnr: 'R001', name: 'RAC1', racStatus: 'RAC 1', from: 'STA', to: 'STC', coach: 'S1', seat: '72' }
            ]);
            VacancyService.getVacantBerths.mockReturnValue([
                { berth: 'S1-15', coach: 'S1', fromIdx: 1 }
            ]);

            const toArrayMock = jest.fn().mockResolvedValue([]);
            const sortMock = jest.fn(() => ({ toArray: toArrayMock }));
            mockCollection.find = jest.fn(() => ({ sort: sortMock }));

            const result = await StationWiseApprovalService.getStationWiseData(mockTrainState);

            expect(result.boardedRAC).toHaveLength(1);
            expect(result.vacantBerths).toHaveLength(1);
            expect(CacheService.setReallocation).toHaveBeenCalled();
        });

        it('should throw error on failure', async () => {
            CacheService.getReallocation.mockReturnValue(null);
            mockTrainState.getBoardedRACPassengers.mockImplementation(() => {
                throw new Error('State error');
            });

            await expect(StationWiseApprovalService.getStationWiseData(mockTrainState))
                .rejects.toThrow('State error');
        });
    });

    describe('_getEligiblePassengersForSegment', () => {
        it('should return eligible passengers sorted by RAC priority', () => {
            const vacantSegment = { fromIdx: 0, toIdx: 2 };
            const mockRAC = [
                { pnr: 'R002', racStatus: 'RAC 2' },
                { pnr: 'R001', racStatus: 'RAC 1' }
            ];

            mockTrainState.getBoardedRACPassengers.mockReturnValue(mockRAC);
            EligibilityService.checkStage1Eligibility.mockReturnValue({ eligible: true });
            EligibilityService.checkStage2Eligibility.mockReturnValue({ eligible: true });

            const result = StationWiseApprovalService._getEligiblePassengersForSegment(
                vacantSegment,
                1,
                mockTrainState
            );

            expect(result.length).toBe(2);
            expect(result[0].pnr).toBe('R001');
        });

        it('should filter out ineligible passengers', () => {
            const vacantSegment = { fromIdx: 0, toIdx: 2 };
            const mockRAC = [{ pnr: 'R001', racStatus: 'RAC 1' }];

            mockTrainState.getBoardedRACPassengers.mockReturnValue(mockRAC);
            EligibilityService.checkStage1Eligibility.mockReturnValue({ eligible: false });

            const result = StationWiseApprovalService._getEligiblePassengersForSegment(
                vacantSegment,
                1,
                mockTrainState
            );

            expect(result).toEqual([]);
        });

        it('should handle errors and return empty array', () => {
            const vacantSegment = { fromIdx: 0, toIdx: 2 };
            mockTrainState.getBoardedRACPassengers.mockImplementation(() => {
                throw new Error('Error');
            });

            const result = StationWiseApprovalService._getEligiblePassengersForSegment(
                vacantSegment,
                1,
                mockTrainState
            );

            expect(result).toEqual([]);
        });
    });

    describe('_calculateEligibilityScore', () => {
        it('should calculate score based on RAC number and overlap', () => {
            const passenger = {
                racStatus: 'RAC 1',
                fromIdx: 0,
                toIdx: 3
            };
            const vacantSegment = {
                fromIdx: 1,
                toIdx: 4
            };

            const score = StationWiseApprovalService._calculateEligibilityScore(passenger, vacantSegment);

            expect(score).toBeGreaterThan(0);
        });

        it('should prioritize lower RAC numbers', () => {
            const rac1 = { racStatus: 'RAC 1', fromIdx: 0, toIdx: 2 };
            const rac2 = { racStatus: 'RAC 2', fromIdx: 0, toIdx: 2 };
            const segment = { fromIdx: 0, toIdx: 2 };

            const score1 = StationWiseApprovalService._calculateEligibilityScore(rac1, segment);
            const score2 = StationWiseApprovalService._calculateEligibilityScore(rac2, segment);

            expect(score1).toBeGreaterThan(score2);
        });
    });

    describe('_getVacantSegmentRangesForBerth', () => {
        it('should identify vacant segment ranges', () => {
            const berth = {
                segmentOccupancy: [null, null, ['P001'], null],
                fullBerthNo: 'S1-15'
            };
            const coach = { coachNo: 'S1', class: 'SL' };

            const ranges = StationWiseApprovalService._getVacantSegmentRangesForBerth(
                berth,
                mockTrainState.stations,
                coach
            );

            expect(ranges.length).toBeGreaterThan(0);
        });

        it('should handle fully occupied berth', () => {
            const berth = {
                segmentOccupancy: [['P001'], ['P002'], ['P003']]
            };
            const coach = { coachNo: 'S1', class: 'SL' };

            const ranges = StationWiseApprovalService._getVacantSegmentRangesForBerth(
                berth,
                mockTrainState.stations,
                coach
            );

            expect(ranges).toEqual([]);
        });

        it('should handle vacant range at end', () => {
            const berth = {
                segmentOccupancy: [['P001'], null, null]
            };
            const coach = { coachNo: 'S1', class: 'SL' };

            const ranges = StationWiseApprovalService._getVacantSegmentRangesForBerth(
                berth,
                mockTrainState.stations,
                coach
            );

            expect(ranges.length).toBe(1);
            expect(ranges[0].fromIdx).toBe(1);
        });
    });

    describe('_savePendingReallocations', () => {
        it('should return zeros when there is nothing to save', async () => {
            const result = await StationWiseApprovalService._savePendingReallocations([]);
            expect(result).toEqual({ insertedCount: 0, deletedCount: 0 });
        });

        it('should throw when mongo persistence fails', async () => {
            mockCollection.deleteMany.mockRejectedValue(new Error('save-fail'));
            await expect(
                StationWiseApprovalService._savePendingReallocations([{ trainId: '17225', status: 'pending' }])
            ).rejects.toThrow('save-fail');
        });
    });
});
