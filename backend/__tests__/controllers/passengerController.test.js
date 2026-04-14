/**
 * passengerController Tests - Comprehensive Coverage
 * Tests for passenger API endpoints
 */

const controller = require('../../controllers/passengerController');
const PassengerService = require('../../services/PassengerService');
const DataService = require('../../services/DataService');
const StationWiseApprovalService = require('../../services/StationWiseApprovalService');
const db = require('../../config/db');
const wsManager = require('../../config/websocket');
const trainController = require('../../controllers/trainController');

jest.mock('../../services/PassengerService');
jest.mock('../../services/DataService');
jest.mock('../../services/StationWiseApprovalService', () => ({
    approveBatch: jest.fn()
}));
jest.mock('../../config/db');
jest.mock('../../config/websocket');
jest.mock('../../controllers/trainController');

describe('passengerController - Comprehensive Tests', () => {
    let req, res;
    let mockTrainState;
    let mockPassengersCollection;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPassengersCollection = {
            findOne: jest.fn(),
            updateOne: jest.fn(),
            insertOne: jest.fn()
        };

        db.getPassengersCollection = jest.fn(() => mockPassengersCollection);
        wsManager.broadcastTrainUpdate = jest.fn();
        wsManager.broadcast = jest.fn();

        mockTrainState = {
            trainNo: '17225',
            trainName: 'Test Express',
            currentStationIdx: 1,
            stations: [
                { code: 'STA', name: 'Station A', idx: 0 },
                { code: 'STB', name: 'Station B', idx: 1 },
                { code: 'STC', name: 'Station C', idx: 2 }
            ],
            coaches: [{ coachNo: 'S1', class: 'SL', berths: [{ berthNo: 15, segmentOccupancy: [null, null, null], updateStatus: jest.fn() }] }],
            racQueue: [],
            stats: { totalPassengers: 10, vacantBerths: 5, totalNoShows: 0 },
            findPassengerByPNR: jest.fn(),
            findPassenger: jest.fn(),
            getAllPassengers: jest.fn(() => []),
            updateStats: jest.fn()
        };

        trainController.getGlobalTrainState = jest.fn(() => mockTrainState);

        req = { params: {}, body: {}, query: {}, user: {}, headers: {} };
        res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    });

    describe('getPNRDetails', () => {
        it('should return PNR details successfully', async () => {
            req.params.pnr = 'P001';
            PassengerService.getPassengerDetails.mockResolvedValue({ pnr: 'P001', name: 'John' });
            await controller.getPNRDetails(req, res);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: expect.any(Object) });
        });

        it('should return 400 if PNR not provided', async () => {
            await controller.getPNRDetails(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if PNR not found', async () => {
            req.params.pnr = 'P999';
            PassengerService.getPassengerDetails.mockRejectedValue(new Error('PNR not found'));
            await controller.getPNRDetails(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('getPassengerByIRCTC', () => {
        it('should return passenger by IRCTC ID', async () => {
            req.params.irctcId = 'IR_001';
            mockPassengersCollection.findOne.mockResolvedValue({ IRCTC_ID: 'IR_001' });
            await controller.getPassengerByIRCTC(req, res);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: expect.any(Object) });
        });

        it('should return 400 if IRCTC ID not provided', async () => {
            await controller.getPassengerByIRCTC(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if passenger not found', async () => {
            req.params.irctcId = 'IR_999';
            mockPassengersCollection.findOne.mockResolvedValue(null);
            await controller.getPassengerByIRCTC(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('getVacantBerths', () => {
        it('should return vacant berths list', async () => {
            global.trainState = mockTrainState;
            mockTrainState.coaches[0].berths[0].segments = [
                { status: 'vacant' },
                { status: 'vacant' },
                { status: 'occupied' }
            ];

            await controller.getVacantBerths(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        totalVacant: expect.any(Number),
                        vacantBerths: expect.any(Array)
                    })
                })
            );
        });

        it('should return 404 if train not initialized', async () => {
            global.trainState = null;

            await controller.getVacantBerths(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return 500 when getVacantBerths throws unexpectedly', async () => {
            global.trainState = { coaches: null };

            await controller.getVacantBerths(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('markNoShow', () => {
        it('should return 400 if PNR not provided', async () => {
            req.body = {};

            await controller.markNoShow(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if train not initialized', async () => {
            req.body.pnr = 'P001';
            trainController.getGlobalTrainState.mockReturnValue(null);

            await controller.markNoShow(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if PNR not found', async () => {
            req.body.pnr = 'P999';
            mockPassengersCollection.updateOne.mockResolvedValue({ matchedCount: 0 });

            await controller.markNoShow(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should mark passenger as no-show', async () => {
            req.body.pnr = 'P001';
            mockPassengersCollection.updateOne.mockResolvedValue({ matchedCount: 1 });
            const mockPassenger = { pnr: 'P001', noShow: false };
            mockTrainState.findPassengerByPNR.mockReturnValue(mockPassenger);
            mockTrainState.findPassenger.mockReturnValue({
                berth: {
                    removePassenger: jest.fn(),
                    updateStatus: jest.fn()
                }
            });

            await controller.markNoShow(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
            expect(mockPassenger.noShow).toBe(true);
        });

        it('should free up berth when marking no-show', async () => {
            req.body.pnr = 'P001';
            mockPassengersCollection.updateOne.mockResolvedValue({ matchedCount: 1 });

            const mockBerth = {
                removePassenger: jest.fn(),
                updateStatus: jest.fn()
            };
            mockTrainState.findPassengerByPNR.mockReturnValue({ pnr: 'P001', noShow: false });
            mockTrainState.findPassenger.mockReturnValue({ berth: mockBerth });

            await controller.markNoShow(req, res);

            expect(mockBerth.removePassenger).toHaveBeenCalledWith('P001');
            expect(mockBerth.updateStatus).toHaveBeenCalled();
        });

        it('should broadcast update on no-show', async () => {
            req.body.pnr = 'P001';
            mockPassengersCollection.updateOne.mockResolvedValue({ matchedCount: 1 });
            mockTrainState.findPassengerByPNR.mockReturnValue({ pnr: 'P001', noShow: false });
            mockTrainState.findPassenger.mockReturnValue(null);

            await controller.markNoShow(req, res);

            expect(wsManager.broadcastTrainUpdate).toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            req.body.pnr = 'P001';
            mockPassengersCollection.updateOne.mockRejectedValue(new Error('DB error'));

            await controller.markNoShow(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('Error Handling', () => {
        it('should handle database errors in getPassengerByIRCTC', async () => {
            req.params.irctcId = 'IR_001';
            mockPassengersCollection.findOne.mockRejectedValue(new Error('DB connection error'));

            await controller.getPassengerByIRCTC(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'DB connection error'
                })
            );
        });

        it('should handle PassengerService errors in getPNRDetails', async () => {
            req.params.pnr = 'P001';
            PassengerService.getPassengerDetails.mockRejectedValue(new Error('Service error'));

            await controller.getPNRDetails(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('selfRevertNoShow', () => {
        it('should return 400 if PNR not provided', async () => {
            await controller.selfRevertNoShow(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('subscribeToPush', () => {
        it('should subscribe to push notifications', async () => {
            req.body = { irctcId: 'IR123', subscription: { endpoint: 'https://push.example.com' } };
            const PushSubscriptionService = require('../../services/PushSubscriptionService');
            PushSubscriptionService.addSubscription = jest.fn().mockResolvedValue(true);

            await controller.subscribeToPush(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return 400 if fields missing', async () => {
            req.body = { irctcId: 'IR123' };
            await controller.subscribeToPush(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('unsubscribeFromPush', () => {
        it('should unsubscribe from push notifications', async () => {
            req.body = { irctcId: 'IR123', endpoint: 'https://push.example.com' };
            const PushSubscriptionService = require('../../services/PushSubscriptionService');
            PushSubscriptionService.removeSubscription = jest.fn().mockResolvedValue(true);

            await controller.unsubscribeFromPush(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return 400 if fields missing', async () => {
            req.body = { irctcId: 'IR123' };
            await controller.unsubscribeFromPush(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return not-found message when subscription is absent', async () => {
            req.body = { irctcId: 'IR123', endpoint: 'https://push.example.com' };
            const PushSubscriptionService = require('../../services/PushSubscriptionService');
            PushSubscriptionService.removeSubscription = jest.fn().mockResolvedValue(false);
            await controller.unsubscribeFromPush(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: expect.stringContaining('not found')
            }));
        });

        it('should return 500 when unsubscribe throws', async () => {
            req.body = { irctcId: 'IR123', endpoint: 'https://push.example.com' };
            const PushSubscriptionService = require('../../services/PushSubscriptionService');
            PushSubscriptionService.removeSubscription = jest.fn().mockRejectedValue(new Error('unsubscribe fail'));
            await controller.unsubscribeFromPush(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getVapidPublicKey', () => {
        it('should return vapid key', () => {
            const WebPushService = require('../../services/WebPushService');
            WebPushService.getVapidPublicKey = jest.fn().mockReturnValue('PUB_KEY');
            controller.getVapidPublicKey(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                publicKey: 'PUB_KEY'
            }));
        });

        it('should return 500 when key retrieval throws', () => {
            const WebPushService = require('../../services/WebPushService');
            WebPushService.getVapidPublicKey = jest.fn(() => { throw new Error('vapid fail'); });
            controller.getVapidPublicKey(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getAvailableBoardingStations', () => {
        it('should return available boarding stations', async () => {
            req.params.pnr = 'P001';
            mockPassengersCollection.findOne.mockResolvedValue({
                PNR_Number: 'P001',
                Boarding_Station: 'STA',
                boardingStationChanged: false
            });

            await controller.getAvailableBoardingStations(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return 400 if PNR not provided', async () => {
            await controller.getAvailableBoardingStations(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if passenger not found', async () => {
            req.params.pnr = 'P999';
            mockPassengersCollection.findOne.mockResolvedValue(null);
            await controller.getAvailableBoardingStations(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return alreadyChanged response from in-memory fallback passenger', async () => {
            req.params.pnr = 'P001';
            mockPassengersCollection.findOne.mockResolvedValue(null);
            mockTrainState.findPassengerByPNR = jest.fn().mockReturnValue({
                pnr: 'P001',
                from: 'STA',
                to: 'STC',
                boardingStationChanged: true
            });

            await controller.getAvailableBoardingStations(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                alreadyChanged: true
            }));
        });

        it('should return 400 when train route is not initialized', async () => {
            req.params.pnr = 'P001';
            mockPassengersCollection.findOne.mockResolvedValue({
                PNR_Number: 'P001',
                From: 'STA',
                To: 'STC',
                Boarding_Station: 'Station A',
                Deboarding_Station: 'Station C'
            });
            trainController.getGlobalTrainState.mockReturnValue({ stations: [] });

            await controller.getAvailableBoardingStations(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 when current boarding station cannot be mapped', async () => {
            req.params.pnr = 'P001';
            mockPassengersCollection.findOne.mockResolvedValue({
                PNR_Number: 'P001',
                From: 'XXX',
                To: 'STC',
                Boarding_Station: 'Unknown Station',
                Deboarding_Station: 'Station C'
            });
            mockTrainState.stations = [
                { code: 'STA', name: 'Station A', idx: 0 },
                { code: 'STB', name: 'Station B', idx: 1 },
                { code: 'STC', name: 'Station C', idx: 2 }
            ];

            await controller.getAvailableBoardingStations(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return available boarding stations successfully', async () => {
            req.params.pnr = 'P001';
            mockPassengersCollection.findOne.mockResolvedValue({
                PNR_Number: 'P001',
                From: 'STA',
                To: 'STC',
                Boarding_Station: 'Station A',
                Deboarding_Station: 'Station C'
            });
            mockTrainState.stations = [
                { code: 'STA', name: 'Station A', idx: 0, arrival: '10:00' },
                { code: 'STB', name: 'Station B', idx: 1, arrival: '11:00' },
                { code: 'STC', name: 'Station C', idx: 2, arrival: '12:00' }
            ];

            await controller.getAvailableBoardingStations(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                alreadyChanged: false,
                availableStations: expect.any(Array)
            }));
        });

        it('should return 500 when getAvailableBoardingStations throws', async () => {
            req.params.pnr = 'P001';
            mockPassengersCollection.findOne.mockRejectedValue(new Error('boarding fail'));
            await controller.getAvailableBoardingStations(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('changeBoardingStation', () => {
        it('should return 400 if fields missing', async () => {
            req.body = { pnr: 'P001' };
            await controller.changeBoardingStation(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if passenger not found', async () => {
            req.body = { pnr: 'P001', irctcId: 'IR1', newStationCode: 'STB' };
            mockPassengersCollection.findOne.mockResolvedValue(null);
            await controller.changeBoardingStation(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should validate new station forward rule', async () => {
            req.body = { pnr: 'P001', irctcId: 'IR1', newStationCode: 'STA' };
            mockPassengersCollection.findOne.mockResolvedValue({
                PNR_Number: 'P001',
                IRCTC_ID: 'IR1',
                From: 'STB',
                To: 'STC',
                Boarding_Station: 'Station B'
            });
            await controller.changeBoardingStation(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 for invalid station code', async () => {
            req.body = { pnr: 'P001', irctcId: 'IR1', newStationCode: 'XXX' };
            mockPassengersCollection.findOne.mockResolvedValue({
                PNR_Number: 'P001',
                IRCTC_ID: 'IR1',
                From: 'STA',
                To: 'STC',
                Boarding_Station: 'Station A'
            });
            await controller.changeBoardingStation(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 500 when update modifies zero documents', async () => {
            req.body = { pnr: 'P001', irctcId: 'IR1', newStationCode: 'STB' };
            mockPassengersCollection.findOne.mockResolvedValue({
                PNR_Number: 'P001',
                IRCTC_ID: 'IR1',
                From: 'STA',
                To: 'STC',
                Boarding_Station: 'Station A'
            });
            mockPassengersCollection.updateOne.mockResolvedValue({ modifiedCount: 0 });
            await controller.changeBoardingStation(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should change boarding station successfully and update memory passenger', async () => {
            req.body = { pnr: 'P001', irctcId: 'IR1', newStationCode: 'STB' };
            mockPassengersCollection.findOne.mockResolvedValue({
                PNR_Number: 'P001',
                IRCTC_ID: 'IR1',
                From: 'STA',
                To: 'STC',
                Boarding_Station: 'Station A'
            });
            mockPassengersCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
            mockTrainState.currentStationIdx = 0;
            mockTrainState.passengers = [{ pnr: 'P001', from: 'STA', fromIdx: 0 }];

            await controller.changeBoardingStation(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
            expect(mockTrainState.passengers[0].from).toBe('STB');
            expect(mockTrainState.passengers[0].fromIdx).toBe(1);
        });

        it('should return 500 when changeBoardingStation throws', async () => {
            req.body = { pnr: 'P001', irctcId: 'IR1', newStationCode: 'STB' };
            mockPassengersCollection.findOne.mockRejectedValue(new Error('lookup failed'));
            await controller.changeBoardingStation(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('selfCancelTicket', () => {
        it('should return 400 if fields missing', async () => {
            req.body = { pnr: 'P001' };
            await controller.selfCancelTicket(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 when passenger does not exist', async () => {
            req.body = { pnr: 'P001', irctcId: 'IR1' };
            mockPassengersCollection.findOne.mockResolvedValue(null);
            await controller.selfCancelTicket(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return 400 when already cancelled', async () => {
            req.body = { pnr: 'P001', irctcId: 'IR1' };
            mockPassengersCollection.findOne.mockResolvedValue({ NO_show: true });
            await controller.selfCancelTicket(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 500 when cancellation update fails', async () => {
            req.body = { pnr: 'P001', irctcId: 'IR1' };
            mockPassengersCollection.findOne.mockResolvedValue({ NO_show: false });
            mockPassengersCollection.updateOne.mockResolvedValue({ modifiedCount: 0 });
            await controller.selfCancelTicket(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should self-cancel successfully and free berth in memory', async () => {
            req.body = { pnr: 'P001', irctcId: 'IR1' };
            mockPassengersCollection.findOne.mockResolvedValue({
                NO_show: false,
                PNR_Number: 'P001',
                IRCTC_ID: 'IR1'
            });
            mockPassengersCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
            const removePassenger = jest.fn();
            const updateStatus = jest.fn();
            mockTrainState.findPassengerByPNR = jest.fn().mockReturnValue({ pnr: 'P001', noShow: false });
            mockTrainState.findPassenger = jest.fn().mockReturnValue({
                berth: { removePassenger, updateStatus }
            });

            await controller.selfCancelTicket(req, res);

            expect(removePassenger).toHaveBeenCalledWith('P001');
            expect(updateStatus).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return 500 when selfCancelTicket throws', async () => {
            req.body = { pnr: 'P001', irctcId: 'IR1' };
            mockPassengersCollection.findOne.mockRejectedValue(new Error('cancel lookup failed'));
            await controller.selfCancelTicket(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('selfRevertNoShow', () => {
        it('should return 400 if PNR missing', async () => {
            req.body = {};

            await controller.selfRevertNoShow(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if train not initialized', async () => {
            req.body.pnr = 'P001234567';
            trainController.getGlobalTrainState.mockReturnValue(null);

            await controller.selfRevertNoShow(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should revert no-show successfully', async () => {
            req.body.pnr = 'P001234567';
            mockTrainState.revertBoardedPassengerNoShow = jest.fn().mockResolvedValue({
                pnr: 'P001234567',
                passenger: { name: 'John' }
            });

            await controller.selfRevertNoShow(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: true })
            );
        });

        it('should map not found errors to 404', async () => {
            req.body.pnr = 'P001234567';
            mockTrainState.revertBoardedPassengerNoShow = jest.fn().mockRejectedValue(new Error('Passenger not found'));
            await controller.selfRevertNoShow(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should map not marked errors to 400', async () => {
            req.body.pnr = 'P001234567';
            mockTrainState.revertBoardedPassengerNoShow = jest.fn().mockRejectedValue(new Error('Passenger is not marked as NO-SHOW'));
            await controller.selfRevertNoShow(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should map cannot revert errors to 409', async () => {
            req.body.pnr = 'P001234567';
            mockTrainState.revertBoardedPassengerNoShow = jest.fn().mockRejectedValue(new Error('Cannot revert after journey complete'));
            await controller.selfRevertNoShow(req, res);
            expect(res.status).toHaveBeenCalledWith(409);
        });
    });

    describe('getAllPassengers', () => {
        it('should return all passengers', () => {
            mockTrainState.getAllPassengers.mockReturnValue([
                { pnr: 'P001', name: 'John' },
                { pnr: 'P002', name: 'Jane' }
            ]);

            controller.getAllPassengers(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    total: 2,
                    passengers: expect.any(Array)
                }
            });
        });

        it('should return 400 if train not initialized', () => {
            trainController.getGlobalTrainState.mockReturnValue(null);

            controller.getAllPassengers(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 500 when getAllPassengers throws', () => {
            mockTrainState.getAllPassengers = jest.fn(() => { throw new Error('all fail'); });
            controller.getAllPassengers(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getPassengerCounts', () => {
        it('should return passenger counts', () => {
            mockTrainState.getAllPassengers.mockReturnValue([
                { pnrStatus: 'CNF', boarded: true, noShow: false },
                { pnrStatus: 'RAC', boarded: false, noShow: false },
                { pnrStatus: 'CNF', boarded: false, noShow: true }
            ]);

            controller.getPassengerCounts(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    total: 3,
                    cnf: expect.any(Number),
                    rac: expect.any(Number)
                })
            });
        });

        it('should return 400 when train not initialized in getPassengerCounts', () => {
            trainController.getGlobalTrainState.mockReturnValue(null);
            controller.getPassengerCounts(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 500 when getPassengerCounts throws', () => {
            mockTrainState.getAllPassengers = jest.fn(() => { throw new Error('count fail'); });
            controller.getPassengerCounts(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getUpgradeNotifications', () => {
        it('should return upgrade notifications', () => {
            req.params.pnr = 'P001234567';
            const UpgradeNotificationService = require('../../services/UpgradeNotificationService');
            UpgradeNotificationService.getPendingNotifications = jest.fn(() => [
                { id: 'N001', status: 'PENDING' }
            ]);

            controller.getUpgradeNotifications(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    pnr: 'P001234567',
                    count: 1,
                    notifications: expect.any(Array)
                }
            });
        });

        it('should return 500 when getUpgradeNotifications throws', () => {
            req.params.pnr = 'P001234567';
            const UpgradeNotificationService = require('../../services/UpgradeNotificationService');
            UpgradeNotificationService.getPendingNotifications = jest.fn(() => { throw new Error('upgrade fail'); });
            controller.getUpgradeNotifications(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getInAppNotifications', () => {
        it('should return notifications', () => {
            req.query.irctcId = 'IR123';
            const InAppNotificationService = require('../../services/InAppNotificationService');
            InAppNotificationService.getNotifications = jest.fn(() => [
                { id: 'N001', type: 'UPGRADE_OFFER' }
            ]);
            InAppNotificationService.getStats = jest.fn(() => ({ total: 1, unread: 1 }));

            controller.getInAppNotifications(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: true })
            );
        });

        it('should return 400 if irctcId missing', () => {
            controller.getInAppNotifications(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getUnreadCount', () => {
        it('should return unread count', () => {
            req.query.irctcId = 'IR123';
            const InAppNotificationService = require('../../services/InAppNotificationService');
            InAppNotificationService.getUnreadCount = jest.fn(() => 5);

            controller.getUnreadCount(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { count: 5 }
            });
        });

        it('should return 400 when irctcId missing in getUnreadCount', () => {
            controller.getUnreadCount(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 500 when getUnreadCount throws', () => {
            req.query.irctcId = 'IR123';
            const InAppNotificationService = require('../../services/InAppNotificationService');
            InAppNotificationService.getUnreadCount = jest.fn(() => { throw new Error('unread fail'); });
            controller.getUnreadCount(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('markNotificationRead', () => {
        it('should mark notification as read', () => {
            req.params.id = 'N001';
            req.body.irctcId = 'IR123';
            const InAppNotificationService = require('../../services/InAppNotificationService');
            InAppNotificationService.markAsRead = jest.fn(() => ({ id: 'N001', read: true }));

            controller.markNotificationRead(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: true })
            );
        });

        it('should return 400 when irctcId missing in markNotificationRead', () => {
            req.params.id = 'N001';
            req.body = {};
            controller.markNotificationRead(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 when markNotificationRead throws', () => {
            req.params.id = 'N001';
            req.body.irctcId = 'IR123';
            const InAppNotificationService = require('../../services/InAppNotificationService');
            InAppNotificationService.markAsRead = jest.fn(() => { throw new Error('mark fail'); });
            controller.markNotificationRead(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('markAllNotificationsRead', () => {
        it('should mark all as read', () => {
            req.body.irctcId = 'IR123';
            const InAppNotificationService = require('../../services/InAppNotificationService');
            InAppNotificationService.markAllAsRead = jest.fn(() => 3);

            controller.markAllNotificationsRead(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: expect.stringContaining('3')
                })
            );
        });

        it('should return 400 when irctcId missing in markAllNotificationsRead', () => {
            req.body = {};
            controller.markAllNotificationsRead(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 500 when markAllNotificationsRead throws', () => {
            req.body.irctcId = 'IR123';
            const InAppNotificationService = require('../../services/InAppNotificationService');
            InAppNotificationService.markAllAsRead = jest.fn(() => { throw new Error('mark all fail'); });
            controller.markAllNotificationsRead(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });


    describe('getAvailableBoardingStations', () => {
        it('should return 400 if PNR missing', async () => {
            await controller.getAvailableBoardingStations(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if passenger not found', async () => {
            req.params.pnr = 'P999';
            mockPassengersCollection.findOne.mockResolvedValue(null);
            trainController.getGlobalTrainState.mockReturnValue(null);

            await controller.getAvailableBoardingStations(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('acceptUpgrade', () => {
        it('should return 400 if fields missing', async () => {
            req.body = { pnr: 'P001234567' };

            await controller.acceptUpgrade(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if train not initialized', async () => {
            req.body = { pnr: 'P001234567', notificationId: 'N1' };
            trainController.getGlobalTrainState.mockReturnValue(null);
            await controller.acceptUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should map not found errors to 404', async () => {
            req.body = { pnr: 'P001234567', notificationId: 'N1' };
            PassengerService.acceptUpgrade.mockRejectedValue(new Error('notification not found'));
            await controller.acceptUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should map expired errors to 400', async () => {
            req.body = { pnr: 'P001234567', notificationId: 'N1' };
            PassengerService.acceptUpgrade.mockRejectedValue(new Error('offer expired'));
            await controller.acceptUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should broadcast and return success for valid accept', async () => {
            req.body = { pnr: 'P001234567', notificationId: 'N1' };
            PassengerService.acceptUpgrade.mockResolvedValue({
                message: 'accepted',
                notification: { id: 'N1' },
                passenger: { pnr: 'P001234567' }
            });

            await controller.acceptUpgrade(req, res);
            expect(wsManager.broadcastTrainUpdate).toHaveBeenCalledWith(
                'RAC_UPGRADE_ACCEPTED',
                expect.objectContaining({ pnr: 'P001234567' })
            );
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('denyUpgrade', () => {
        it('should return 400 if fields missing', async () => {
            req.body = { pnr: 'P001234567' };

            await controller.denyUpgrade(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should map already handled errors to 400', async () => {
            req.body = { pnr: 'P001234567', notificationId: 'N1' };
            PassengerService.denyUpgrade.mockRejectedValue(new Error('already handled'));
            await controller.denyUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should map not found errors to 404', async () => {
            req.body = { pnr: 'P001234567', notificationId: 'N1' };
            PassengerService.denyUpgrade.mockRejectedValue(new Error('notification not found'));
            await controller.denyUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return 500 for unexpected deny errors', async () => {
            req.body = { pnr: 'P001234567', notificationId: 'N1' };
            PassengerService.denyUpgrade.mockRejectedValue(new Error('unexpected deny'));
            await controller.denyUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should broadcast and return success for valid deny flow', async () => {
            req.body = { pnr: 'P001234567', notificationId: 'N1', reason: 'not interested' };
            PassengerService.denyUpgrade.mockResolvedValue({
                message: 'denied',
                notification: { id: 'N1' }
            });

            await controller.denyUpgrade(req, res);
            expect(wsManager.broadcastTrainUpdate).toHaveBeenCalledWith(
                'RAC_UPGRADE_DENIED',
                expect.objectContaining({ pnr: 'P001234567', reason: 'not interested' })
            );
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('setPassengerStatus', () => {
        it('should return 400 when pnr or status missing', async () => {
            req.body = { pnr: 'P001' };
            await controller.setPassengerStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 for invalid status', async () => {
            req.body = { pnr: 'P001234567', status: 'invalid' };

            await controller.setPassengerStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if passenger not found', async () => {
            req.body = { pnr: 'P999', status: 'online' };
            mockTrainState.findPassenger.mockReturnValue(null);

            await controller.setPassengerStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should update RAC queue passenger status when present', async () => {
            req.body = { pnr: 'P001', status: 'online' };
            const passenger = { name: 'John', pnrStatus: 'RAC' };
            mockTrainState.findPassenger.mockReturnValue({ passenger });
            mockTrainState.racQueue = [{ pnr: 'P001', passengerStatus: 'Offline' }];
            mockPassengersCollection.updateOne.mockResolvedValue({ matchedCount: 1 });

            await controller.setPassengerStatus(req, res);

            expect(mockTrainState.racQueue[0].passengerStatus).toBe('Online');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return 400 when train not initialized in setPassengerStatus', async () => {
            req.body = { pnr: 'P001', status: 'online' };
            trainController.getGlobalTrainState.mockReturnValue(null);
            await controller.setPassengerStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 500 when setPassengerStatus outer catch is triggered', async () => {
            req.body = { pnr: 'P001', status: 'online' };
            mockTrainState.findPassenger = jest.fn(() => { throw new Error('status fail'); });
            await controller.setPassengerStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getPendingUpgrades', () => {
        it('should return 400 if irctcId missing', async () => {
            req.params = {};
            await controller.getPendingUpgrades(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return pending upgrades list', async () => {
            req.params.irctcId = 'IR_1';
            db.getStationReallocationCollection = jest.fn().mockReturnValue({
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([
                        {
                            _id: { toString: () => 'UP1' },
                            passengerPNR: 'PNR1',
                            passengerName: 'A',
                            currentBerth: 'RAC',
                            proposedCoach: 'S1',
                            proposedBerth: 10,
                            proposedBerthFull: 'S1-10',
                            proposedBerthType: 'Lower',
                            stationName: 'BZA',
                            createdAt: new Date()
                        }
                    ])
                })
            });

            await controller.getPendingUpgrades(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return 500 when pending upgrades query fails', async () => {
            req.params.irctcId = 'IR_1';
            db.getStationReallocationCollection = jest.fn().mockReturnValue({
                find: jest.fn(() => ({
                    toArray: jest.fn().mockRejectedValue(new Error('pending fail'))
                }))
            });

            await controller.getPendingUpgrades(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('approveUpgrade', () => {
        it('should return 400 when required fields missing', async () => {
            req.body = { upgradeId: 'UP1' };
            await controller.approveUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 when pending upgrade not found', async () => {
            req.body = { upgradeId: '665f7b27f3a4eb4a7f7f7f71', irctcId: 'IR_1' };
            db.getStationReallocationCollection = jest.fn().mockReturnValue({
                findOne: jest.fn().mockResolvedValue(null)
            });

            await controller.approveUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return 403 when pending upgrade belongs to another user', async () => {
            req.body = { upgradeId: '665f7b27f3a4eb4a7f7f7f71', irctcId: 'IR_1' };
            db.getStationReallocationCollection = jest.fn().mockReturnValue({
                findOne: jest.fn().mockResolvedValue({
                    passengerIrctcId: 'OTHER',
                    passengerPNR: 'PNR1',
                    proposedBerthFull: 'S1-10'
                })
            });

            await controller.approveUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should return 400 when train is not initialized', async () => {
            req.body = { upgradeId: '665f7b27f3a4eb4a7f7f7f71', irctcId: 'IR_1' };
            db.getStationReallocationCollection = jest.fn().mockReturnValue({
                findOne: jest.fn().mockResolvedValue({
                    passengerIrctcId: 'IR_1',
                    passengerPNR: 'PNR1',
                    proposedCoach: 'S1',
                    proposedBerthFull: 'S1-10'
                })
            });
            trainController.getGlobalTrainState.mockReturnValue(null);

            await controller.approveUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 when approveBatch has no approvals', async () => {
            req.body = { upgradeId: '665f7b27f3a4eb4a7f7f7f71', irctcId: 'IR_1' };
            db.getStationReallocationCollection = jest.fn().mockReturnValue({
                findOne: jest.fn().mockResolvedValue({
                    passengerIrctcId: 'IR_1',
                    passengerPNR: 'PNR1',
                    proposedCoach: 'S1',
                    proposedBerthFull: 'S1-10'
                })
            });
            StationWiseApprovalService.approveBatch.mockResolvedValue({
                totalApproved: 0,
                errors: ['No capacity']
            });

            await controller.approveUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should approve upgrade successfully when approveBatch succeeds', async () => {
            req.body = { upgradeId: '665f7b27f3a4eb4a7f7f7f71', irctcId: 'IR_1' };
            const stationReallocationCollection = {
                findOne: jest.fn().mockResolvedValue({
                    passengerIrctcId: 'IR_1',
                    passengerPNR: 'PNR1',
                    passengerName: 'A',
                    proposedCoach: 'S1',
                    proposedBerthFull: 'S1-10'
                }),
                updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
            };
            db.getStationReallocationCollection = jest.fn().mockReturnValue(stationReallocationCollection);
            StationWiseApprovalService.approveBatch.mockResolvedValue({
                totalApproved: 1,
                errors: []
            });

            await controller.approveUpgrade(req, res);
            expect(stationReallocationCollection.updateOne).toHaveBeenCalled();
            expect(wsManager.broadcastTrainUpdate).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('addPassenger', () => {
        beforeEach(() => {
            mockTrainState.stations = [
                { code: 'STA', name: 'Station A', idx: 0 },
                { code: 'STB', name: 'Station B', idx: 1 },
                { code: 'STC', name: 'Station C', idx: 2 }
            ];
            mockTrainState.coaches = [
                {
                    coach_name: 'S1',
                    class: 'SL',
                    berths: [
                        {
                            berth_no: 15,
                            berth_type: 'Lower',
                            segmentOccupancy: [[], [], []],
                            updateStatus: jest.fn()
                        }
                    ]
                }
            ];
            mockTrainState.racQueue = [];
            mockTrainState.stats = {
                totalPassengers: 10,
                cnfPassengers: 5,
                racPassengers: 2,
                vacantBerths: 1
            };
            db.getPassengersCollection.mockReturnValue(mockPassengersCollection);
        });

        it('should return 400 for missing required fields', async () => {
            req.body = { pnr: 'P1' };
            await controller.addPassenger(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 when train is not initialized', async () => {
            trainController.getGlobalTrainState.mockReturnValue(null);
            req.body = {
                irctc_id: 'IR1', pnr: 'P1', name: 'A', age: 25, gender: 'M',
                from: 'STA', to: 'STB', class: 'SL', coach: 'S1', seat_no: 15
            };
            await controller.addPassenger(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should add a CNF passenger successfully', async () => {
            req.body = {
                irctc_id: 'IR1', pnr: 'P1', name: 'A', age: 25, gender: 'M',
                from: 'STA', to: 'STC', class: 'SL', coach: 'S1', seat_no: 15, pnr_status: 'CNF'
            };
            DataService.findStation.mockImplementation((stations, code) => stations.find(s => s.code === code));
            mockPassengersCollection.findOne.mockResolvedValue(null);
            mockPassengersCollection.insertOne.mockResolvedValue({ acknowledged: true });

            await controller.addPassenger(req, res);

            expect(mockPassengersCollection.insertOne).toHaveBeenCalled();
            expect(mockTrainState.stats.totalPassengers).toBe(11);
            expect(mockTrainState.stats.cnfPassengers).toBe(6);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should add RAC passenger and sort racQueue', async () => {
            req.body = {
                irctc_id: 'IR2', pnr: 'P2', name: 'B', age: 30, gender: 'F',
                from: 'STA', to: 'STC', class: 'SL', coach: 'S1', seat_no: 15, pnr_status: 'RAC', rac_status: '3'
            };
            DataService.findStation.mockImplementation((stations, code) => stations.find(s => s.code === code));
            mockPassengersCollection.findOne.mockResolvedValue(null);
            mockPassengersCollection.insertOne.mockResolvedValue({ acknowledged: true });
            mockTrainState.racQueue = [{ pnr: 'OLD', racNumber: 5 }];

            await controller.addPassenger(req, res);

            expect(mockTrainState.racQueue[0].pnr).toBe('P2');
            expect(mockTrainState.stats.racPassengers).toBe(3);
        });

        it('should return 400 when station codes are invalid', async () => {
            req.body = {
                irctc_id: 'IR3', pnr: 'P3', name: 'C', age: 35, gender: 'M',
                from: 'XXX', to: 'STC', class: 'SL', coach: 'S1', seat_no: 15
            };
            DataService.findStation.mockImplementation((stations, code) => stations.find(s => s.code === code));
            await controller.addPassenger(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 when from station is after or equal to to station', async () => {
            req.body = {
                irctc_id: 'IR4', pnr: 'P4', name: 'D', age: 28, gender: 'F',
                from: 'STC', to: 'STB', class: 'SL', coach: 'S1', seat_no: 15
            };
            DataService.findStation.mockImplementation((stations, code) => stations.find(s => s.code === code));
            await controller.addPassenger(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 when PNR already exists', async () => {
            req.body = {
                irctc_id: 'IR5', pnr: 'P5', name: 'E', age: 26, gender: 'M',
                from: 'STA', to: 'STC', class: 'SL', coach: 'S1', seat_no: 15
            };
            DataService.findStation.mockImplementation((stations, code) => stations.find(s => s.code === code));
            mockPassengersCollection.findOne.mockResolvedValue({ pnr: 'P5' });
            await controller.addPassenger(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 when coach is invalid', async () => {
            req.body = {
                irctc_id: 'IR6', pnr: 'P6', name: 'F', age: 24, gender: 'M',
                from: 'STA', to: 'STC', class: 'SL', coach: 'S9', seat_no: 15
            };
            DataService.findStation.mockImplementation((stations, code) => stations.find(s => s.code === code));
            mockPassengersCollection.findOne.mockResolvedValue(null);
            await controller.addPassenger(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 when berth is invalid', async () => {
            req.body = {
                irctc_id: 'IR7', pnr: 'P7', name: 'G', age: 29, gender: 'F',
                from: 'STA', to: 'STC', class: 'SL', coach: 'S1', seat_no: 99
            };
            DataService.findStation.mockImplementation((stations, code) => stations.find(s => s.code === code));
            mockPassengersCollection.findOne.mockResolvedValue(null);
            await controller.addPassenger(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 when berth is unavailable for selected segment', async () => {
            req.body = {
                irctc_id: 'IR8', pnr: 'P8', name: 'H', age: 31, gender: 'M',
                from: 'STA', to: 'STC', class: 'SL', coach: 'S1', seat_no: 15
            };
            DataService.findStation.mockImplementation((stations, code) => stations.find(s => s.code === code));
            mockPassengersCollection.findOne.mockResolvedValue(null);
            mockTrainState.coaches[0].berths[0].segmentOccupancy = [['X'], ['Y'], ['Z']];
            await controller.addPassenger(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should update legacy segments when segments array exists', async () => {
            req.body = {
                irctc_id: 'IR9', pnr: 'P9', name: 'I', age: 27, gender: 'F',
                from: 'STA', to: 'STC', class: 'SL', coach: 'S1', seat_no: 15, pnr_status: 'CNF'
            };
            DataService.findStation.mockImplementation((stations, code) => stations.find(s => s.code === code));
            mockPassengersCollection.findOne.mockResolvedValue(null);
            mockPassengersCollection.insertOne.mockResolvedValue({ acknowledged: true });
            const berth = mockTrainState.coaches[0].berths[0];
            berth.segmentOccupancy = [[], [], []];
            berth.segments = [{ status: 'vacant' }, { status: 'vacant' }, { status: 'vacant' }];

            await controller.addPassenger(req, res);
            expect(berth.segments[0].status).toBe('occupied');
        });

        it('should return 500 when addPassenger throws unexpectedly', async () => {
            req.body = {
                irctc_id: 'IR10', pnr: 'P10', name: 'J', age: 29, gender: 'M',
                from: 'STA', to: 'STC', class: 'SL', coach: 'S1', seat_no: 15
            };
            DataService.findStation.mockImplementation((stations, code) => stations.find(s => s.code === code));
            mockPassengersCollection.findOne.mockResolvedValue(null);
            mockPassengersCollection.insertOne.mockRejectedValue(new Error('insert-fail'));

            await controller.addPassenger(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getPassengersByStatus', () => {
        beforeEach(() => {
            mockTrainState.currentStationIdx = 1;
            mockTrainState.getAllPassengers.mockReturnValue([
                { pnr: '1', pnrStatus: 'CNF', boarded: true, noShow: false, fromIdx: 0 },
                { pnr: '2', pnrStatus: 'RAC1', boarded: false, noShow: false, fromIdx: 2 },
                { pnr: '3', pnrStatus: 'CNF', boarded: false, noShow: true, fromIdx: 0 },
                { pnr: '4', pnrStatus: 'CNF', boarded: false, noShow: false, fromIdx: 0 }
            ]);
        });

        it('should filter by boarded status', () => {
            req.params.status = 'boarded';
            controller.getPassengersByStatus(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return 400 for invalid status', () => {
            req.params.status = 'unknown';
            controller.getPassengersByStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should filter CNF passengers', () => {
            req.params.status = 'cnf';
            controller.getPassengersByStatus(req, res);
            const payload = res.json.mock.calls[0][0];
            expect(payload.data.count).toBeGreaterThan(0);
        });

        it('should filter RAC passengers', () => {
            req.params.status = 'rac';
            controller.getPassengersByStatus(req, res);
            const payload = res.json.mock.calls[0][0];
            expect(payload.data.count).toBeGreaterThan(0);
        });

        it('should filter no-show passengers', () => {
            req.params.status = 'no-show';
            controller.getPassengersByStatus(req, res);
            const payload = res.json.mock.calls[0][0];
            expect(payload.data.count).toBe(1);
        });

        it('should filter upcoming passengers', () => {
            req.params.status = 'upcoming';
            controller.getPassengersByStatus(req, res);
            const payload = res.json.mock.calls[0][0];
            expect(payload.data.count).toBe(1);
        });

        it('should filter missed passengers', () => {
            req.params.status = 'missed';
            controller.getPassengersByStatus(req, res);
            const payload = res.json.mock.calls[0][0];
            expect(payload.data.count).toBe(1);
        });

        it('should return 400 when train is not initialized for status filter', () => {
            trainController.getGlobalTrainState.mockReturnValue(null);
            req.params.status = 'cnf';
            controller.getPassengersByStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 500 when getPassengersByStatus throws', () => {
            req.params.status = 'cnf';
            mockTrainState.getAllPassengers.mockImplementation(() => {
                throw new Error('status-fail');
            });
            controller.getPassengersByStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('helper coverage', () => {
        it('checkBerthAvailability returns false when no valid structure exists', () => {
            const result = controller.checkBerthAvailability({ type: 'Lower' }, 0, 1);
            expect(result).toBe(false);
        });

        it('countVacantBerths counts null occupancy at current station', () => {
            const count = controller.countVacantBerths({
                currentStationIdx: 1,
                coaches: [{ berths: [{ segmentOccupancy: [[], null] }, { segmentOccupancy: [[], ['X']] }] }]
            });
            expect(count).toBe(1);
        });
    });
});

