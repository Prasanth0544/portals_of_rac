/**
 * configController Tests - Comprehensive Coverage
 * Tests for configuration and database setup endpoints
 */

const configController = require('../../controllers/configController');
const db = require('../../config/db');
const { MongoClient } = require('mongodb');

jest.mock('../../config/db');
jest.mock('mongodb', () => ({
    MongoClient: jest.fn()
}));

describe('configController - Comprehensive Tests', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            body: {
                mongoUri: 'mongodb://localhost:27017',
                stationsDb: 'testStationsDb',
                stationsCollection: 'stations',
                passengersDb: 'testPassengersDb',
                passengersCollection: 'passengers',
                trainDetailsDb: 'testTrainDetailsDb',
                trainDetailsCollection: 'train_details',
                trainNo: '17225',
                trainName: 'Test Express',
                journeyDate: '2024-01-01'
            }
        };

        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        db.close = jest.fn().mockResolvedValue(undefined);
        db.connect = jest.fn().mockResolvedValue(undefined);
        db.getConfig = jest.fn().mockReturnValue({
            mongoUri: 'mongodb://localhost:27017',
            stationsDb: 'testStationsDb',
            stationsCollection: 'stations',
            passengersDb: 'testPassengersDb',
            passengersCollection: 'passengers',
            trainDetailsDb: 'testTrainDetailsDb',
            trainDetailsCollection: 'train_details',
            trainNo: '17225'
        });
    });

    describe('setup', () => {
        it('should setup configuration successfully', async () => {
            await configController.setup(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Configuration applied and database connected'
                })
            );
        });

        it('should store config in global.RAC_CONFIG', async () => {
            await configController.setup(req, res);

            expect(global.RAC_CONFIG).toBeDefined();
            expect(global.RAC_CONFIG.trainNo).toBe('17225');
            expect(global.RAC_CONFIG.trainName).toBe('Test Express');
        });

        it('should close existing database connection', async () => {
            await configController.setup(req, res);

            expect(db.close).toHaveBeenCalled();
        });

        it('should connect to database with new config', async () => {
            await configController.setup(req, res);

            expect(db.connect).toHaveBeenCalledWith(
                expect.objectContaining({
                    mongoUri: 'mongodb://localhost:27017',
                    trainNo: '17225'
                })
            );
        });

        it('should return config data in response', async () => {
            await configController.setup(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.data).toHaveProperty('mongoUri');
            expect(response.data).toHaveProperty('trainNo');
            expect(response.data).toHaveProperty('trainName');
        });

        it('should handle missing passengersDb by using stationsDb', async () => {
            req.body.passengersDb = undefined;

            await configController.setup(req, res);

            expect(global.RAC_CONFIG.passengersDb).toBe('testStationsDb');
        });

        it('should handle database close error gracefully', async () => {
            db.close.mockRejectedValue(new Error('Not connected'));

            await configController.setup(req, res);

            expect(db.connect).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: true })
            );
        });

        it('should handle database connection error', async () => {
            db.connect.mockRejectedValue(new Error('Connection failed'));

            await configController.setup(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Connection failed'
                })
            );
        });

        it('should preserve all config fields', async () => {
            await configController.setup(req, res);

            expect(global.RAC_CONFIG).toMatchObject({
                mongoUri: 'mongodb://localhost:27017',
                stationsDb: 'testStationsDb',
                stationsCollection: 'stations',
                passengersDb: 'testPassengersDb',
                passengersCollection: 'passengers',
                trainDetailsDb: 'testTrainDetailsDb',
                trainDetailsCollection: 'train_details',
                trainNo: '17225',
                trainName: 'Test Express',
                journeyDate: '2024-01-01'
            });
        });

        it('should handle minimal configuration', async () => {
            req.body = {
                mongoUri: 'mongodb://localhost:27017',
                stationsDb: 'db1',
                stationsCollection: 'stations',
                passengersCollection: 'passengers',
                trainDetailsCollection: 'details',
                trainNo: '12345'
            };

            await configController.setup(req, res);

            expect(global.RAC_CONFIG.passengersDb).toBe('db1');
        });

        it('should call getConfig to retrieve active configuration', async () => {
            await configController.setup(req, res);

            expect(db.getConfig).toHaveBeenCalled();
        });

        it('should include journey date in response', async () => {
            await configController.setup(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.data.journeyDate).toBe('2024-01-01');
        });

        it('should handle empty passengersDb field', async () => {
            req.body.passengersDb = '';

            await configController.setup(req, res);

            expect(global.RAC_CONFIG.passengersDb).toBe('testStationsDb');
        });

        it('should handle null passengersDb field', async () => {
            req.body.passengersDb = null;

            await configController.setup(req, res);

            expect(global.RAC_CONFIG.passengersDb).toBe('testStationsDb');
        });
    });

    describe('registerTrain', () => {
        it('returns 400 for missing trainNo/trainName', async () => {
            req.body = {};
            await configController.registerTrain(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 404 when station collection is missing', async () => {
            req.body = { trainNo: '17225', trainName: 'Test' };
            const racDb = {
                listCollections: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) })
            };
            db.getDb.mockResolvedValue({
                ...racDb,
                collection: jest.fn()
            });

            await configController.registerTrain(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 404 when passenger collection is missing', async () => {
            req.body = { trainNo: '17225', trainName: 'Test' };
            const trainsCollection = { findOne: jest.fn().mockResolvedValue(null) };
            const racDb = {
                listCollections: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{}]) }),
                collection: jest.fn().mockReturnValue(trainsCollection)
            };
            db.getDb.mockResolvedValue(racDb);

            const pDb = {
                listCollections: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) })
            };
            const mockClient = {
                connect: jest.fn().mockResolvedValue(),
                db: jest.fn().mockReturnValue(pDb),
                close: jest.fn().mockResolvedValue()
            };
            MongoClient.mockImplementation(() => mockClient);

            await configController.registerTrain(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('registers train successfully', async () => {
            req.body = { trainNo: '17225', trainName: 'Test', totalCoaches: 20 };
            const trainsCollection = {
                findOne: jest.fn().mockResolvedValue({ Passengers_Collection_Name: '17225_passengers' }),
                updateOne: jest.fn().mockResolvedValue({ acknowledged: true })
            };
            const racDb = {
                listCollections: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{}]) }),
                collection: jest.fn().mockReturnValue(trainsCollection)
            };
            db.getDb.mockResolvedValue(racDb);

            const pDb = {
                listCollections: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{}]) })
            };
            const mockClient = {
                connect: jest.fn().mockResolvedValue(),
                db: jest.fn().mockReturnValue(pDb),
                close: jest.fn().mockResolvedValue()
            };
            MongoClient.mockImplementation(() => mockClient);

            await configController.registerTrain(req, res);
            expect(trainsCollection.updateOne).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('registers train with optional coach counts', async () => {
            req.body = {
                trainNo: '17225',
                trainName: 'Test',
                totalCoaches: 20,
                sleeperCoachesCount: 12,
                threeTierACCoachesCount: 8
            };
            const trainsCollection = {
                findOne: jest.fn().mockResolvedValue({ Passengers_Collection_Name: '17225_passengers' }),
                updateOne: jest.fn().mockResolvedValue({ acknowledged: true })
            };
            const racDb = {
                listCollections: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{}]) }),
                collection: jest.fn().mockReturnValue(trainsCollection)
            };
            db.getDb.mockResolvedValue(racDb);
            const pDb = { listCollections: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{}]) }) };
            MongoClient.mockImplementation(() => ({
                connect: jest.fn().mockResolvedValue(),
                db: jest.fn().mockReturnValue(pDb),
                close: jest.fn().mockResolvedValue()
            }));

            await configController.registerTrain(req, res);
            expect(trainsCollection.updateOne).toHaveBeenCalled();
        });

        it('returns 500 when registerTrain throws unexpectedly', async () => {
            req.body = { trainNo: '17225', trainName: 'Test' };
            db.getDb.mockRejectedValue(new Error('register fail'));
            await configController.registerTrain(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('uses numeric Train_Number fallback when trainNo doc missing', async () => {
            req.body = { trainNo: '17225', trainName: 'Test' };
            const trainsCollection = {
                findOne: jest.fn()
                    .mockResolvedValueOnce(null)
                    .mockResolvedValueOnce({ passengersCollection: '17225_passengers' }),
                updateOne: jest.fn().mockResolvedValue({ acknowledged: true })
            };
            const racDb = {
                listCollections: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{}]) }),
                collection: jest.fn().mockReturnValue(trainsCollection)
            };
            db.getDb.mockResolvedValue(racDb);
            const pDb = { listCollections: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{}]) }) };
            MongoClient.mockImplementation(() => ({
                connect: jest.fn().mockResolvedValue(),
                db: jest.fn().mockReturnValue(pDb),
                close: jest.fn().mockResolvedValue()
            }));

            await configController.registerTrain(req, res);
            expect(trainsCollection.findOne).toHaveBeenCalledTimes(2);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('listTrains', () => {
        it('normalizes train document fields', async () => {
            const trainsCollection = {
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([{
                        Train_Number: 17225,
                        Train_Name: 'Legacy Name',
                        'Station_Collection_Name ': '17225_stations ',
                        Passengers_Collection_Name: '17225_passengers'
                    }])
                })
            };
            db.getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(trainsCollection) });

            await configController.listTrains(req, res);
            const payload = res.json.mock.calls[0][0];
            expect(payload.data[0]).toEqual(expect.objectContaining({
                trainNo: '17225',
                trainName: 'Legacy Name',
                stationsCollection: '17225_stations'
            }));
        });

        it('returns 500 when listTrains throws', async () => {
            db.getDb.mockRejectedValue(new Error('list fail'));
            await configController.listTrains(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getTrainConfig', () => {
        it('returns 400 when trainNo missing', async () => {
            req.params = {};
            await configController.getTrainConfig(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 404 when train not found', async () => {
            req.params = { trainNo: '99999' };
            const trainsCollection = { findOne: jest.fn().mockResolvedValue(null) };
            db.getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(trainsCollection) });
            await configController.getTrainConfig(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('includes numeric Train_Number fallback in lookup query', async () => {
            req.params = { trainNo: '17225' };
            const trainsCollection = {
                findOne: jest.fn().mockResolvedValue({
                    Train_Number: 17225,
                    Train_Name: 'Legacy Numeric',
                    Passengers_Collection_Name: '17225_passengers'
                })
            };
            db.getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(trainsCollection) });

            await configController.getTrainConfig(req, res);
            const query = trainsCollection.findOne.mock.calls[0][0];
            expect(JSON.stringify(query)).toContain('"Train_Number":17225');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('returns config for existing train', async () => {
            req.params = { trainNo: '17225' };
            const trainsCollection = {
                findOne: jest.fn().mockResolvedValue({
                    trainNo: '17225',
                    trainName: 'Test',
                    stationsCollection: '17225_stations',
                    passengersCollection: '17225_passengers'
                })
            };
            db.getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(trainsCollection) });
            await configController.getTrainConfig(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('normalizes legacy schema fields in train config response', async () => {
            req.params = { trainNo: '17225' };
            const trainsCollection = {
                findOne: jest.fn().mockResolvedValue({
                    Train_Number: 17225,
                    Train_Name: 'Legacy',
                    'Station_Collection_Name ': '17225_stations ',
                    Passengers_Collection_Name: '17225_passengers'
                })
            };
            db.getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(trainsCollection) });

            await configController.getTrainConfig(req, res);
            const payload = res.json.mock.calls[0][0];
            expect(payload.data.stationsCollection).toBe('17225_stations');
            expect(payload.data.passengersCollection).toBe('17225_passengers');
            expect(payload.data.trainName).toBe('Legacy');
        });

        it('uses default derived collection names when doc has no collection fields', async () => {
            req.params = { trainNo: '17225' };
            const trainsCollection = {
                findOne: jest.fn().mockResolvedValue({
                    trainNo: '17225',
                    trainName: 'No Collections'
                })
            };
            db.getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(trainsCollection) });

            await configController.getTrainConfig(req, res);
            const payload = res.json.mock.calls[0][0];
            expect(payload.data.stationsCollection).toBe('17225_stations');
            expect(payload.data.passengersCollection).toBe('17225_Passengers');
        });

        it('returns 500 when getTrainConfig throws', async () => {
            req.params = { trainNo: '17225' };
            db.getDb.mockRejectedValue(new Error('config fail'));
            await configController.getTrainConfig(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('updateTrainConfig', () => {
        it('returns 400 when trainNo is missing', async () => {
            req.params = {};
            req.body = { trainName: 'X' };
            await configController.updateTrainConfig(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 404 when target train does not exist', async () => {
            req.params = { trainNo: '17225' };
            req.body = { trainName: 'New' };
            const trainsCollection = { findOne: jest.fn().mockResolvedValue(null) };
            db.getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(trainsCollection) });

            await configController.updateTrainConfig(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('updates train config successfully', async () => {
            req.params = { trainNo: '17225' };
            req.body = {
                trainName: 'Updated Name',
                journeyDate: '2025-01-01',
                stationsCollection: 'stn_col',
                passengersCollection: 'pass_col'
            };
            const trainsCollection = {
                findOne: jest.fn().mockResolvedValue({ trainNo: '17225' }),
                updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
            };
            db.getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(trainsCollection) });

            await configController.updateTrainConfig(req, res);
            expect(trainsCollection.updateOne).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('updates only timestamp when optional fields are omitted', async () => {
            req.params = { trainNo: '17225' };
            req.body = {};
            const trainsCollection = {
                findOne: jest.fn().mockResolvedValue({ trainNo: '17225' }),
                updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
            };
            db.getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(trainsCollection) });

            await configController.updateTrainConfig(req, res);
            const call = trainsCollection.updateOne.mock.calls[0][1];
            expect(Object.keys(call.$set)).toContain('updatedAt');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('returns 500 when updateTrainConfig throws', async () => {
            req.params = { trainNo: '17225' };
            req.body = { trainName: 'X' };
            db.getDb.mockRejectedValue(new Error('update fail'));
            await configController.updateTrainConfig(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('updates using Train_Number filter when legacy doc matched', async () => {
            req.params = { trainNo: '17225' };
            req.body = { trainName: 'Legacy Updated' };
            const trainsCollection = {
                findOne: jest.fn()
                    .mockResolvedValueOnce(null)
                    .mockResolvedValueOnce({ Train_Number: 17225 }),
                updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
            };
            db.getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(trainsCollection) });

            await configController.updateTrainConfig(req, res);
            expect(trainsCollection.updateOne).toHaveBeenCalledWith(
                { Train_Number: 17225 },
                expect.any(Object)
            );
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });
});
