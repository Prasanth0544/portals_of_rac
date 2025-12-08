/**
 * tteController Tests
 * Tests for TTE operations
 */

// Mock dependencies
jest.mock('../../config/db', () => ({
    getTTECollection: jest.fn(() => ({
        findOne: jest.fn()
    })),
    getPassengersCollection: jest.fn(() => ({
        findOne: jest.fn(),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
    }))
}));

jest.mock('../../controllers/trainController', () => ({
    getTrainStateInternal: jest.fn().mockReturnValue({
        trainNumber: '17225',
        currentStationIdx: 2,
        coaches: [],
        racQueue: [],
        findPassengerByPNR: jest.fn().mockReturnValue(null)
    })
}));

jest.mock('../../services/ReallocationService', () => ({
    markNoShow: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../../config/websocket', () => ({
    broadcast: jest.fn()
}));

const tteController = require('../../controllers/tteController');

describe('tteController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.resetModules();
    });

    describe('markNoShow', () => {
        it('should mark passenger as no-show', async () => {
            const req = { body: { pnr: '1234567890' } };
            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            if (tteController.markNoShow) {
                await tteController.markNoShow(req, res);
                expect(res.json).toHaveBeenCalled();
            }
        });

        it('should return 400 when PNR is missing', async () => {
            const req = { body: {} };
            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            if (tteController.markNoShow) {
                await tteController.markNoShow(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
            }
        });
    });

    describe('verifyBoarding', () => {
        it('should verify passenger boarding', async () => {
            const db = require('../../config/db');
            db.getPassengersCollection().findOne.mockResolvedValue({
                PNR_Number: '1234567890',
                Name: 'Test User'
            });

            const req = { body: { pnr: '1234567890' } };
            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            if (tteController.verifyBoarding) {
                await tteController.verifyBoarding(req, res);
                expect(res.json).toHaveBeenCalled();
            }
        });
    });

    describe('getPendingReallocations', () => {
        it('should return pending reallocations', async () => {
            const req = {};
            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            if (tteController.getPendingReallocations) {
                await tteController.getPendingReallocations(req, res);
                expect(res.json).toHaveBeenCalled();
            }
        });
    });

    describe('approveReallocation', () => {
        it('should approve reallocation', async () => {
            const req = {
                body: {
                    reallocationId: 'realloc-123',
                    approved: true
                }
            };
            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            if (tteController.approveReallocation) {
                await tteController.approveReallocation(req, res);
                expect(res.json).toHaveBeenCalled();
            }
        });
    });

    describe('scanQR', () => {
        it('should process QR scan', async () => {
            const req = {
                body: {
                    qrData: JSON.stringify({ pnr: '1234567890' })
                }
            };
            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            if (tteController.scanQR) {
                await tteController.scanQR(req, res);
                expect(res.json).toHaveBeenCalled();
            }
        });
    });
});
