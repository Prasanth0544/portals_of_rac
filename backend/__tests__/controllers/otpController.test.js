/**
 * otpController Tests
 * Tests based on ACTUAL implementation
 */

jest.mock('../../services/OTPService');
jest.mock('../../config/db');

const otpController = require('../../controllers/otpController');
const OTPService = require('../../services/OTPService');
const db = require('../../config/db');

describe('otpController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {}
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('sendOTP', () => {
        it('should send OTP successfully', async () => {
            req.body = {
                irctcId: 'TEST123',
                pnr: '1234567890',
                purpose: 'ticket cancellation'
            };

            const mockPassenger = {
                PNR_Number: '1234567890',
                IRCTC_ID: 'TEST123',
                Email: 'test@example.com'
            };

            db.getPassengersCollection.mockReturnValue({
                findOne: jest.fn().mockResolvedValue(mockPassenger)
            });

            OTPService.sendOTP.mockResolvedValue({
                success: true,
                expiresIn: 300,
                emailSent: true
            });

            await otpController.sendOTP(req, res);

            expect(OTPService.sendOTP).toHaveBeenCalledWith(
                'TEST123',
                '1234567890',
                'test@example.com',
                'ticket cancellation'
            );
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: expect.stringContaining('OTP sent'),
                    expiresIn: 300
                })
            );
        });


        it('should return 400 if pnr is missing', async () => {
            req.body = { irctcId: 'TEST123' };

            await otpController.sendOTP(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if passenger not found', async () => {
            req.body = {
                irctcId: 'TEST123',
                pnr: '1234567890'
            };

            db.getPassengersCollection.mockReturnValue({
                findOne: jest.fn().mockResolvedValue(null)
            });

            await otpController.sendOTP(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: expect.stringContaining('not found')
                })
            );
        });

        it('should return 403 if IRCTC ID does not match', async () => {
            req.body = {
                irctcId: 'WRONG123',
                pnr: '1234567890'
            };

            const mockPassenger = {
                PNR_Number: '1234567890',
                IRCTC_ID: 'TEST123',
                Email: 'test@example.com'
            };

            db.getPassengersCollection.mockReturnValue({
                findOne: jest.fn().mockResolvedValue(mockPassenger)
            });

            await otpController.sendOTP(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('does not match')
                })
            );
        });


        it('should mask email in response', async () => {
            req.body = {
                irctcId: 'TEST123',
                pnr: '1234567890'
            };

            const mockPassenger = {
                PNR_Number: '1234567890',
                IRCTC_ID: 'TEST123',
                Email: 'testuser@example.com'
            };

            db.getPassengersCollection.mockReturnValue({
                findOne: jest.fn().mockResolvedValue(mockPassenger)
            });

            OTPService.sendOTP.mockResolvedValue({
                success: true,
                expiresIn: 300,
                emailSent: true
            });

            await otpController.sendOTP(req, res);

            const call = res.json.mock.calls[0][0];
            expect(call.message).toContain('***');
            expect(call.message).not.toContain('testuser');
        });

        it('should use default purpose if not provided', async () => {
            req.body = {
                irctcId: 'TEST123',
                pnr: '1234567890'
            };

            const mockPassenger = {
                PNR_Number: '1234567890',
                IRCTC_ID: 'TEST123',
                Email: 'test@example.com'
            };

            db.getPassengersCollection.mockReturnValue({
                findOne: jest.fn().mockResolvedValue(mockPassenger)
            });

            OTPService.sendOTP.mockResolvedValue({
                success: true,
                expiresIn: 300,
                emailSent: true
            });

            await otpController.sendOTP(req, res);

            expect(OTPService.sendOTP).toHaveBeenCalledWith(
                'TEST123',
                '1234567890',
                'test@example.com',
                'ticket action'
            );
        });

        it('should handle OTP service errors', async () => {
            req.body = {
                irctcId: 'TEST123',
                pnr: '1234567890'
            };

            const mockPassenger = {
                PNR_Number: '1234567890',
                IRCTC_ID: 'TEST123',
                Email: 'test@example.com'
            };

            db.getPassengersCollection.mockReturnValue({
                findOne: jest.fn().mockResolvedValue(mockPassenger)
            });

            OTPService.sendOTP.mockRejectedValue(new Error('Email service unavailable'));

            await otpController.sendOTP(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Email service unavailable'
                })
            );
        });

        it('should support fallback lookup when primary collection access fails', async () => {
            req.body = { irctcId: 'TEST123', pnr: '1234567890' };
            db.getPassengersCollection.mockImplementation(() => {
                throw new Error('primary fail');
            });
            const trainsCol = {
                find: jest.fn(() => ({
                    toArray: jest.fn().mockResolvedValue([{ Passengers_Collection_Name: 'pax_col' }])
                }))
            };
            const passengersDb = {
                collection: jest.fn(() => ({
                    findOne: jest.fn().mockResolvedValue({
                        PNR_Number: '1234567890',
                        IRCTC_ID: 'TEST123',
                        Email: 'fallback@example.com'
                    })
                }))
            };
            db.getPassengersDb.mockReturnValue(passengersDb);
            db.getDb.mockResolvedValue({
                collection: jest.fn(() => trainsCol)
            });
            OTPService.sendOTP.mockResolvedValue({ expiresIn: 300, otp: '123456', emailSent: true });

            await otpController.sendOTP(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return not found when both primary and fallback passenger lookups fail', async () => {
            req.body = { irctcId: 'TEST123', pnr: '1234567890' };
            db.getPassengersCollection.mockImplementation(() => {
                throw new Error('primary fail');
            });
            db.getPassengersDb.mockImplementation(() => {
                throw new Error('fallback fail');
            });
            db.getDb.mockResolvedValue({ collection: jest.fn() });

            await otpController.sendOTP(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should use in-memory passenger fallback when DB lookup fails', async () => {
            jest.resetModules();
            jest.doMock('../../services/OTPService');
            jest.doMock('../../config/db');
            jest.doMock('../../controllers/trainController', () => ({
                getGlobalTrainState: jest.fn(() => ({
                    findPassengerByPNR: jest.fn(() => ({
                        pnr: '1234567890',
                        irctcId: 'TEST123',
                        email: 'memory@example.com',
                        name: 'Memory User'
                    }))
                }))
            }));
            const localController = require('../../controllers/otpController');
            const localOtpService = require('../../services/OTPService');
            const localDb = require('../../config/db');

            const localReq = { body: { pnr: '1234567890', irctcId: 'TEST123' } };
            const localRes = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            localDb.getPassengersCollection.mockReturnValue({
                findOne: jest.fn().mockResolvedValue(null)
            });
            localOtpService.sendOTP.mockResolvedValue({ expiresIn: 300, otp: '123456', emailSent: true });

            await localController.sendOTP(localReq, localRes);
            expect(localRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should fallback email from passenger accounts when passenger email missing', async () => {
            req.body = { pnr: '1234567890', irctcId: 'TEST123' };
            db.getPassengersCollection.mockReturnValue({
                findOne: jest.fn().mockResolvedValue({
                    PNR_Number: '1234567890',
                    IRCTC_ID: 'TEST123'
                })
            });
            db.getDb.mockResolvedValue({
                collection: jest.fn(() => ({
                    findOne: jest.fn().mockResolvedValue({ email: 'account@example.com' })
                }))
            });
            OTPService.sendOTP.mockResolvedValue({ expiresIn: 300, otp: '123456', emailSent: true });

            await otpController.sendOTP(req, res);
            expect(OTPService.sendOTP).toHaveBeenCalledWith(
                'TEST123',
                '1234567890',
                'account@example.com',
                'ticket action'
            );
        });

        it('should use demo email fallback when no email found anywhere', async () => {
            req.body = { pnr: '1234567890', irctcId: 'TEST123' };
            db.getPassengersCollection.mockReturnValue({
                findOne: jest.fn().mockResolvedValue({
                    PNR_Number: '1234567890',
                    IRCTC_ID: 'TEST123'
                })
            });
            db.getDb.mockResolvedValue({
                collection: jest.fn(() => ({
                    findOne: jest.fn().mockResolvedValue(null)
                }))
            });
            OTPService.sendOTP.mockResolvedValue({ expiresIn: 300, otp: '123456', emailSent: false });

            await otpController.sendOTP(req, res);
            expect(OTPService.sendOTP).toHaveBeenCalledWith(
                'TEST123',
                '1234567890',
                'demo-passenger@indianrailways.gov.in',
                'ticket action'
            );
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    emailSent: false,
                    message: expect.stringContaining('email delivery failed')
                })
            );
        });

        it('should continue with demo email when account email fallback lookup fails', async () => {
            req.body = { pnr: '1234567890', irctcId: 'TEST123' };
            db.getPassengersCollection.mockReturnValue({
                findOne: jest.fn().mockResolvedValue({
                    PNR_Number: '1234567890',
                    IRCTC_ID: 'TEST123'
                })
            });
            db.getDb.mockRejectedValue(new Error('account lookup fail'));
            OTPService.sendOTP.mockResolvedValue({ expiresIn: 300, otp: '123456', emailSent: false });

            await otpController.sendOTP(req, res);
            expect(OTPService.sendOTP).toHaveBeenCalledWith(
                'TEST123',
                '1234567890',
                'demo-passenger@indianrailways.gov.in',
                'ticket action'
            );
        });
    });

    describe('verifyOTP', () => {
        it('should verify OTP successfully', async () => {
            req.body = {
                irctcId: 'TEST123',
                pnr: '1234567890',
                otp: '123456'
            };

            OTPService.verifyOTP.mockResolvedValue({
                success: true,
                message: 'OTP verified'
            });

            await otpController.verifyOTP(req, res);

            expect(OTPService.verifyOTP).toHaveBeenCalledWith('TEST123', '1234567890', '123456');
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    verified: true
                })
            );
        });


        it('should return 400 if pnr is missing', async () => {
            req.body = { irctcId: 'TEST123', otp: '123456' };

            await otpController.verifyOTP(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if otp is missing', async () => {
            req.body = { irctcId: 'TEST123', pnr: '1234567890' };

            await otpController.verifyOTP(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 for invalid OTP', async () => {
            req.body = {
                irctcId: 'TEST123',
                pnr: '1234567890',
                otp: '999999'
            };

            OTPService.verifyOTP.mockResolvedValue({
                success: false,
                message: 'Invalid OTP'
            });

            await otpController.verifyOTP(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    verified: false,
                    message: 'Invalid OTP'
                })
            );
        });

        it('should handle verification service errors', async () => {
            req.body = {
                irctcId: 'TEST123',
                pnr: '1234567890',
                otp: '123456'
            };

            OTPService.verifyOTP.mockRejectedValue(new Error('Database error'));

            await otpController.verifyOTP(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    verified: false
                })
            );
        });

        it('should infer IRCTC id from passengers collection when missing in request', async () => {
            req.body = { pnr: '1234567890', otp: '123456' };
            db.getPassengersCollection.mockReturnValue({
                findOne: jest.fn().mockResolvedValue({ IRCTC_ID: 'INF123' })
            });
            OTPService.verifyOTP.mockResolvedValue({ success: true, message: 'ok' });

            await otpController.verifyOTP(req, res);
            expect(OTPService.verifyOTP).toHaveBeenCalledWith('INF123', '1234567890', '123456');
        });

        it('should fallback to demo_user when inferring IRCTC fails', async () => {
            req.body = { pnr: '1234567890', otp: '123456' };
            db.getPassengersCollection.mockImplementation(() => {
                throw new Error('collection fail');
            });
            OTPService.verifyOTP.mockResolvedValue({ success: true, message: 'ok' });

            await otpController.verifyOTP(req, res);
            expect(OTPService.verifyOTP).toHaveBeenCalledWith('demo_user', '1234567890', '123456');
        });
    });
});

// 15 tests for otpController
