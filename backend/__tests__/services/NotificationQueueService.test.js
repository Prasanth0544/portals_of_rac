const NotificationQueueService = require('../../services/NotificationQueueService');
const WebPushService = require('../../services/WebPushService');
const NotificationService = require('../../services/NotificationService');
const db = require('../../config/db');

jest.mock('../../services/WebPushService');
jest.mock('../../services/NotificationService');
jest.mock('../../config/db');

describe('NotificationQueueService', () => {
    let mockPassengersCollection;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPassengersCollection = {
            findOne: jest.fn()
        };

        db.getPassengersCollection = jest.fn().mockReturnValue(mockPassengersCollection);

        // Reset the singleton state
        NotificationQueueService.queue = [];
        NotificationQueueService.processing = false;
        NotificationQueueService.stats = { enqueued: 0, processed: 0, failed: 0 };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('enqueueUpgradeOffers', () => {
        it('should add notifications to queue and start processing synchronously', async () => {
            const pendingReallocations = [
                {
                    passengerIrctcId: 'IR001',
                    passengerName: 'Test User',
                    passengerPNR: 'P001',
                    currentRAC: 'RAC 1',
                    proposedBerthFull: 'S1-10',
                    proposedBerthType: 'Lower',
                    proposedCoach: 'S1',
                    stationName: 'Station A'
                }
            ];

            // Mock to prevent actual processing during enqueue
            const processQueueSpy = jest.spyOn(NotificationQueueService, '_processQueue').mockResolvedValue(true);

            NotificationQueueService.enqueueUpgradeOffers(pendingReallocations);

            expect(NotificationQueueService.queue.length).toBe(1);
            expect(NotificationQueueService.stats.enqueued).toBe(1);
            expect(processQueueSpy).toHaveBeenCalled();
            expect(NotificationQueueService.queue[0].type).toBe('UPGRADE_OFFER');

            processQueueSpy.mockRestore();
        });

        it('should not start processing if already processing', () => {
            NotificationQueueService.processing = true;
            const processQueueSpy = jest.spyOn(NotificationQueueService, '_processQueue');

            NotificationQueueService.enqueueUpgradeOffers([{ passengerIrctcId: 'IR002' }]);

            expect(processQueueSpy).not.toHaveBeenCalled();
            processQueueSpy.mockRestore();
        });

        it('should reset processing flag when processQueue rejects', async () => {
            const pendingReallocations = [{ passengerIrctcId: 'IR001' }];
            jest.spyOn(NotificationQueueService, '_processQueue').mockRejectedValue(new Error('queue fail'));
            NotificationQueueService.processing = false;

            NotificationQueueService.enqueueUpgradeOffers(pendingReallocations);
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(NotificationQueueService.processing).toBe(false);
        });
    });

    describe('_processQueue', () => {
        it('should process queue in batches', async () => {
            NotificationQueueService.queue = [
                { type: 'UPGRADE_OFFER', payload: { irctcId: 'IR001' } },
                { type: 'UPGRADE_OFFER', payload: { irctcId: 'IR002' } }
            ];

            const processJobSpy = jest.spyOn(NotificationQueueService, '_processJob').mockResolvedValue(true);

            await NotificationQueueService._processQueue();

            expect(NotificationQueueService.processing).toBe(false);
            expect(NotificationQueueService.stats.processed).toBe(2);
            expect(NotificationQueueService.queue.length).toBe(0);
            expect(processJobSpy).toHaveBeenCalledTimes(2);

            processJobSpy.mockRestore();
        });

        it('should handle failed jobs', async () => {
            NotificationQueueService.queue = [
                { type: 'UPGRADE_OFFER', payload: { irctcId: 'IR001' } }
            ];

            const processJobSpy = jest.spyOn(NotificationQueueService, '_processJob').mockRejectedValue(new Error('Job failed'));

            await NotificationQueueService._processQueue();

            expect(NotificationQueueService.stats.failed).toBe(1);
            expect(NotificationQueueService.queue.length).toBe(0);

            processJobSpy.mockRestore();
        });
    });

    describe('_processJob', () => {
        it('should process UPGRADE_OFFER jobs successfully', async () => {
            const job = {
                type: 'UPGRADE_OFFER',
                payload: {
                    irctcId: 'IR001',
                    name: 'Test',
                    pnr: 'P001',
                    currentRAC: 'RAC 1',
                    proposedBerthFull: 'S1-10',
                    proposedBerthType: 'Lower',
                    proposedCoach: 'S1',
                    stationName: 'Station A'
                }
            };

            WebPushService.sendUpgradeOfferToPassenger.mockResolvedValue(true);
            mockPassengersCollection.findOne.mockResolvedValue({ Email: 'test@example.com' });
            NotificationService.sendApprovalRequestNotification.mockResolvedValue(true);

            await NotificationQueueService._processJob(job);

            expect(WebPushService.sendUpgradeOfferToPassenger).toHaveBeenCalledWith('IR001', expect.any(Object));
            expect(mockPassengersCollection.findOne).toHaveBeenCalledWith({ IRCTC_ID: 'IR001' });
            expect(NotificationService.sendApprovalRequestNotification).toHaveBeenCalled();
        });

        it('should handle push error gracefully', async () => {
            const job = {
                type: 'UPGRADE_OFFER',
                payload: { irctcId: 'IR001' }
            };

            WebPushService.sendUpgradeOfferToPassenger.mockRejectedValue(new Error('Push error'));
            mockPassengersCollection.findOne.mockResolvedValue(null);

            await NotificationQueueService._processJob(job);

            expect(WebPushService.sendUpgradeOfferToPassenger).toHaveBeenCalled();
        });

        it('should handle email error gracefully', async () => {
            const job = {
                type: 'UPGRADE_OFFER',
                payload: { irctcId: 'IR001' }
            };

            WebPushService.sendUpgradeOfferToPassenger.mockResolvedValue(true);
            mockPassengersCollection.findOne.mockResolvedValue({ Email: 'test@example.com' });
            NotificationService.sendApprovalRequestNotification.mockRejectedValue(new Error('Email error'));

            await NotificationQueueService._processJob(job);

            expect(NotificationService.sendApprovalRequestNotification).toHaveBeenCalled();
        });

        it('should ignore unknown job types', async () => {
            const job = { type: 'UNKNOWN', payload: {} };
            await NotificationQueueService._processJob(job);
            expect(WebPushService.sendUpgradeOfferToPassenger).not.toHaveBeenCalled();
        });
    });

    describe('getStats', () => {
        it('should return correct stats', () => {
            NotificationQueueService.queue = [1, 2];
            NotificationQueueService.processing = true;
            NotificationQueueService.stats = { enqueued: 5, processed: 2, failed: 1 };

            const stats = NotificationQueueService.getStats();

            expect(stats).toEqual({
                pending: 2,
                processing: true,
                enqueued: 5,
                processed: 2,
                failed: 1
            });
        });
    });
});
