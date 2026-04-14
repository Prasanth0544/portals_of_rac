jest.mock('../../config/db');
jest.mock('../../controllers/trainController', () => ({
    getGlobalTrainState: jest.fn()
}));
jest.mock('../../services/ReallocationService', () => ({
    getEligibleGroupsForVacantSeats: jest.fn()
}));
jest.mock('../../config/websocket', () => ({
    sendToUser: jest.fn(),
    broadcast: jest.fn()
}));

const db = require('../../config/db');
const trainController = require('../../controllers/trainController');
const ReallocationService = require('../../services/ReallocationService');
const wsManager = require('../../config/websocket');
const GroupUpgradeService = require('../../services/GroupUpgradeService');

describe('GroupUpgradeService', () => {
    let mockPassengersCollection;

    beforeEach(() => {
        jest.clearAllMocks();
        GroupUpgradeService.stopTimeoutProcessor();

        mockPassengersCollection = {
            updateMany: jest.fn(),
            aggregate: jest.fn(),
            findOne: jest.fn()
        };
        db.getPassengersCollection.mockReturnValue(mockPassengersCollection);
    });

    describe('createGroupUpgradeOffer', () => {
        it('creates offer and returns success payload', async () => {
            mockPassengersCollection.updateMany.mockResolvedValue({ modifiedCount: 2 });

            const result = await GroupUpgradeService.createGroupUpgradeOffer('PNR123', ['1', '2'], 2);

            expect(result.success).toBe(true);
            expect(result.pnr).toBe('PNR123');
            expect(result.passengerCount).toBe(2);
            expect(result.vacantSeatsCount).toBe(2);
            expect(mockPassengersCollection.updateMany).toHaveBeenCalledWith(
                { PNR_Number: 'PNR123' },
                expect.objectContaining({
                    $set: expect.objectContaining({
                        'groupUpgradeStatus.isEligible': true,
                        'groupUpgradeStatus.offerExpired': false
                    })
                })
            );
        });

        it('returns failure when db update throws', async () => {
            mockPassengersCollection.updateMany.mockRejectedValue(new Error('db fail'));

            const result = await GroupUpgradeService.createGroupUpgradeOffer('PNR123', ['1'], 1);

            expect(result).toEqual({ success: false, error: 'db fail' });
        });
    });

    describe('getActiveOffers', () => {
        it('returns aggregated active offers', async () => {
            const offers = [{ pnr: 'PNR123' }];
            mockPassengersCollection.aggregate.mockReturnValue({
                toArray: jest.fn().mockResolvedValue(offers)
            });

            const result = await GroupUpgradeService.getActiveOffers();

            expect(result).toEqual(offers);
        });

        it('returns empty array on error', async () => {
            mockPassengersCollection.aggregate.mockImplementation(() => {
                throw new Error('agg fail');
            });

            const result = await GroupUpgradeService.getActiveOffers();
            expect(result).toEqual([]);
        });
    });

    describe('markOfferAsSelected and reject/expire/cleanup', () => {
        it('marks selected and returns success', async () => {
            mockPassengersCollection.updateMany.mockResolvedValue({ modifiedCount: 1 });

            const result = await GroupUpgradeService.markOfferAsSelected('PNR1', 'tte');
            expect(result).toEqual({ success: true });
        });

        it('returns failure when markOfferAsSelected throws', async () => {
            mockPassengersCollection.updateMany.mockRejectedValue(new Error('mark fail'));
            const result = await GroupUpgradeService.markOfferAsSelected('PNR1', 'passenger');
            expect(result).toEqual({ success: false, error: 'mark fail' });
        });

        it('rejects group upgrade offer for RAC passengers only', async () => {
            mockPassengersCollection.updateMany.mockResolvedValue({ modifiedCount: 3 });

            const result = await GroupUpgradeService.rejectGroupUpgradeOffer('PNR1', 'declined');

            expect(result).toEqual({ success: true, modifiedCount: 3 });
            expect(mockPassengersCollection.updateMany).toHaveBeenCalledWith(
                { PNR_Number: 'PNR1', PNR_Status: 'RAC' },
                expect.objectContaining({
                    $set: expect.objectContaining({
                        hasRejectedGroupUpgrade: true,
                        groupUpgradeRejectionReason: 'declined'
                    }),
                    $unset: { groupUpgradeStatus: '' }
                })
            );
        });

        it('uses default reason when rejecting group upgrade', async () => {
            mockPassengersCollection.updateMany.mockResolvedValue({ modifiedCount: 1 });
            await GroupUpgradeService.rejectGroupUpgradeOffer('PNR1');
            expect(mockPassengersCollection.updateMany).toHaveBeenCalledWith(
                { PNR_Number: 'PNR1', PNR_Status: 'RAC' },
                expect.objectContaining({
                    $set: expect.objectContaining({ groupUpgradeRejectionReason: 'User declined' })
                })
            );
        });

        it('returns failure when reject group offer throws', async () => {
            mockPassengersCollection.updateMany.mockRejectedValue(new Error('reject fail'));
            const result = await GroupUpgradeService.rejectGroupUpgradeOffer('PNR1', 'declined');
            expect(result).toEqual({ success: false, error: 'reject fail' });
        });

        it('expires and cleans up offer', async () => {
            mockPassengersCollection.updateMany.mockResolvedValue({ modifiedCount: 2 });

            const expired = await GroupUpgradeService.expireOffer('PNR1');
            const cleaned = await GroupUpgradeService.cleanupOffer('PNR1');

            expect(expired).toEqual({ success: true, modifiedCount: 2 });
            expect(cleaned).toEqual({ success: true });
        });

        it('returns failure when expiring offer throws', async () => {
            mockPassengersCollection.updateMany.mockRejectedValue(new Error('expire fail'));
            const result = await GroupUpgradeService.expireOffer('PNR1');
            expect(result).toEqual({ success: false, error: 'expire fail' });
        });

        it('returns failure when cleanup throws', async () => {
            mockPassengersCollection.updateMany.mockRejectedValue(new Error('cleanup fail'));
            const result = await GroupUpgradeService.cleanupOffer('PNR1');
            expect(result).toEqual({ success: false, error: 'cleanup fail' });
        });
    });

    describe('getOfferStatus', () => {
        it('returns hasOffer false when no status exists', async () => {
            mockPassengersCollection.findOne.mockResolvedValue(null);
            const result = await GroupUpgradeService.getOfferStatus('PNR1');
            expect(result).toEqual({ hasOffer: false });
        });

        it('returns computed status including timeRemaining', async () => {
            const future = new Date(Date.now() + 60_000).toISOString();
            mockPassengersCollection.findOne.mockResolvedValue({
                groupUpgradeStatus: {
                    isEligible: true,
                    offerExpired: false,
                    visibleToPassenger: true,
                    selectedBy: null,
                    expiresAt: future
                }
            });

            const result = await GroupUpgradeService.getOfferStatus('PNR1');

            expect(result.hasOffer).toBe(true);
            expect(result.isExpired).toBe(false);
            expect(result.timeRemaining).toBeGreaterThan(0);
        });

        it('marks status expired when expiry time has passed', async () => {
            const past = new Date(Date.now() - 60_000).toISOString();
            mockPassengersCollection.findOne.mockResolvedValue({
                groupUpgradeStatus: {
                    isEligible: true,
                    offerExpired: false,
                    visibleToPassenger: false,
                    selectedBy: null,
                    expiresAt: past
                }
            });
            const result = await GroupUpgradeService.getOfferStatus('PNR1');
            expect(result.hasOffer).toBe(true);
            expect(result.isExpired).toBe(true);
            expect(result.timeRemaining).toBe(0);
        });

        it('returns hasOffer false with error when status lookup throws', async () => {
            mockPassengersCollection.findOne.mockRejectedValue(new Error('status fail'));
            const result = await GroupUpgradeService.getOfferStatus('PNR1');
            expect(result).toEqual({ hasOffer: false, error: 'status fail' });
        });
    });

    describe('processExpiredOffers', () => {
        it('returns zero when no db available during bootstrap', async () => {
            db.getPassengersCollection.mockImplementation(() => {
                throw new Error('no collection');
            });

            const result = await GroupUpgradeService.processExpiredOffers();
            expect(result).toEqual({ processedCount: 0 });
        });

        it('expires offers and performs fallback notification path', async () => {
            mockPassengersCollection.aggregate.mockReturnValue({
                toArray: jest.fn().mockResolvedValue([{ pnr: 'PNR_X' }])
            });
            mockPassengersCollection.updateMany.mockResolvedValue({ modifiedCount: 1 });

            trainController.getGlobalTrainState.mockReturnValue({
                findPassengerByPNR: jest.fn().mockReturnValue({ irctcId: 'IR1' })
            });
            ReallocationService.getEligibleGroupsForVacantSeats.mockReturnValue({
                eligibleGroups: [{ pnr: 'PNR_NEXT', eligibleCount: 2, racPassengers: [{ id: 'A' }] }],
                totalVacantSeats: 1
            });
            jest.spyOn(GroupUpgradeService, 'createGroupUpgradeOffer').mockResolvedValue({
                success: true,
                expiresAt: new Date().toISOString()
            });

            const result = await GroupUpgradeService.processExpiredOffers();

            expect(result.processedCount).toBe(1);
            expect(wsManager.sendToUser).toHaveBeenCalled();
            GroupUpgradeService.createGroupUpgradeOffer.mockRestore();
        });

        it('returns zero when there are no expired offers', async () => {
            mockPassengersCollection.aggregate.mockReturnValue({
                toArray: jest.fn().mockResolvedValue([])
            });
            const result = await GroupUpgradeService.processExpiredOffers();
            expect(result).toEqual({ processedCount: 0 });
        });

        it('broadcasts when group leader cannot be identified', async () => {
            mockPassengersCollection.aggregate.mockReturnValue({
                toArray: jest.fn().mockResolvedValue([{ pnr: 'PNR_X' }])
            });
            mockPassengersCollection.updateMany.mockResolvedValue({ modifiedCount: 1 });
            trainController.getGlobalTrainState.mockReturnValue({
                findPassengerByPNR: jest.fn().mockReturnValue(null)
            });
            ReallocationService.getEligibleGroupsForVacantSeats.mockReturnValue({
                eligibleGroups: [{ pnr: 'PNR_NEXT', eligibleCount: 2, racPassengers: [{ id: 'A' }] }],
                totalVacantSeats: 1
            });
            jest.spyOn(GroupUpgradeService, 'createGroupUpgradeOffer').mockResolvedValue({
                success: true,
                expiresAt: new Date().toISOString()
            });

            await GroupUpgradeService.processExpiredOffers();
            expect(wsManager.broadcast).toHaveBeenCalled();
            GroupUpgradeService.createGroupUpgradeOffer.mockRestore();
        });

        it('returns error payload when expired-offer query fails', async () => {
            mockPassengersCollection.aggregate.mockImplementation(() => {
                throw new Error('expired fail');
            });
            const result = await GroupUpgradeService.processExpiredOffers();
            expect(result).toEqual({ processedCount: 0, error: 'expired fail' });
        });
    });

    describe('timeout processor lifecycle', () => {
        it('starts timeout processor and schedules periodic checks', () => {
            jest.useFakeTimers();
            const spy = jest.spyOn(GroupUpgradeService, 'processExpiredOffers').mockResolvedValue({ processedCount: 0 });

            GroupUpgradeService.startTimeoutProcessor();
            expect(spy).toHaveBeenCalledTimes(1); // immediate run

            jest.advanceTimersByTime(30000);
            expect(spy).toHaveBeenCalledTimes(2); // periodic run

            GroupUpgradeService.stopTimeoutProcessor();
            spy.mockRestore();
            jest.useRealTimers();
        });

        it('stopTimeoutProcessor is safe when interval is absent', () => {
            GroupUpgradeService.timeoutInterval = null;
            expect(() => GroupUpgradeService.stopTimeoutProcessor()).not.toThrow();
        });
    });
});
