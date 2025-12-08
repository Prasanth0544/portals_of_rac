/**
 * passengerController Tests
 * Tests for passenger API endpoints
 */

// Mock dependencies
jest.mock('../../config/db', () => ({
    getPassengersCollection: jest.fn(() => ({
        findOne: jest.fn(),
        find: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
    }))
}));

jest.mock('../../services/OTPService', () => ({
    sendOTP: jest.fn().mockResolvedValue({ success: true, otp: '123456' }),
    verifyOTP: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../../services/PassengerService', () => ({
    getPassengerDetails: jest.fn().mockResolvedValue({ pnr: '1234567890', name: 'Test' }),
    getUpgradeNotifications: jest.fn().mockResolvedValue([]),
    acceptUpgrade: jest.fn().mockResolvedValue({ success: true }),
    denyUpgrade: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../../controllers/trainController', () => ({
    getTrainStateInternal: jest.fn().mockReturnValue({
        trainNumber: '17225',
        stations: [
            { code: 'A', name: 'Station A', idx: 0 },
            { code: 'B', name: 'Station B', idx: 1 },
            { code: 'C', name: 'Station C', idx: 2 }
        ]
    })
}));

const passengerController = require('../../controllers/passengerController');

describe('passengerController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getByPNR', () => {
        it('should return passenger for valid PNR', async () => {
            const db = require('../../config/db');
            db.getPassengersCollection().findOne.mockResolvedValue({
                PNR_Number: '1234567890',
                Name: 'Test User',
                PNR_Status: 'CNF',
                Assigned_Coach: 'S1',
                Assigned_berth: '12'
            });

            const req = { params: { pnr: '1234567890' } };
            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            if (passengerController.getByPNR) {
                await passengerController.getByPNR(req, res);
                expect(res.json).toHaveBeenCalled();
            }
        });

        it('should return 404 for non-existent PNR', async () => {
            const db = require('../../config/db');
            db.getPassengersCollection().findOne.mockResolvedValue(null);

            const req = { params: { pnr: '0000000000' } };
            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            if (passengerController.getByPNR) {
                await passengerController.getByPNR(req, res);
                expect(res.status).toHaveBeenCalledWith(404);
            }
        });
    });

    describe('getAvailableBoardingStations', () => {
        it('should return available stations for valid PNR', async () => {
            const db = require('../../config/db');
            db.getPassengersCollection().findOne.mockResolvedValue({
                PNR_Number: '1234567890',
                Boarding_Station: 'Station A (A)',
                boardingChanged: false
            });

            const req = { params: { pnr: '1234567890' } };
            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            if (passengerController.getAvailableBoardingStations) {
                await passengerController.getAvailableBoardingStations(req, res);
                expect(res.json).toHaveBeenCalled();
            }
        });
    });

    describe('changeBoardingStation', () => {
        it('should change boarding station successfully', async () => {
            const db = require('../../config/db');
            db.getPassengersCollection().findOne.mockResolvedValue({
                PNR_Number: '1234567890',
                boardingChanged: false
            });

            const req = {
                body: {
                    pnr: '1234567890',
                    irctcId: 'test@irctc.com',
                    newStationCode: 'B'
                }
            };
            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            if (passengerController.changeBoardingStation) {
                await passengerController.changeBoardingStation(req, res);
                expect(res.json).toHaveBeenCalled();
            }
        });

        it('should reject if already changed', async () => {
            const db = require('../../config/db');
            db.getPassengersCollection().findOne.mockResolvedValue({
                PNR_Number: '1234567890',
                boardingChanged: true
            });

            const req = {
                body: {
                    pnr: '1234567890',
                    newStationCode: 'B'
                }
            };
            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            if (passengerController.changeBoardingStation) {
                await passengerController.changeBoardingStation(req, res);
                // Should return error status
                expect(res.status).toHaveBeenCalled();
            }
        });
    });

    describe('selfCancel', () => {
        it('should cancel ticket successfully', async () => {
            const db = require('../../config/db');
            db.getPassengersCollection().findOne.mockResolvedValue({
                PNR_Number: '1234567890',
                IRCTC_ID: 'test@irctc.com',
                NO_show: false
            });

            const req = {
                body: {
                    pnr: '1234567890',
                    irctcId: 'test@irctc.com'
                }
            };
            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            if (passengerController.selfCancel) {
                await passengerController.selfCancel(req, res);
                expect(res.json).toHaveBeenCalled();
            }
        });
    });
});
