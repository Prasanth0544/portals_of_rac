describe('TrainEngineService', () => {
    let TrainEngineService;
    let RuntimeStateService;
    let StationEventService;
    let trainController;
    let wsManager;
    let timerStub;

    const loadService = () => {
        jest.resetModules();

        jest.doMock('../../services/RuntimeStateService', () => ({
            saveState: jest.fn().mockResolvedValue(true)
        }));
        jest.doMock('../../services/StationEventService', () => ({
            processStationArrival: jest.fn().mockResolvedValue({
                station: 'BZA',
                stationCode: 'BZA',
                stationIdx: 1,
                deboarded: 0,
                noShows: 0,
                racAllocated: 0,
                boarded: 0,
                vacancies: [],
                stats: {}
            })
        }));
        jest.doMock('../../controllers/trainController', () => ({
            getGlobalTrainState: jest.fn(),
            updateTrainStatus: jest.fn().mockResolvedValue(true)
        }));
        jest.doMock('../../config/websocket', () => ({
            broadcastStationArrival: jest.fn(),
            broadcastStatsUpdate: jest.fn(),
            broadcastTrainUpdate: jest.fn()
        }));

        TrainEngineService = require('../../services/TrainEngineService');
        RuntimeStateService = require('../../services/RuntimeStateService');
        StationEventService = require('../../services/StationEventService');
        trainController = require('../../controllers/trainController');
        wsManager = require('../../config/websocket');
    };

    beforeEach(() => {
        timerStub = { unref: jest.fn() };
        jest.spyOn(global, 'setInterval').mockImplementation(() => timerStub);
        jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
        loadService();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('starts an engine and prevents duplicate starts', () => {
        const first = TrainEngineService.startEngine('17225', { intervalMs: 1000 });
        const second = TrainEngineService.startEngine('17225', { intervalMs: 1000 });

        expect(first.started).toBe(true);
        expect(second.started).toBe(false);
        expect(timerStub.unref).toHaveBeenCalled();
    });

    it('stops an engine and returns false when missing', () => {
        TrainEngineService.startEngine('17225');
        expect(TrainEngineService.stopEngine('17225')).toBe(true);
        expect(TrainEngineService.stopEngine('17225')).toBe(false);
    });

    it('returns running engine metadata and time remaining', () => {
        TrainEngineService.startEngine('17225', { intervalMs: 2000 });
        const engines = TrainEngineService.getRunningEngines();

        expect(engines.length).toBe(1);
        expect(TrainEngineService.isRunning('17225')).toBe(true);
        expect(TrainEngineService.getTimeUntilNextTick('17225')).not.toBeNull();
        expect(TrainEngineService.getTimeUntilNextTick('99999')).toBeNull();
    });

    it('stops all running engines', () => {
        TrainEngineService.startEngine('17225');
        TrainEngineService.startEngine('17226');
        TrainEngineService.stopAll();
        expect(TrainEngineService.getRunningEngines()).toHaveLength(0);
    });

    it('tick stops engine when train state is missing', async () => {
        TrainEngineService.startEngine('17225');
        trainController.getGlobalTrainState.mockReturnValue(null);
        await TrainEngineService._tick('17225');
        expect(TrainEngineService.isRunning('17225')).toBe(false);
    });

    it('tick stops engine when journey already complete', async () => {
        TrainEngineService.startEngine('17225');
        trainController.getGlobalTrainState.mockReturnValue({
            isJourneyComplete: jest.fn().mockReturnValue(true)
        });
        await TrainEngineService._tick('17225');
        expect(TrainEngineService.isRunning('17225')).toBe(false);
    });

    it('tick processes running journey and updates next tick', async () => {
        TrainEngineService.startEngine('17225', { intervalMs: 2000 });
        const trainState = {
            trainNo: '17225',
            journeyDate: '2025-12-20',
            journeyStarted: true,
            currentStationIdx: 0,
            stations: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
            stats: { totalPassengers: 10 },
            isJourneyComplete: jest.fn().mockReturnValue(false),
            unlockStationForUpgrades: jest.fn(),
            updateStats: jest.fn(),
            getCurrentStation: jest.fn().mockReturnValue({ name: 'B' })
        };
        trainController.getGlobalTrainState.mockReturnValue(trainState);

        await TrainEngineService._tick('17225');

        expect(StationEventService.processStationArrival).toHaveBeenCalled();
        expect(trainState.updateStats).toHaveBeenCalled();
        expect(RuntimeStateService.saveState).toHaveBeenCalled();
        expect(wsManager.broadcastStationArrival).toHaveBeenCalled();
        expect(wsManager.broadcastStatsUpdate).toHaveBeenCalled();
        expect(TrainEngineService.isRunning('17225')).toBe(true);
    });

    it('tick completes journey, broadcasts completion and stops engine', async () => {
        TrainEngineService.startEngine('17225', { intervalMs: 2000 });
        const trainState = {
            trainNo: '17225',
            journeyDate: '2025-12-20',
            journeyStarted: true,
            currentStationIdx: 0,
            stations: [{ name: 'A' }, { name: 'B' }],
            stats: { totalPassengers: 10, totalDeboarded: 2, totalNoShows: 1, totalRACUpgraded: 1 },
            isJourneyComplete: jest.fn()
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(true),
            unlockStationForUpgrades: jest.fn(),
            updateStats: jest.fn(),
            getCurrentStation: jest.fn().mockReturnValue({ name: 'B' })
        };
        trainController.getGlobalTrainState.mockReturnValue(trainState);

        await TrainEngineService._tick('17225');

        expect(wsManager.broadcastTrainUpdate).toHaveBeenCalledWith(
            'JOURNEY_COMPLETE',
            expect.objectContaining({ trainNo: '17225' })
        );
        expect(TrainEngineService.isRunning('17225')).toBe(false);
    });

    it('tick swallows processing errors and keeps engine alive', async () => {
        TrainEngineService.startEngine('17225');
        const trainState = {
            isJourneyComplete: jest.fn().mockReturnValue(false),
            currentStationIdx: 0,
            stations: [{ name: 'A' }, { name: 'B' }],
            getCurrentStation: jest.fn().mockReturnValue({ name: 'B' })
        };
        trainController.getGlobalTrainState.mockReturnValue(trainState);
        StationEventService.processStationArrival.mockRejectedValue(new Error('tick failed'));

        await expect(TrainEngineService._tick('17225')).resolves.toBeUndefined();
        expect(TrainEngineService.isRunning('17225')).toBe(true);
    });
});
