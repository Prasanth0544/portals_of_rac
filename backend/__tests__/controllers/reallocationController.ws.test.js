jest.mock('../../services/ReallocationService');
jest.mock('../../services/ValidationService');
jest.mock('../../controllers/trainController');
jest.mock('../../services/NotificationService', () => ({
    sendNoShowMarkedNotification: jest.fn().mockResolvedValue(true)
}));
jest.mock('../../services/InAppNotificationService', () => ({
    createNotification: jest.fn()
}));
jest.mock('../../services/WebPushService', () => ({
    sendNoShowAlert: jest.fn().mockResolvedValue(true)
}));
jest.mock('../../services/GroupUpgradeService', () => ({
    createGroupUpgradeOffer: jest.fn().mockResolvedValue({ success: true, expiresAt: '2026-01-01' }),
    getOfferStatus: jest.fn(),
    rejectGroupUpgradeOffer: jest.fn()
}));
jest.mock('../../config/db');
jest.mock('../../config/websocket', () => ({
    emitToAll: jest.fn(),
    broadcastNoShow: jest.fn(),
    broadcastStatsUpdate: jest.fn()
}));

describe('reallocationController websocket branches', () => {
    const makeRes = () => ({
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
    });

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        jest.useFakeTimers();
        process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
        jest.useRealTimers();
        process.env.NODE_ENV = 'test';
    });

    it('emits websocket events for no-show vacancy/group flow', async () => {
        const controller = require('../../controllers/reallocationController');
        const ReallocationService = require('../../services/ReallocationService');
        const ValidationService = require('../../services/ValidationService');
        const trainController = require('../../controllers/trainController');
        const db = require('../../config/db');
        const wsManager = require('../../config/websocket');

        const trainState = {
            stats: { totalPassengers: 10 },
            getCurrentStation: jest.fn().mockReturnValue({ name: 'RJY' }),
            findPassenger: jest.fn()
                .mockReturnValueOnce({
                    berth: { berthNo: 10, fullBerthNo: 'S1-10', type: 'Lower' },
                    coachNo: 'S1',
                    coach: { class: 'SL', coach_name: 'S1' }
                })
                .mockReturnValueOnce({
                    passenger: { coach: 'S1', berth: 10 }
                })
        };

        trainController.getGlobalTrainState.mockReturnValue(trainState);
        ValidationService.validatePNR.mockReturnValue({ valid: true });
        ReallocationService.markNoShow.mockResolvedValue({ passenger: { pnr: '1234567890' } });
        ReallocationService.processVacancyForUpgrade.mockResolvedValue({ offersCreated: 1 });
        ReallocationService.getEligibleGroupsForVacantSeats.mockReturnValue({
            totalVacantSeats: 1,
            vacantSeats: [{ berth: 'S1-10' }],
            eligibleGroups: [{
                pnr: 'PNR1',
                eligibleCount: 1,
                totalCount: 1,
                canUpgradeAll: true,
                passengers: [{ id: '1', name: 'A', age: 22, gender: 'F', pnrStatus: 'RAC', isSelectable: true }]
            }]
        });
        db.getPassengersCollection.mockReturnValue({
            findOne: jest.fn().mockResolvedValue({
                Email: 'test@example.com',
                Mobile: '9999999999',
                IRCTC_ID: 'IR1'
            })
        });

        await jest.advanceTimersByTimeAsync(1100);

        const req = { body: { pnr: '1234567890' }, query: {} };
        const res = makeRes();
        await controller.markPassengerNoShow(req, res);

        expect(wsManager.emitToAll).toHaveBeenCalled();
        expect(wsManager.broadcastNoShow).toHaveBeenCalled();
        expect(wsManager.broadcastStatsUpdate).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
});
