jest.mock('../../services/DataService');
jest.mock('../../services/StationEventService');
jest.mock('../../services/RuntimeStateService');
jest.mock('../../services/TrainEngineService');
jest.mock('../../config/db');
jest.mock('../../config/websocket', () => ({
    broadcastTrainUpdate: jest.fn(),
    broadcastStationArrival: jest.fn(),
    broadcastStatsUpdate: jest.fn()
}));

describe('trainController websocket branches', () => {
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

    it('emits websocket updates during initialize/start/move/reset', async () => {
        const controller = require('../../controllers/trainController');
        const DataService = require('../../services/DataService');
        const StationEventService = require('../../services/StationEventService');
        const RuntimeStateService = require('../../services/RuntimeStateService');
        const TrainEngineService = require('../../services/TrainEngineService');
        const db = require('../../config/db');
        const wsManager = require('../../config/websocket');

        const trainState = {
            trainNo: '17225',
            trainName: 'WS Express',
            journeyDate: '2025-12-20',
            journeyStarted: false,
            currentStationIdx: 0,
            stations: [{ name: 'A' }, { name: 'B' }],
            coaches: [],
            racQueue: [],
            stats: { totalPassengers: 1, cnfPassengers: 1, racPassengers: 0, currentOnboard: 0, totalDeboarded: 0, totalNoShows: 0, totalRACUpgraded: 0 },
            getCurrentStation: jest.fn().mockReturnValue({ name: 'A', code: 'A' }),
            updateStats: jest.fn(),
            startJourney: jest.fn(() => { trainState.journeyStarted = true; }),
            isJourneyComplete: jest.fn().mockReturnValue(false),
            unlockStationForUpgrades: jest.fn()
        };

        db.getPassengersDb.mockReturnValue({
            collection: jest.fn().mockReturnValue({ deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }) })
        });
        db.getDb.mockResolvedValue({
            collection: jest.fn().mockReturnValue({ updateOne: jest.fn().mockResolvedValue({}) })
        });
        DataService.getTrainName.mockResolvedValue('WS Express');
        DataService.loadTrainData.mockResolvedValue(trainState);
        RuntimeStateService.loadState.mockResolvedValue(null);
        RuntimeStateService.saveState.mockResolvedValue(true);
        RuntimeStateService.clearState.mockResolvedValue(true);
        StationEventService.processStationArrival.mockResolvedValue({
            station: 'B',
            stationCode: 'B',
            stationIdx: 1,
            deboarded: 0,
            noShows: 0,
            racAllocated: 0,
            boarded: 0,
            vacancies: [],
            stats: trainState.stats,
            upgrades: []
        });

        await jest.advanceTimersByTimeAsync(1100);

        await controller.initializeTrain({ body: { trainNo: '17225', journeyDate: '2025-12-20' }, query: {} }, makeRes());
        await controller.startJourney({ body: { trainNo: '17225' }, query: {} }, makeRes());
        await controller.moveToNextStation({ body: { trainNo: '17225' }, query: {} }, makeRes());
        await controller.resetTrain({ body: { trainNo: '17225' }, query: {} }, makeRes());

        expect(wsManager.broadcastTrainUpdate).toHaveBeenCalled();
        expect(wsManager.broadcastStationArrival).toHaveBeenCalled();
        expect(wsManager.broadcastStatsUpdate).toHaveBeenCalled();
        expect(TrainEngineService.startEngine).toHaveBeenCalled();
    });
});
