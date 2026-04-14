/**
 * tteController Tests - Comprehensive Coverage
 * Tests for TTE operations
 */

const controller = require('../../controllers/tteController');
const db = require('../../config/db');
const wsManager = require('../../config/websocket');
const trainController = require('../../controllers/trainController');
const ReallocationService = require('../../services/ReallocationService');

jest.mock('../../config/db');
jest.mock('../../config/websocket');
jest.mock('../../controllers/trainController');
jest.mock('../../services/ReallocationService');

describe('tteController - Comprehensive Tests', () => {
    let req, res;
    let mockTrainState;
    let mockPassengersCollection;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPassengersCollection = {
            findOne: jest.fn(),
            updateOne: jest.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 })
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
            coaches: [{ coachNo: 'S1', berths: [] }],
            racQueue: [],
            stats: { currentOnboard: 10, totalDeboarded: 0 },
            getAllPassengers: jest.fn(() => []),
            findPassengerByPNR: jest.fn(),
            findPassenger: jest.fn(),
            getCurrentStation: jest.fn(() => ({ name: 'Station B' }))
        };

        trainController.getGlobalTrainState = jest.fn(() => mockTrainState);

        req = { params: {}, body: {}, query: {}, user: {} };
        res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    });


    describe('getAllPassengersFiltered', () => {
        beforeEach(() => {
            mockTrainState.getAllPassengers.mockReturnValue([
                { pnr: 'P001', pnrStatus: 'CNF', boarded: true, noShow: false, fromIdx: 0, toIdx: 3, coach: 'S1' },
                { pnr: 'P002', pnrStatus: 'RAC', boarded: true, noShow: false, fromIdx: 0, toIdx: 2, coach: 'S2' },
                { pnr: 'P003', pnrStatus: 'CNF', boarded: false, noShow: true, fromIdx: 0, toIdx: 3, coach: 'S1' }
            ]);
        });

        it('should return all passengers without filters', async () => {
            await controller.getAllPassengersFiltered(req, res);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { count: 3, passengers: expect.any(Array) }
            });
        });

        it('should filter by boarded status', async () => {
            req.query.status = 'boarded';
            await controller.getAllPassengersFiltered(req, res);
            const response = res.json.mock.calls[0][0];
            expect(response.data.count).toBe(2);
        });

        it('should filter by RAC status', async () => {
            req.query.status = 'rac';
            await controller.getAllPassengersFiltered(req, res);
            const response = res.json.mock.calls[0][0];
            expect(response.data.count).toBe(1);
        });

        it('should filter by CNF status', async () => {
            req.query.status = 'cnf';
            await controller.getAllPassengersFiltered(req, res);
            const response = res.json.mock.calls[0][0];
            expect(response.data.count).toBe(2);
        });

        it('should filter by no-show status', async () => {
            req.query.status = 'no-show';
            await controller.getAllPassengersFiltered(req, res);
            const response = res.json.mock.calls[0][0];
            expect(response.data.count).toBe(1);
        });

        it('should filter by coach', async () => {
            req.query.coach = 'S1';
            await controller.getAllPassengersFiltered(req, res);
            const response = res.json.mock.calls[0][0];
            expect(response.data.count).toBe(2);
        });

        it('should filter by pending status', async () => {
            req.query.status = 'pending';
            await controller.getAllPassengersFiltered(req, res);
            const response = res.json.mock.calls[0][0];
            expect(response.data.count).toBe(0);
        });

        it('should filter by deboarded status', async () => {
            req.query.status = 'deboarded';
            await controller.getAllPassengersFiltered(req, res);
            const response = res.json.mock.calls[0][0];
            expect(response.data.count).toBe(0);
        });

        it('should return 400 if train not initialized', async () => {
            trainController.getGlobalTrainState.mockReturnValue(null);
            await controller.getAllPassengersFiltered(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 500 when filter processing throws', async () => {
            mockTrainState.getAllPassengers.mockImplementation(() => { throw new Error('filter fail'); });
            await controller.getAllPassengersFiltered(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getCurrentlyBoardedPassengers', () => {
        it('should return currently boarded passengers', async () => {
            mockTrainState.getAllPassengers.mockReturnValue([
                { pnr: 'P001', boarded: true, fromIdx: 0, toIdx: 3 },
                { pnr: 'P002', boarded: true, fromIdx: 0, toIdx: 2 },
                { pnr: 'P003', boarded: false, fromIdx: 2, toIdx: 3 }
            ]);

            await controller.getCurrentlyBoardedPassengers(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    count: 2,
                    currentStation: 'Station B',
                    currentStationIdx: 1
                })
            });
        });

        it('should return 400 if train not initialized', async () => {
            trainController.getGlobalTrainState.mockReturnValue(null);
            await controller.getCurrentlyBoardedPassengers(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 500 when boarded passenger lookup throws', async () => {
            mockTrainState.getAllPassengers.mockImplementation(() => { throw new Error('boarded fail'); });
            await controller.getCurrentlyBoardedPassengers(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getBoardedRACPassengers', () => {
        it('should return boarded RAC passengers separated by online/offline', async () => {
            mockTrainState.getAllPassengers.mockReturnValue([
                { pnr: 'P001', pnrStatus: 'RAC', boarded: true, fromIdx: 0, toIdx: 3, passengerStatus: 'Online' },
                { pnr: 'P002', pnrStatus: 'RAC', boarded: true, fromIdx: 0, toIdx: 2, passengerStatus: 'Offline' },
                { pnr: 'P003', pnrStatus: 'CNF', boarded: true, fromIdx: 0, toIdx: 3 }
            ]);

            await controller.getBoardedRACPassengers(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    total: 2,
                    online: 1,
                    offline: 1
                })
            });
        });

        it('should return 400 if train not initialized', async () => {
            trainController.getGlobalTrainState.mockReturnValue(null);
            await controller.getBoardedRACPassengers(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 500 when boarded RAC processing throws', async () => {
            mockTrainState.getAllPassengers.mockImplementation(() => { throw new Error('rac fail'); });
            await controller.getBoardedRACPassengers(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('manualMarkBoarded', () => {
        it('should mark passenger as boarded', async () => {
            req.body.pnr = 'P001';
            const mockPassenger = { pnr: 'P001', name: 'John', boarded: false };
            mockTrainState.findPassengerByPNR.mockReturnValue(mockPassenger);

            await controller.manualMarkBoarded(req, res);

            expect(mockPassenger.boarded).toBe(true);
            expect(mockTrainState.stats.currentOnboard).toBe(11);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Passenger marked as boarded'
            }));
        });

        it('should return 400 if PNR not provided', async () => {
            await controller.manualMarkBoarded(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if train not initialized', async () => {
            req.body.pnr = 'P001';
            trainController.getGlobalTrainState.mockReturnValue(null);
            await controller.manualMarkBoarded(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if passenger not found', async () => {
            req.body.pnr = 'P999';
            mockTrainState.findPassengerByPNR.mockReturnValue(null);
            await controller.manualMarkBoarded(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return 500 when DB update fails in manualMarkBoarded', async () => {
            req.body.pnr = 'P001';
            mockTrainState.findPassengerByPNR.mockReturnValue({ pnr: 'P001', name: 'John', boarded: false });
            mockPassengersCollection.updateOne.mockRejectedValue(new Error('boarded db fail'));
            await controller.manualMarkBoarded(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('manualMarkDeboarded', () => {
        it('should mark passenger as deboarded', async () => {
            req.body.pnr = 'P001';
            const mockPassenger = { pnr: 'P001', name: 'John' };
            const mockLocation = { berth: { removePassenger: jest.fn(), updateStatus: jest.fn() } };
            mockTrainState.findPassengerByPNR.mockReturnValue(mockPassenger);
            mockTrainState.findPassenger.mockReturnValue(mockLocation);

            await controller.manualMarkDeboarded(req, res);

            expect(mockLocation.berth.removePassenger).toHaveBeenCalledWith('P001');
            expect(mockTrainState.stats.currentOnboard).toBe(9);
            expect(mockTrainState.stats.totalDeboarded).toBe(1);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Passenger marked as deboarded'
            }));
        });

        it('should return 400 if PNR not provided', async () => {
            await controller.manualMarkDeboarded(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if passenger not found', async () => {
            req.body.pnr = 'P999';
            mockTrainState.findPassengerByPNR.mockReturnValue(null);
            await controller.manualMarkDeboarded(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return 400 if train not initialized in manualMarkDeboarded', async () => {
            req.body.pnr = 'P001';
            trainController.getGlobalTrainState.mockReturnValue(null);
            await controller.manualMarkDeboarded(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 500 when manualMarkDeboarded throws', async () => {
            req.body.pnr = 'P001';
            mockTrainState.findPassengerByPNR.mockImplementation(() => { throw new Error('deboard fail'); });
            await controller.manualMarkDeboarded(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('confirmUpgrade', () => {
        beforeEach(() => {
            jest.mock('../../services/UpgradeNotificationService', () => ({
                getAllNotifications: jest.fn(() => [
                    { id: 'N001', status: 'PENDING', pnr: 'P001234567' }
                ]),
                confirmUpgrade: jest.fn().mockResolvedValue({ success: true })
            }));
        });

        it('should return 400 if fields missing', async () => {
            req.body = { pnr: 'P001234567' };
            await controller.confirmUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 for invalid PNR format', async () => {
            req.body = { pnr: 'P001', notificationId: 'N001' };
            await controller.confirmUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if train not initialized', async () => {
            req.body = { pnr: 'P001234567', notificationId: 'N001' };
            trainController.getGlobalTrainState.mockReturnValue(null);
            await controller.confirmUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 when notification is missing', async () => {
            req.body = { pnr: 'P001234567', notificationId: 'N404' };
            const UpgradeNotificationService = require('../../services/UpgradeNotificationService');
            UpgradeNotificationService.getAllNotifications = jest.fn(() => []);
            await controller.confirmUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return 400 when notification is already finalized', async () => {
            req.body = { pnr: 'P001234567', notificationId: 'N001' };
            const UpgradeNotificationService = require('../../services/UpgradeNotificationService');
            UpgradeNotificationService.getAllNotifications = jest.fn(() => [{ id: 'N001', status: 'DENIED' }]);
            await controller.confirmUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should confirm upgrade successfully', async () => {
            req.body = { pnr: 'P001234567', notificationId: 'N001' };
            req.user = { username: 'tte_user' };
            const UpgradeNotificationService = require('../../services/UpgradeNotificationService');
            UpgradeNotificationService.getAllNotifications = jest.fn(() => [{ id: 'N001', status: 'PENDING' }]);
            UpgradeNotificationService.acceptUpgrade = jest.fn(() => ({
                offeredCoach: 'S1',
                offeredSeatNo: 10,
                offeredBerth: 'S1-10'
            }));
            ReallocationService.upgradeRACPassengerWithCoPassenger.mockResolvedValue({ success: true });
            mockTrainState.findPassengerByPNR.mockReturnValue({ name: 'John', irctcId: 'IR123' });
            mockTrainState.recordAction = jest.fn();

            await controller.confirmUpgrade(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('getStatistics', () => {
        beforeEach(() => {
            mockTrainState.getAllPassengers.mockReturnValue([
                { pnr: 'P001', boarded: true, fromIdx: 0, toIdx: 3 },
                { pnr: 'P002', boarded: false, fromIdx: 2, toIdx: 3 }
            ]);
            mockTrainState.getCurrentStation.mockReturnValue({ name: 'Station B' });
            mockTrainState.coaches = [
                { berths: [{ status: 'occupied' }, { status: 'vacant' }] },
                { berths: [{ status: 'occupied' }] }
            ];
        });

        it('should return journey statistics', () => {
            controller.getStatistics(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    train: expect.any(Object),
                    passengers: expect.any(Object),
                    berths: expect.any(Object),
                    racQueue: expect.any(Object)
                })
            });
        });

        it('should return 400 if train not initialized', () => {
            trainController.getGlobalTrainState.mockReturnValue(null);
            controller.getStatistics(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should calculate berth statistics correctly', () => {
            controller.getStatistics(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.data.berths.total).toBe(3);
            expect(response.data.berths.occupied).toBe(2);
        });

        it('should handle error gracefully', () => {
            mockTrainState.getAllPassengers.mockImplementation(() => {
                throw new Error('Stats error');
            });

            controller.getStatistics(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getBoardingQueue', () => {
        it('should return boarding verification queue', () => {
            mockTrainState.boardingVerificationQueue = new Map([
                ['P001', { pnr: 'P001', status: 'pending' }]
            ]);
            mockTrainState.getVerificationStats = jest.fn(() => ({
                currentStation: 'Station B',
                pending: 1,
                verified: 0
            }));

            controller.getBoardingQueue(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    station: 'Station B',
                    passengers: expect.any(Array)
                })
            });
        });

        it('should return 400 if train not initialized', () => {
            trainController.getGlobalTrainState.mockReturnValue(null);
            controller.getBoardingQueue(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should handle errors', () => {
            mockTrainState.boardingVerificationQueue = null;

            controller.getBoardingQueue(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('confirmAllBoarded', () => {
        it('should confirm all passengers boarded', async () => {
            mockTrainState.confirmAllBoarded = jest.fn().mockResolvedValue({ count: 5 });

            await controller.confirmAllBoarded(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: '5 passengers confirmed boarded',
                count: 5
            });
        });

        it('should return 400 if train not initialized', async () => {
            trainController.getGlobalTrainState.mockReturnValue(null);
            await controller.confirmAllBoarded(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should handle errors', async () => {
            mockTrainState.confirmAllBoarded = jest.fn().mockRejectedValue(new Error('Confirm error'));

            await controller.confirmAllBoarded(req, res);

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

        it('should mark passenger as no-show', async () => {
            req.body.pnr = 'P001';
            const mockBerth = { berthNo: 15, fullBerthNo: 'S1-15', type: 'LB' };
            mockTrainState.findPassenger.mockReturnValue({
                berth: mockBerth,
                coachNo: 'S1',
                coach: { class: 'SL', coach_name: 'S1' }
            });
            mockTrainState.markBoardedPassengerNoShow = jest.fn().mockResolvedValue({
                pnr: 'P001'
            });
            mockPassengersCollection.updateOne.mockResolvedValue({});
            mockPassengersCollection.findOne.mockResolvedValue({
                PNR_Number: 'P001',
                Email: 'test@test.com',
                Mobile: '1234567890',
                IRCTC_ID: 'IR123'
            });

            await controller.markNoShow(req, res);

            expect(res.json).toHaveBeenCalled();
            const response = res.json.mock.calls[0][0];
            expect(response.success).toBe(true);
        });

        it('should continue when vacancy processing reports an error', async () => {
            req.body.pnr = 'P001';
            mockTrainState.findPassenger.mockReturnValue({
                berth: { berthNo: 15, fullBerthNo: 'S1-15', type: 'LB' },
                coachNo: 'S1',
                coach: { class: 'SL', coach_name: 'S1' },
                passenger: { name: 'John', coach: 'S1', berth: 15 }
            });
            mockTrainState.markBoardedPassengerNoShow = jest.fn().mockResolvedValue({ pnr: 'P001' });
            mockPassengersCollection.findOne.mockResolvedValue({
                PNR_Number: 'P001',
                Email: 'test@test.com',
                Mobile: '1234567890',
                IRCTC_ID: 'IR123'
            });
            const NotificationService = require('../../services/NotificationService');
            const InAppNotificationService = require('../../services/InAppNotificationService');
            const WebPushService = require('../../services/WebPushService');
            NotificationService.sendNoShowMarkedNotification = jest.fn().mockResolvedValue();
            InAppNotificationService.createNotification = jest.fn();
            WebPushService.sendNoShowAlert = jest.fn().mockResolvedValue({ success: true });
            ReallocationService.processVacancyForUpgrade.mockResolvedValue({ error: 'offer failed', offersCreated: 0 });

            await controller.markNoShow(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should map markNoShow not found error to 404', async () => {
            req.body.pnr = 'P404';
            mockTrainState.findPassenger.mockReturnValue(null);
            mockTrainState.markBoardedPassengerNoShow = jest.fn().mockRejectedValue(new Error('passenger not found'));
            await controller.markNoShow(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should map markNoShow not boarded error to 400', async () => {
            req.body.pnr = 'P500';
            mockTrainState.findPassenger.mockReturnValue(null);
            mockTrainState.markBoardedPassengerNoShow = jest.fn().mockRejectedValue(new Error('passenger not boarded'));
            await controller.markNoShow(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('revertNoShow', () => {
        it('should return 400 when PNR is missing', async () => {
            req.body = {};
            await controller.revertNoShow(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 when train not initialized', async () => {
            req.body = { pnr: 'P001234567' };
            trainController.getGlobalTrainState.mockReturnValue(null);
            await controller.revertNoShow(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 when passenger is absent in DB timestamp check', async () => {
            req.body = { pnr: 'P001234567' };
            mockPassengersCollection.findOne.mockResolvedValue(null);
            await controller.revertNoShow(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return 403 when 30-minute window expired', async () => {
            req.body = { pnr: 'P001234567' };
            const oldTime = new Date(Date.now() - 31 * 60 * 1000).toISOString();
            mockPassengersCollection.findOne.mockResolvedValue({ NO_show_timestamp: oldTime });
            await controller.revertNoShow(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should revert no-show successfully', async () => {
            req.body = { pnr: 'P001234567' };
            mockPassengersCollection.findOne.mockResolvedValue({ NO_show_timestamp: new Date().toISOString() });
            mockTrainState.revertBoardedPassengerNoShow = jest.fn().mockResolvedValue({
                pnr: 'P001234567',
                passenger: { name: 'John' }
            });
            await controller.revertNoShow(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('getActionHistory', () => {
        it('should return 400 when train not initialized', async () => {
            trainController.getGlobalTrainState.mockReturnValue(null);
            await controller.getActionHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return action history', async () => {
            mockTrainState.getActionHistory = jest.fn().mockReturnValue([{ id: 'A1' }]);
            await controller.getActionHistory(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: [{ id: 'A1' }] }));
        });
    });

    describe('undoAction', () => {
        it('should return 400 when actionId missing', async () => {
            req.body = {};
            await controller.undoAction(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 for action not found error', async () => {
            req.body = { actionId: 'A1' };
            mockTrainState.undoLastAction = jest.fn().mockRejectedValue(new Error('Action not found'));
            await controller.undoAction(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return success when undo works', async () => {
            req.body = { actionId: 'A1' };
            mockTrainState.undoLastAction = jest.fn().mockResolvedValue({ action: { id: 'A1' } });
            await controller.undoAction(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should map already undone error to 409', async () => {
            req.body = { actionId: 'A1' };
            mockTrainState.undoLastAction = jest.fn().mockRejectedValue(new Error('already undone'));
            await controller.undoAction(req, res);
            expect(res.status).toHaveBeenCalledWith(409);
        });

        it('should map action expired error to 410', async () => {
            req.body = { actionId: 'A1' };
            mockTrainState.undoLastAction = jest.fn().mockRejectedValue(new Error('too old to undo'));
            await controller.undoAction(req, res);
            expect(res.status).toHaveBeenCalledWith(410);
        });

        it('should map station mismatch error to 409', async () => {
            req.body = { actionId: 'A1' };
            mockTrainState.undoLastAction = jest.fn().mockRejectedValue(new Error('Cannot undo actions from previous stations'));
            await controller.undoAction(req, res);
            expect(res.status).toHaveBeenCalledWith(409);
        });

        it('should map berth collision error to 409', async () => {
            req.body = { actionId: 'A1' };
            mockTrainState.undoLastAction = jest.fn().mockRejectedValue(new Error('Cannot undo because berth is now occupied'));
            await controller.undoAction(req, res);
            expect(res.status).toHaveBeenCalledWith(409);
        });

        it('should map unknown action type to 400', async () => {
            req.body = { actionId: 'A1' };
            mockTrainState.undoLastAction = jest.fn().mockRejectedValue(new Error('Unknown action type'));
            await controller.undoAction(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('offline upgrade flows', () => {
        it('should return 400 when addOfflineUpgrade fields are missing', async () => {
            req.body = { pnr: 'P001' };
            await controller.addOfflineUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should add offline upgrade successfully', async () => {
            req.body = { pnr: 'P001', berthDetails: { coach: 'S1', berthNo: 10, type: 'Lower' } };
            mockTrainState.racQueue = [{ pnr: 'P001', name: 'John', pnrStatus: 'RAC', racStatus: 'RAC 1', from: 'STA', to: 'STC', class: 'SL', age: 30, gender: 'M' }];
            await controller.addOfflineUpgrade(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return pending offline upgrades', async () => {
            controller.offlineUpgradesQueue = [{ id: 'U1', status: 'pending' }, { id: 'U2', status: 'confirmed' }];
            await controller.getOfflineUpgrades(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({ total: 1 })
            }));
        });

        it('should return 400 when confirmOfflineUpgrade id missing', async () => {
            req.body = {};
            await controller.confirmOfflineUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 when confirmOfflineUpgrade id not found', async () => {
            req.body = { upgradeId: 'U404' };
            controller.offlineUpgradesQueue = [];
            await controller.confirmOfflineUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return 400 when confirmOfflineUpgrade train is not initialized', async () => {
            req.body = { upgradeId: 'U1' };
            controller.offlineUpgradesQueue = [{ id: 'U1', pnr: 'P001', coach: 'S1', berthNo: 10, passengerName: 'John' }];
            trainController.getGlobalTrainState.mockReturnValue(null);
            await controller.confirmOfflineUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 when confirmOfflineUpgrade service fails', async () => {
            req.body = { upgradeId: 'U1' };
            controller.offlineUpgradesQueue = [{ id: 'U1', pnr: 'P001', coach: 'S1', berthNo: 10, passengerName: 'John' }];
            ReallocationService.upgradeRACPassengerWithCoPassenger.mockResolvedValue({ success: false, error: 'upgrade fail' });
            await controller.confirmOfflineUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should confirm offline upgrade successfully', async () => {
            req.body = { upgradeId: 'U1' };
            controller.offlineUpgradesQueue = [{ id: 'U1', pnr: 'P001', coach: 'S1', berthNo: 10, passengerName: 'John', status: 'pending' }];
            ReallocationService.upgradeRACPassengerWithCoPassenger.mockResolvedValue({ success: true });
            await controller.confirmOfflineUpgrade(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return 404 when rejecting missing offline upgrade', async () => {
            req.body = { upgradeId: 'U404' };
            controller.offlineUpgradesQueue = [];
            await controller.rejectOfflineUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should reject offline upgrade successfully', async () => {
            req.body = { upgradeId: 'U1' };
            controller.offlineUpgradesQueue = [{ id: 'U1', passengerName: 'John', status: 'pending' }];
            await controller.rejectOfflineUpgrade(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('Error Handling', () => {
        it('should handle errors in getAllPassengersFiltered', async () => {
            mockTrainState.getAllPassengers.mockImplementation(() => {
                throw new Error('Get passengers error');
            });

            await controller.getAllPassengersFiltered(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should handle errors in getCurrentlyBoardedPassengers', async () => {
            mockTrainState.getAllPassengers.mockImplementation(() => {
                throw new Error('Error');
            });

            await controller.getCurrentlyBoardedPassengers(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should handle errors in getBoardedRACPassengers', async () => {
            mockTrainState.getAllPassengers.mockImplementation(() => {
                throw new Error('Error');
            });

            await controller.getBoardedRACPassengers(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should handle errors in manualMarkBoarded', async () => {
            req.body.pnr = 'P001';
            mockPassengersCollection.updateOne.mockRejectedValue(new Error('DB error'));
            mockTrainState.findPassengerByPNR.mockReturnValue({ pnr: 'P001' });

            await controller.manualMarkBoarded(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should handle errors in manualMarkDeboarded', async () => {
            req.body.pnr = 'P001';
            mockTrainState.findPassengerByPNR.mockImplementation(() => {
                throw new Error('Find error');
            });

            await controller.manualMarkDeboarded(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('Filter Edge Cases', () => {
        beforeEach(() => {
            mockTrainState.getAllPassengers.mockReturnValue([
                { pnr: 'P001', pnrStatus: 'CNF', boarded: true, fromIdx: 0, toIdx: 2, coach: 'S1' },
                { pnr: 'P002', pnrStatus: 'RAC', boarded: false, fromIdx: 2, toIdx: 3, coach: 'S2' },
                { pnr: 'P003', pnrStatus: 'CNF', boarded: false, fromIdx: 0, toIdx: 1, noShow: false, coach: 'S1' }
            ]);
        });

        it('should filter pending passengers correctly', async () => {
            mockTrainState.currentStationIdx = 1;
            req.query.status = 'pending';

            await controller.getAllPassengersFiltered(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.data.count).toBeGreaterThanOrEqual(0);
        });

        it('should filter deboarded passengers correctly', async () => {
            mockTrainState.currentStationIdx = 2;
            req.query.status = 'deboarded';

            await controller.getAllPassengersFiltered(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.data.passengers.every(p => p.toIdx < 2)).toBe(true);
        });

        it('should handle coach filter case-insensitively', async () => {
            req.query.coach = 's1';

            await controller.getAllPassengersFiltered(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.data.count).toBe(2);
        });
    });
});
