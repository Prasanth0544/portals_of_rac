/**
 * ReallocationService Tests - Comprehensive Coverage
 * Tests for RAC reallocation orchestration and vacancy processing
 */

const ReallocationService = require('../../services/ReallocationService');
const NoShowService = require('../../services/reallocation/NoShowService');
const VacancyService = require('../../services/reallocation/VacancyService');
const EligibilityService = require('../../services/reallocation/EligibilityService');
const RACQueueService = require('../../services/reallocation/RACQueueService');
const AllocationService = require('../../services/reallocation/AllocationService');
const UpgradeNotificationService = require('../../services/UpgradeNotificationService');
const InAppNotificationService = require('../../services/InAppNotificationService');
const WebPushService = require('../../services/WebPushService');
const wsManager = require('../../config/websocket');

jest.mock('../../services/reallocation/NoShowService');
jest.mock('../../services/reallocation/VacancyService');
jest.mock('../../services/reallocation/EligibilityService');
jest.mock('../../services/reallocation/RACQueueService');
jest.mock('../../services/reallocation/AllocationService');
jest.mock('../../services/UpgradeNotificationService');
jest.mock('../../services/InAppNotificationService');
jest.mock('../../services/WebPushService');
jest.mock('../../config/websocket');

describe('ReallocationService - Comprehensive Tests', () => {
    let mockTrainState;

    beforeEach(() => {
        jest.clearAllMocks();

        mockTrainState = {
            trainNo: '17225',
            racQueue: [],
            currentStationIdx: 1
        };
    });

    describe('markNoShow', () => {
        it('should delegate to NoShowService', async () => {
            NoShowService.markNoShow.mockResolvedValue({ success: true });

            const result = await ReallocationService.markNoShow(mockTrainState, 'P001');

            expect(NoShowService.markNoShow).toHaveBeenCalledWith(mockTrainState, 'P001');
            expect(result.success).toBe(true);
        });

        it('should handle errors from NoShowService', async () => {
            NoShowService.markNoShow.mockRejectedValue(new Error('Service error'));

            await expect(ReallocationService.markNoShow(mockTrainState, 'P001'))
                .rejects.toThrow('Service error');
        });
    });

    describe('getRACQueue', () => {
        it('should delegate to RACQueueService', () => {
            const mockQueue = [{ pnr: 'R001', name: 'RAC1' }];
            RACQueueService.getRACQueue.mockReturnValue(mockQueue);

            const result = ReallocationService.getRACQueue(mockTrainState);

            expect(RACQueueService.getRACQueue).toHaveBeenCalledWith(mockTrainState);
            expect(result).toEqual(mockQueue);
        });
    });

    describe('getVacantBerths', () => {
        it('should delegate to VacancyService', () => {
            const mockVacant = [{ berth: 'S1-15', coach: 'S1' }];
            VacancyService.getVacantBerths.mockReturnValue(mockVacant);

            const result = ReallocationService.getVacantBerths(mockTrainState);

            expect(VacancyService.getVacantBerths).toHaveBeenCalledWith(mockTrainState);
            expect(result).toEqual(mockVacant);
        });
    });

    describe('searchPassenger', () => {
        it('should delegate to RACQueueService', () => {
            const mockPassenger = { pnr: 'P001', name: 'John' };
            RACQueueService.searchPassenger.mockReturnValue(mockPassenger);

            const result = ReallocationService.searchPassenger(mockTrainState, 'P001');

            expect(RACQueueService.searchPassenger).toHaveBeenCalledWith(mockTrainState, 'P001');
            expect(result).toEqual(mockPassenger);
        });
    });


    describe('calculateJourneyDistance', () => {
        it('should delegate to EligibilityService', () => {
            EligibilityService.calculateJourneyDistance.mockReturnValue(500);

            const result = ReallocationService.calculateJourneyDistance('STA', 'STC', mockTrainState);

            expect(EligibilityService.calculateJourneyDistance).toHaveBeenCalledWith('STA', 'STC', mockTrainState);
            expect(result).toBe(500);
        });
    });

    describe('checkConflictingCNFPassenger', () => {
        it('should delegate to EligibilityService', () => {
            const vacantSegment = { fromIdx: 0, toIdx: 2 };
            EligibilityService.checkConflictingCNFPassenger.mockReturnValue(null);

            const result = ReallocationService.checkConflictingCNFPassenger(vacantSegment, mockTrainState);

            expect(EligibilityService.checkConflictingCNFPassenger).toHaveBeenCalledWith(vacantSegment, mockTrainState);
            expect(result).toBeNull();
        });
    });

    describe('eligibility wrappers', () => {
        it('delegates isEligibleForSegment', () => {
            const racPassenger = { pnr: 'R001' };
            const vacantSegment = { coachNo: 'S1' };
            EligibilityService.isEligibleForSegment = jest.fn().mockReturnValue(true);

            const result = ReallocationService.isEligibleForSegment(
                racPassenger,
                vacantSegment,
                mockTrainState,
                1
            );

            expect(EligibilityService.isEligibleForSegment).toHaveBeenCalledWith(
                racPassenger,
                vacantSegment,
                mockTrainState,
                1
            );
            expect(result).toBe(true);
        });

        it('delegates getEligibleRACForVacantSegment', () => {
            const segment = { coachNo: 'S1', berthNo: 10 };
            const eligible = [{ pnr: 'R001' }];
            EligibilityService.getEligibleRACForVacantSegment = jest.fn().mockReturnValue(eligible);

            const result = ReallocationService.getEligibleRACForVacantSegment(mockTrainState, segment, 1);
            expect(result).toEqual(eligible);
        });
    });

    describe('findCoPassenger', () => {
        it('should delegate to EligibilityService', () => {
            const racPassenger = { pnr: 'R001' };
            const coPassenger = { pnr: 'R002' };
            EligibilityService.findCoPassenger.mockReturnValue(coPassenger);

            const result = ReallocationService.findCoPassenger(racPassenger, mockTrainState);

            expect(EligibilityService.findCoPassenger).toHaveBeenCalledWith(racPassenger, mockTrainState);
            expect(result).toEqual(coPassenger);
        });
    });


    describe('applyReallocation', () => {
        it('should delegate to AllocationService', async () => {
            const allocations = [{ pnr: 'R001', coach: 'S1', berth: '15' }];
            AllocationService.applyReallocation.mockResolvedValue({ success: true });

            const result = await ReallocationService.applyReallocation(mockTrainState, allocations);

            expect(AllocationService.applyReallocation).toHaveBeenCalledWith(mockTrainState, allocations);
            expect(result.success).toBe(true);
        });
    });

    describe('upgradeRACPassengerWithCoPassenger', () => {
        it('should delegate to AllocationService', async () => {
            const newBerthDetails = { coachNo: 'S1', berthNo: '15' };
            AllocationService.upgradeRACPassengerWithCoPassenger.mockResolvedValue({ success: true });

            const result = await ReallocationService.upgradeRACPassengerWithCoPassenger(
                'R001',
                newBerthDetails,
                mockTrainState
            );

            expect(AllocationService.upgradeRACPassengerWithCoPassenger).toHaveBeenCalledWith(
                'R001',
                newBerthDetails,
                mockTrainState
            );
            expect(result.success).toBe(true);
        });
    });

    describe('processVacancyForUpgrade', () => {
        it('should process vacancy and create upgrade offers', async () => {
            const vacantBerthInfo = {
                fullBerthNo: 'S1-15',
                coachNo: 'S1',
                type: 'Lower'
            };
            const currentStation = { name: 'Station B', code: 'STB' };

            mockTrainState.racQueue = [
                { pnr: 'R001', name: 'RAC1', boarded: true, passengerStatus: 'Online', irctcId: 'IR001' },
                { pnr: 'R002', name: 'RAC2', boarded: true, passengerStatus: 'Online', irctcId: 'IR002' }
            ];

            UpgradeNotificationService.hasDeniedBerth.mockResolvedValue(false);
            UpgradeNotificationService.createUpgradeNotification.mockResolvedValue({ id: 'N001' });
            InAppNotificationService.createNotification.mockResolvedValue({ success: true });
            WebPushService.sendPushNotification.mockResolvedValue({ success: true });

            const result = await ReallocationService.processVacancyForUpgrade(
                mockTrainState,
                vacantBerthInfo,
                currentStation
            );

            expect(result.offersCreated).toBe(2);
            expect(UpgradeNotificationService.createUpgradeNotification).toHaveBeenCalledTimes(2);
            expect(InAppNotificationService.createNotification).toHaveBeenCalledTimes(2);
        });

        it('should return error if trainState is null', async () => {
            const vacantBerthInfo = { fullBerthNo: 'S1-15' };
            const currentStation = { name: 'Station B', code: 'STB' };

            const result = await ReallocationService.processVacancyForUpgrade(
                null,
                vacantBerthInfo,
                currentStation
            );

            expect(result.error).toBe('Train state not initialized');
            expect(result.offersCreated).toBe(0);
        });

        it('should return error if vacantBerthInfo is invalid', async () => {
            const currentStation = { name: 'Station B', code: 'STB' };

            const result = await ReallocationService.processVacancyForUpgrade(
                mockTrainState,
                null,
                currentStation
            );

            expect(result.error).toBe('Invalid vacant berth information');
            expect(result.offersCreated).toBe(0);
        });

        it('should return error if currentStation is null', async () => {
            const vacantBerthInfo = { fullBerthNo: 'S1-15' };

            const result = await ReallocationService.processVacancyForUpgrade(
                mockTrainState,
                vacantBerthInfo,
                null
            );

            expect(result.error).toBe('Current station not provided');
            expect(result.offersCreated).toBe(0);
        });

        it('should skip non-boarded passengers', async () => {
            const vacantBerthInfo = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };
            const currentStation = { name: 'Station B', code: 'STB' };

            mockTrainState.racQueue = [
                { pnr: 'R001', name: 'RAC1', boarded: false, passengerStatus: 'Online' }
            ];

            const result = await ReallocationService.processVacancyForUpgrade(
                mockTrainState,
                vacantBerthInfo,
                currentStation
            );

            expect(result.offersCreated).toBe(0);
        });

        it('should process offline passengers but not send push notifications', async () => {
            const vacantBerthInfo = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };
            const currentStation = { name: 'Station B', code: 'STB' };

            mockTrainState.racQueue = [
                { pnr: 'R001', name: 'RAC1', boarded: true, passengerStatus: 'Offline' }
            ];

            UpgradeNotificationService.hasDeniedBerth.mockResolvedValue(false);
            UpgradeNotificationService.createUpgradeNotification.mockResolvedValue({ id: 'N001' });

            const result = await ReallocationService.processVacancyForUpgrade(
                mockTrainState,
                vacantBerthInfo,
                currentStation
            );

            expect(result.offersCreated).toBe(1);
            expect(WebPushService.sendPushNotification).not.toHaveBeenCalled();
        });

        it('should skip passengers who denied this berth', async () => {
            const vacantBerthInfo = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };
            const currentStation = { name: 'Station B', code: 'STB' };

            mockTrainState.racQueue = [
                { pnr: 'R001', name: 'RAC1', boarded: true, passengerStatus: 'Online', irctcId: 'IR001' }
            ];

            UpgradeNotificationService.hasDeniedBerth.mockResolvedValue(true);

            const result = await ReallocationService.processVacancyForUpgrade(
                mockTrainState,
                vacantBerthInfo,
                currentStation
            );

            expect(result.offersCreated).toBe(0);
        });

        it('should handle notification creation failure gracefully', async () => {
            const vacantBerthInfo = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };
            const currentStation = { name: 'Station B', code: 'STB' };

            mockTrainState.racQueue = [
                { pnr: 'R001', name: 'RAC1', boarded: true, passengerStatus: 'Online', irctcId: 'IR001' }
            ];

            UpgradeNotificationService.hasDeniedBerth.mockResolvedValue(false);
            UpgradeNotificationService.createUpgradeNotification.mockRejectedValue(
                new Error('Notification failed')
            );

            const result = await ReallocationService.processVacancyForUpgrade(
                mockTrainState,
                vacantBerthInfo,
                currentStation
            );

            expect(result.offersCreated).toBe(0);
        });

        it('should handle in-app notification failure gracefully', async () => {
            const vacantBerthInfo = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };
            const currentStation = { name: 'Station B', code: 'STB' };

            mockTrainState.racQueue = [
                { pnr: 'R001', name: 'RAC1', boarded: true, passengerStatus: 'Online', irctcId: 'IR001' }
            ];

            UpgradeNotificationService.hasDeniedBerth.mockResolvedValue(false);
            UpgradeNotificationService.createUpgradeNotification.mockResolvedValue({ id: 'N001' });
            InAppNotificationService.createNotification.mockRejectedValue(
                new Error('In-app failed')
            );

            const result = await ReallocationService.processVacancyForUpgrade(
                mockTrainState,
                vacantBerthInfo,
                currentStation
            );

            expect(result.offersCreated).toBe(1);
        });

        it('should handle push notification failure gracefully', async () => {
            const vacantBerthInfo = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };
            const currentStation = { name: 'Station B', code: 'STB' };

            mockTrainState.racQueue = [
                { pnr: 'R001', name: 'RAC1', boarded: true, passengerStatus: 'Online', irctcId: 'IR001' }
            ];

            UpgradeNotificationService.hasDeniedBerth.mockResolvedValue(false);
            UpgradeNotificationService.createUpgradeNotification.mockResolvedValue({ id: 'N001' });
            InAppNotificationService.createNotification.mockResolvedValue({ success: true });
            WebPushService.sendPushNotification.mockRejectedValue(new Error('Push failed'));

            const result = await ReallocationService.processVacancyForUpgrade(
                mockTrainState,
                vacantBerthInfo,
                currentStation
            );

            expect(result.offersCreated).toBe(1);
        });

        it('should not send push to passenger without irctcId', async () => {
            const vacantBerthInfo = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };
            const currentStation = { name: 'Station B', code: 'STB' };

            mockTrainState.racQueue = [
                { pnr: 'R001', name: 'RAC1', boarded: true, passengerStatus: 'Online' }
            ];

            UpgradeNotificationService.hasDeniedBerth.mockResolvedValue(false);
            UpgradeNotificationService.createUpgradeNotification.mockResolvedValue({ id: 'N001' });

            const result = await ReallocationService.processVacancyForUpgrade(
                mockTrainState,
                vacantBerthInfo,
                currentStation
            );

            expect(result.offersCreated).toBe(1);
            expect(InAppNotificationService.createNotification).not.toHaveBeenCalled();
        });

        it('should return success with offers created', async () => {
            const vacantBerthInfo = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };
            const currentStation = { name: 'Station B', code: 'STB' };

            mockTrainState.racQueue = [
                { pnr: 'R001', name: 'RAC1', boarded: true, passengerStatus: 'Online', irctcId: 'IR001' }
            ];

            UpgradeNotificationService.hasDeniedBerth.mockResolvedValue(false);
            UpgradeNotificationService.createUpgradeNotification.mockResolvedValue({ id: 'N001' });
            InAppNotificationService.createNotification.mockResolvedValue({ success: true });
            WebPushService.sendPushNotification.mockResolvedValue({ success: true });

            const result = await ReallocationService.processVacancyForUpgrade(
                mockTrainState,
                vacantBerthInfo,
                currentStation
            );

            expect(result.offersCreated).toBe(1);
            expect(result.error).toBeNull();
        });

        it('should return outer error when denied-berth lookup throws', async () => {
            const vacantBerthInfo = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };
            const currentStation = { name: 'Station B', code: 'STB' };
            mockTrainState.racQueue = [{ pnr: 'R001', name: 'RAC1', boarded: true }];

            UpgradeNotificationService.hasDeniedBerth.mockRejectedValue(new Error('denied-check-fail'));

            const result = await ReallocationService.processVacancyForUpgrade(
                mockTrainState,
                vacantBerthInfo,
                currentStation
            );

            expect(result).toEqual({ error: 'denied-check-fail', offersCreated: 0 });
        });

        it('should not increment offers when notification creation returns null', async () => {
            const vacantBerthInfo = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };
            const currentStation = { name: 'Station B', code: 'STB' };
            mockTrainState.racQueue = [
                { pnr: 'R001', name: 'RAC1', boarded: true, irctcId: 'IR001' }
            ];
            UpgradeNotificationService.hasDeniedBerth.mockResolvedValue(false);
            UpgradeNotificationService.createUpgradeNotification.mockResolvedValue(null);

            const result = await ReallocationService.processVacancyForUpgrade(
                mockTrainState,
                vacantBerthInfo,
                currentStation
            );

            expect(result.offersCreated).toBe(0);
        });
    });

    describe('stage matrix helpers', () => {
        beforeEach(() => {
            mockTrainState.stations = [
                { name: 'Station A', code: 'STA' },
                { name: 'Station B', code: 'STB' },
                { name: 'Station C', code: 'STC' }
            ];
        });

        it('returns stage1 matrix for eligible segments', () => {
            VacancyService.getVacantSegments.mockReturnValue([
                { coachNo: 'S1', berthNo: 10, type: 'Lower', class: 'SL', fromIdx: 0, toIdx: 2, from: 'STA', to: 'STC' }
            ]);
            EligibilityService.getStage1EligibleRAC.mockReturnValue([{ pnr: 'R001' }]);

            const result = ReallocationService.getStage1Eligible(mockTrainState);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(expect.objectContaining({ berth: 'S1-10', stage1Count: 1 }));
        });

        it('returns empty stage1 matrix when no segment has eligible RAC', () => {
            VacancyService.getVacantSegments.mockReturnValue([
                { coachNo: 'S1', berthNo: 10, type: 'Lower', class: 'SL', fromIdx: 0, toIdx: 2, from: 'STA', to: 'STC' }
            ]);
            EligibilityService.getStage1EligibleRAC.mockReturnValue([]);
            expect(ReallocationService.getStage1Eligible(mockTrainState)).toEqual([]);
        });

        it('returns empty stage1 matrix on error', () => {
            VacancyService.getVacantSegments.mockImplementation(() => {
                throw new Error('boom');
            });
            expect(ReallocationService.getStage1Eligible(mockTrainState)).toEqual([]);
        });

        it('returns stage2 results when segment found', () => {
            VacancyService.getVacantSegments.mockReturnValue([
                { coachNo: 'S1', berthNo: '10', type: 'Lower', class: 'SL', fromIdx: 0, toIdx: 2, from: 'STA', to: 'STC' }
            ]);
            EligibilityService.getStage1EligibleRAC.mockReturnValue([{ pnr: 'R001' }]);
            EligibilityService.getStage2Results.mockReturnValue({
                onlineEligible: [{ pnr: 'R001' }],
                offlineEligible: [],
                notEligible: []
            });

            const result = ReallocationService.getStage2Results(mockTrainState, { coach: 'S1', berthNo: '10' });
            expect(result).toEqual(expect.objectContaining({ berth: 'S1-10' }));
            expect(result.onlineEligible).toHaveLength(1);
        });

        it('returns stage2 result using fallback station labels when station indexes are missing', () => {
            VacancyService.getVacantSegments.mockReturnValue([
                { coachNo: 'S1', berthNo: '10', type: 'Lower', class: 'SL', fromIdx: 8, toIdx: 9, from: 'A', to: 'B' }
            ]);
            EligibilityService.getStage1EligibleRAC.mockReturnValue([{ pnr: 'R001' }]);
            EligibilityService.getStage2Results.mockReturnValue({
                onlineEligible: [],
                offlineEligible: [{ pnr: 'R001' }],
                notEligible: []
            });

            const result = ReallocationService.getStage2Results(mockTrainState, { coach: 'S1', berthNo: '10' });
            expect(result.vacantFrom).toBe('A');
            expect(result.vacantTo).toBe('B');
        });

        it('returns stage2 error payload when segment missing', () => {
            VacancyService.getVacantSegments.mockReturnValue([]);

            const result = ReallocationService.getStage2Results(mockTrainState, { coach: 'S1', berthNo: '10' });
            expect(result.error).toBe('Vacant berth not found');
        });

        it('returns stage2 error payload when stage-2 calculation throws', () => {
            VacancyService.getVacantSegments.mockReturnValue([
                { coachNo: 'S1', berthNo: '10', type: 'Lower', class: 'SL', fromIdx: 0, toIdx: 2, from: 'STA', to: 'STC' }
            ]);
            EligibilityService.getStage1EligibleRAC.mockReturnValue([{ pnr: 'R001' }]);
            EligibilityService.getStage2Results.mockImplementation(() => {
                throw new Error('stage2 fail');
            });

            const result = ReallocationService.getStage2Results(mockTrainState, { coach: 'S1', berthNo: '10' });
            expect(result).toEqual(expect.objectContaining({ error: 'stage2 fail' }));
            expect(result.onlineEligible).toEqual([]);
        });
    });

    describe('group and legacy eligibility', () => {
        beforeEach(() => {
            mockTrainState.stations = [
                { name: 'Station A', code: 'STA' },
                { name: 'Station B', code: 'STB' },
                { name: 'Station C', code: 'STC' }
            ];
            mockTrainState.coaches = [
                {
                    berths: [
                        { passenger: { pnr: 'PNR1', pnrStatus: 'CNF', name: 'CNF Passenger', coach: 'S1', berth: 1 } }
                    ]
                }
            ];
        });

        it('returns no eligible groups when no vacant segments', () => {
            VacancyService.getVacantSegments.mockReturnValue([]);
            const result = ReallocationService.getEligibleGroupsForVacantSeats(mockTrainState);
            expect(result).toEqual(expect.objectContaining({ totalVacantSeats: 0, eligibleGroups: [] }));
        });

        it('returns eligible groups sorted by RAC priority', () => {
            VacancyService.getVacantSegments.mockReturnValue([
                { coachNo: 'S1', berthNo: 10, type: 'Lower', class: 'SL', fromIdx: 0, toIdx: 2, from: 'STA', to: 'STC' }
            ]);
            RACQueueService.getRACQueue.mockReturnValue([
                { pnr: 'PNR2', name: 'R2', racStatus: 5, _id: '2' },
                { pnr: 'PNR1', name: 'R1', racStatus: 1, _id: '1' }
            ]);
            EligibilityService.isEligibleForSegment = jest.fn().mockReturnValue(true);

            const result = ReallocationService.getEligibleGroupsForVacantSeats(mockTrainState);

            expect(result.eligibleGroups.length).toBeGreaterThan(0);
            expect(result.eligibleGroups[0].pnr).toBe('PNR1');
        });

        it('includes detailed vacant seat and group metadata in response', () => {
            VacancyService.getVacantSegments.mockReturnValue([
                { coachNo: 'S1', berthNo: 10, type: 'Lower', class: 'SL', fromIdx: 0, toIdx: 2, from: 'STA', to: 'STC' }
            ]);
            RACQueueService.getRACQueue.mockReturnValue([
                { pnr: 'PNR1', name: 'R1', racStatus: 1, _id: '1', age: 25, gender: 'M' }
            ]);
            EligibilityService.isEligibleForSegment = jest.fn().mockReturnValue(true);

            const result = ReallocationService.getEligibleGroupsForVacantSeats(mockTrainState);
            expect(result.totalVacantSeats).toBe(1);
            expect(result.vacantSeats[0]).toEqual(expect.objectContaining({
                berth: 'S1-10',
                coach: 'S1',
                berthNo: 10
            }));
            expect(result.eligibleGroups[0]).toEqual(expect.objectContaining({
                pnr: 'PNR1',
                eligibleCount: 1,
                totalCount: 2
            }));
            expect(result.eligibleGroups[0].racPassengers[0]).toEqual(expect.objectContaining({
                id: '1',
                name: 'R1',
                age: 25,
                gender: 'M'
            }));
        });

        it('returns message when no groups are eligible for any segment', () => {
            VacancyService.getVacantSegments.mockReturnValue([
                { coachNo: 'S1', berthNo: 10, type: 'Lower', class: 'SL', fromIdx: 0, toIdx: 2, from: 'STA', to: 'STC' }
            ]);
            RACQueueService.getRACQueue.mockReturnValue([
                { pnr: 'PNR1', name: 'R1', racStatus: 1, _id: '1' }
            ]);
            EligibilityService.isEligibleForSegment = jest.fn().mockReturnValue(false);

            const result = ReallocationService.getEligibleGroupsForVacantSeats(mockTrainState);
            expect(result.eligibleGroups).toEqual([]);
            expect(result.message).toBe('No eligible groups found');
        });

        it('skips groups that already rejected upgrade', () => {
            VacancyService.getVacantSegments.mockReturnValue([
                { coachNo: 'S1', berthNo: 10, type: 'Lower', class: 'SL', fromIdx: 0, toIdx: 2, from: 'STA', to: 'STC' }
            ]);
            RACQueueService.getRACQueue.mockReturnValue([
                { pnr: 'PNR1', name: 'R1', racStatus: 1, _id: '1', hasRejectedGroupUpgrade: true }
            ]);
            EligibilityService.isEligibleForSegment = jest.fn().mockReturnValue(true);

            const result = ReallocationService.getEligibleGroupsForVacantSeats(mockTrainState);
            expect(result.eligibleGroups).toEqual([]);
        });

        it('returns error payload when group eligibility calculation throws', () => {
            VacancyService.getVacantSegments.mockImplementation(() => {
                throw new Error('group fail');
            });

            const result = ReallocationService.getEligibleGroupsForVacantSeats(mockTrainState);
            expect(result).toEqual(expect.objectContaining({ totalVacantSeats: 0, error: 'group fail' }));
        });

        it('builds legacy eligibility matrix', () => {
            VacancyService.getVacantSegments.mockReturnValue([
                { coachNo: 'S1', berthNo: 10, type: 'Lower', class: 'SL', fromIdx: 0, toIdx: 2, from: 'STA', to: 'STC' }
            ]);
            EligibilityService.getStage1EligibleRAC.mockReturnValue([{ pnr: 'R001' }]);

            const result = ReallocationService.getEligibilityMatrix(mockTrainState);
            expect(result[0]).toEqual(expect.objectContaining({ berth: 'S1-10', eligibleCount: 1 }));
        });

        it('builds legacy matrix with station-name fallback segment string', () => {
            VacancyService.getVacantSegments.mockReturnValue([
                { coachNo: 'S1', berthNo: 10, type: 'Lower', class: 'SL', fromIdx: 9, toIdx: 10, from: 'X', to: 'Y' }
            ]);
            EligibilityService.getStage1EligibleRAC.mockReturnValue([{ pnr: 'R001' }]);

            const result = ReallocationService.getEligibilityMatrix(mockTrainState);
            expect(result[0]).toEqual(expect.objectContaining({
                vacantFrom: 'X',
                vacantTo: 'Y',
                vacantSegment: 'X → Y'
            }));
        });

        it('returns empty legacy matrix on error', () => {
            VacancyService.getVacantSegments.mockImplementation(() => {
                throw new Error('matrix fail');
            });
            expect(ReallocationService.getEligibilityMatrix(mockTrainState)).toEqual([]);
        });
    });

    describe('getRACStats', () => {
        it('delegates to RACQueueService', () => {
            RACQueueService.getRACStats.mockReturnValue({ total: 4 });
            const result = ReallocationService.getRACStats(mockTrainState);
            expect(result).toEqual({ total: 4 });
        });
    });
});
