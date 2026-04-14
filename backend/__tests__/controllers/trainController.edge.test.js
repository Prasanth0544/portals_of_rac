jest.mock('../../services/DataService');
jest.mock('../../services/StationEventService');
jest.mock('../../services/RuntimeStateService');
jest.mock('../../services/TrainEngineService');
jest.mock('../../config/db');

const makeRes = () => ({
    json: jest.fn(),
    status: jest.fn().mockReturnThis()
});

describe('trainController edge paths', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.NODE_ENV = 'test';
        jest.resetModules();
    });

    it('startJourney returns 400 when train not initialized', async () => {
        const controller = require('../../controllers/trainController');
        const req = { body: {}, query: {} };
        const res = makeRes();

        await controller.startJourney(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Train not initialized' }));
    });

    it('getTrainStats returns 400 when train not initialized', () => {
        const controller = require('../../controllers/trainController');
        const req = { body: {}, query: {} };
        const res = makeRes();

        controller.getTrainStats(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Train not initialized' }));
    });

    it('getAllocationErrors returns 400 when train not initialized', () => {
        const controller = require('../../controllers/trainController');
        const req = { body: {}, query: {} };
        const res = makeRes();

        controller.getAllocationErrors(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Train not initialized' }));
    });

    it('getTrainState falls back to DB stations when no in-memory state', async () => {
        const db = require('../../config/db');
        const controller = require('../../controllers/trainController');
        const req = { body: {}, query: { trainNo: '17225' } };
        const res = makeRes();

        const trainDoc = {
            Train_Number: '17225',
            Train_Name: 'DB Train',
            Station_Collection_Name: 'stations_17225'
        };
        const rawStations = [
            { SNO: 1, Station_Code: 'BZA', Station_Name: 'Vijayawada' },
            { SNO: 2, Station_Code: 'RJY', Station_Name: 'Rajahmundry' }
        ];
        db.getDb.mockResolvedValue({
            collection: jest.fn((name) => {
                if (String(name).toLowerCase().includes('train')) {
                    return { findOne: jest.fn().mockResolvedValue(trainDoc) };
                }
                if (name === 'stations_17225') {
                    return {
                        find: jest.fn().mockReturnValue({
                            sort: jest.fn().mockReturnValue({
                                toArray: jest.fn().mockResolvedValue(rawStations)
                            })
                        })
                    };
                }
                return {};
            })
        });

        await controller.getTrainState(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                initialized: false,
                trainNo: '17225',
                stations: expect.arrayContaining([
                    expect.objectContaining({ code: 'BZA', idx: 0 }),
                    expect.objectContaining({ code: 'RJY', idx: 1 })
                ])
            })
        }));
    });

    it('getTrainState returns empty payload when DB has no train', async () => {
        const db = require('../../config/db');
        const controller = require('../../controllers/trainController');
        const req = { body: {}, query: { trainNo: '99999' } };
        const res = makeRes();

        db.getDb.mockResolvedValue({
            collection: jest.fn().mockReturnValue({
                findOne: jest.fn().mockResolvedValue(null)
            })
        });

        await controller.getTrainState(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                initialized: false,
                stations: [],
                coaches: [],
                racQueue: []
            })
        }));
    });

    it('moveToNextStation returns 400 when train not initialized', async () => {
        const controller = require('../../controllers/trainController');
        const req = { body: {}, query: {} };
        const res = makeRes();

        await controller.moveToNextStation(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('getGlobalTrainState resolves by exact and fallback paths', async () => {
        const db = require('../../config/db');
        const DataService = require('../../services/DataService');
        const controller = require('../../controllers/trainController');

        const state = {
            trainNo: '17225',
            trainName: 'X',
            journeyDate: '2025-01-01',
            stations: [{ code: 'A', name: 'A' }],
            coaches: [],
            racQueue: [],
            stats: { totalPassengers: 0, cnfPassengers: 0, racPassengers: 0 },
            getCurrentStation: jest.fn().mockReturnValue({ name: 'A' }),
            updateStats: jest.fn(),
            startJourney: jest.fn(),
            isJourneyComplete: jest.fn().mockReturnValue(false),
            unlockStationForUpgrades: jest.fn()
        };

        db.getPassengersDb.mockReturnValue({
            collection: jest.fn().mockReturnValue({ deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }) })
        });
        db.getDb.mockResolvedValue({
            collection: jest.fn().mockReturnValue({ updateOne: jest.fn().mockResolvedValue({}) })
        });
        DataService.getTrainName.mockResolvedValue('X');
        DataService.loadTrainData.mockResolvedValue(state);

        await controller.initializeTrain({ body: { trainNo: '17225', journeyDate: '2025-01-01' } }, makeRes());

        expect(controller.getGlobalTrainState('17225')).toBeTruthy();
        expect(controller.getGlobalTrainState(' 17225 ')).toBeTruthy();
        expect(controller.getGlobalTrainState('99999')).toBeTruthy();
    });

    it('getTrainState resolves numeric-equivalent train numbers via fallback iteration', async () => {
        const db = require('../../config/db');
        const DataService = require('../../services/DataService');
        const controller = require('../../controllers/trainController');

        const state = {
            trainNo: '17225',
            trainName: 'X',
            journeyDate: '2025-01-01',
            currentStationIdx: 0,
            journeyStarted: false,
            stations: [{ code: 'A', name: 'A' }],
            coaches: [],
            racQueue: [],
            stats: { totalPassengers: 0, cnfPassengers: 0, racPassengers: 0 },
            getCurrentStation: jest.fn().mockReturnValue({ name: 'A' }),
            updateStats: jest.fn(),
            startJourney: jest.fn(),
            isJourneyComplete: jest.fn().mockReturnValue(false),
            unlockStationForUpgrades: jest.fn()
        };

        db.getPassengersDb.mockReturnValue({
            collection: jest.fn().mockReturnValue({ deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }) })
        });
        db.getDb.mockResolvedValue({
            collection: jest.fn().mockReturnValue({ updateOne: jest.fn().mockResolvedValue({}) })
        });
        DataService.getTrainName.mockResolvedValue('X');
        DataService.loadTrainData.mockResolvedValue(state);

        await controller.initializeTrain({ body: { trainNo: '17225', journeyDate: '2025-01-01' } }, makeRes());

        const req = { body: {}, query: { trainNo: '017225' } };
        const res = makeRes();
        await controller.getTrainState(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({ trainNo: '17225' })
        }));
    });

    it('getTrainStats resolves numeric-equivalent train number fallback', async () => {
        const db = require('../../config/db');
        const DataService = require('../../services/DataService');
        const controller = require('../../controllers/trainController');

        const state = {
            trainNo: '17225',
            trainName: 'X',
            journeyDate: '2025-01-01',
            currentStationIdx: 0,
            journeyStarted: false,
            stations: [{ code: 'A', name: 'A' }],
            coaches: [],
            racQueue: [],
            stats: { totalPassengers: 0, cnfPassengers: 0, racPassengers: 0 },
            getCurrentStation: jest.fn().mockReturnValue({ name: 'A', code: 'A' }),
            updateStats: jest.fn(),
            startJourney: jest.fn(),
            isJourneyComplete: jest.fn().mockReturnValue(false),
            unlockStationForUpgrades: jest.fn()
        };

        db.getPassengersDb.mockReturnValue({
            collection: jest.fn().mockReturnValue({ deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }) })
        });
        db.getDb.mockResolvedValue({
            collection: jest.fn().mockReturnValue({ updateOne: jest.fn().mockResolvedValue({}) })
        });
        DataService.getTrainName.mockResolvedValue('X');
        DataService.loadTrainData.mockResolvedValue(state);

        await controller.initializeTrain({ body: { trainNo: '17225', journeyDate: '2025-01-01' } }, makeRes());

        const req = { body: {}, query: { trainNo: '017225' } };
        const res = makeRes();
        controller.getTrainStats(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                currentStation: expect.objectContaining({ code: 'A' })
            })
        }));
    });

    it('getTrainState returns empty payload when DB fallback throws', async () => {
        const db = require('../../config/db');
        const controller = require('../../controllers/trainController');
        const req = { body: {}, query: { trainNo: '17225' } };
        const res = makeRes();

        db.getDb.mockRejectedValue(new Error('db down'));

        await controller.getTrainState(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                initialized: false,
                stations: [],
                coaches: [],
                racQueue: []
            })
        }));
    });

    it('resetTrain returns 400 when train not initialized', async () => {
        const controller = require('../../controllers/trainController');
        const req = { body: { trainNo: '00000' }, query: {} };
        const res = makeRes();

        await controller.resetTrain(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Train not initialized'
        }));
    });

    it('getTrainStats returns 500 when current station resolution throws', async () => {
        const db = require('../../config/db');
        const DataService = require('../../services/DataService');
        const controller = require('../../controllers/trainController');

        const state = {
            trainNo: '17225',
            trainName: 'X',
            journeyDate: '2025-01-01',
            currentStationIdx: 0,
            journeyStarted: false,
            stations: [{ code: 'A', name: 'A' }],
            coaches: [],
            racQueue: [],
            stats: { totalPassengers: 0, cnfPassengers: 0, racPassengers: 0 },
            getCurrentStation: jest.fn(() => { throw new Error('station fail'); }),
            updateStats: jest.fn(),
            startJourney: jest.fn(),
            isJourneyComplete: jest.fn().mockReturnValue(false),
            unlockStationForUpgrades: jest.fn()
        };

        db.getPassengersDb.mockReturnValue({
            collection: jest.fn().mockReturnValue({ deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }) })
        });
        db.getDb.mockResolvedValue({
            collection: jest.fn().mockReturnValue({ updateOne: jest.fn().mockResolvedValue({}) })
        });
        DataService.getTrainName.mockResolvedValue('X');
        DataService.loadTrainData.mockResolvedValue(state);
        await controller.initializeTrain({ body: { trainNo: '17225', journeyDate: '2025-01-01' } }, makeRes());

        const req = { body: {}, query: { trainNo: '17225' } };
        const res = makeRes();
        controller.getTrainStats(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});
