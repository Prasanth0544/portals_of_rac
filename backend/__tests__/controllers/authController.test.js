/**
 * authController Tests
 * Tests based on ACTUAL implementation
 * Handles staff and passenger authentication
 */

// Mock dependencies BEFORE requiring controller
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../config/db');
jest.mock('../../services/RefreshTokenService');
jest.mock('../../services/PassengerService');
jest.mock('../../services/NotificationService', () => ({
    emailTransporter: {
        sendMail: jest.fn().mockResolvedValue(true)
    }
}));
jest.mock('../../controllers/trainController', () => ({
    getGlobalTrainState: jest.fn()
}));

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authController = require('../../controllers/authController');
const db = require('../../config/db');
const RefreshTokenService = require('../../services/RefreshTokenService');
const PassengerService = require('../../services/PassengerService');
const trainController = require('../../controllers/trainController');

describe('authController', () => {
    let req, res;

    beforeEach(() => {
        // Reset request and response objects
        req = {
            body: {},
            user: null
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            cookie: jest.fn()
        };

        // Set test environment
        process.env.NODE_ENV = 'test';

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('staffLogin', () => {
        it('should login staff user with valid credentials', async () => {
            req.body = {
                employeeId: 'ADMIN_01',
                password: 'password123'
            };

            const mockUser = {
                employeeId: 'ADMIN_01',
                name: 'Admin User',
                email: 'admin@railway.com',
                role: 'ADMIN',
                trainAssigned: '17225',
                permissions: ['all'],
                passwordHash: 'hashed_password',
                active: true
            };

            const mockCollection = {
                findOne: jest.fn().mockResolvedValue(mockUser),
                updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
            };

            db.getDb.mockResolvedValue({
                collection: jest.fn().mockReturnValue(mockCollection)
            });

            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('mock_access_token');
            RefreshTokenService.createRefreshToken.mockResolvedValue('mock_refresh_token');

            await authController.staffLogin(req, res);

            expect(mockCollection.findOne).toHaveBeenCalledWith({ employeeId: 'ADMIN_01' });
            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
            expect(jwt.sign).toHaveBeenCalled();
            expect(res.cookie).toHaveBeenCalledTimes(2); // accessToken and refreshToken
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Login successful',
                    token: 'mock_access_token',
                    user: expect.objectContaining({
                        employeeId: 'ADMIN_01',
                        role: 'ADMIN'
                    })
                })
            );
        });

        it('should return 400 if employeeId is missing', async () => {
            req.body = { password: 'password123' };

            await authController.staffLogin(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: expect.stringContaining('required')
                })
            );
        });

        it('should return 400 if password is missing', async () => {
            req.body = { employeeId: 'ADMIN_01' };

            await authController.staffLogin(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 401 for invalid employee ID', async () => {
            req.body = {
                employeeId: 'INVALID',
                password: 'password123'
            };

            const mockCollection = {
                findOne: jest.fn().mockResolvedValue(null)
            };

            db.getDb.mockResolvedValue({
                collection: jest.fn().mockReturnValue(mockCollection)
            });

            await authController.staffLogin(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Invalid credentials'
                })
            );
        });

        it('should return 403 if account is deactivated', async () => {
            req.body = {
                employeeId: 'ADMIN_01',
                password: 'password123'
            };

            const mockUser = {
                employeeId: 'ADMIN_01',
                active: false
            };

            const mockCollection = {
                findOne: jest.fn().mockResolvedValue(mockUser)
            };

            db.getDb.mockResolvedValue({
                collection: jest.fn().mockReturnValue(mockCollection)
            });

            await authController.staffLogin(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('deactivated')
                })
            );
        });

        it('should return 401 for invalid password', async () => {
            req.body = {
                employeeId: 'ADMIN_01',
                password: 'wrong_password'
            };

            const mockUser = {
                employeeId: 'ADMIN_01',
                passwordHash: 'hashed_password',
                active: true
            };

            const mockCollection = {
                findOne: jest.fn().mockResolvedValue(mockUser)
            };

            db.getDb.mockResolvedValue({
                collection: jest.fn().mockReturnValue(mockCollection)
            });

            bcrypt.compare.mockResolvedValue(false);

            await authController.staffLogin(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should update lastLogin timestamp', async () => {
            req.body = {
                employeeId: 'ADMIN_01',
                password: 'password123'
            };

            const mockUser = {
                employeeId: 'ADMIN_01',
                passwordHash: 'hashed_password',
                active: true,
                role: 'ADMIN'
            };

            const mockCollection = {
                findOne: jest.fn().mockResolvedValue(mockUser),
                updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
            };

            db.getDb.mockResolvedValue({
                collection: jest.fn().mockReturnValue(mockCollection)
            });

            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token');
            RefreshTokenService.createRefreshToken.mockResolvedValue('refresh');

            await authController.staffLogin(req, res);

            expect(mockCollection.updateOne).toHaveBeenCalledWith(
                { employeeId: 'ADMIN_01' },
                expect.objectContaining({
                    $set: expect.objectContaining({
                        lastLogin: expect.any(Date)
                    })
                })
            );
        });

        it('should return 403 for TTE without train assignment', async () => {
            req.body = {
                employeeId: 'TTE_01',
                password: 'password123'
            };

            const mockCollection = {
                findOne: jest.fn().mockResolvedValue({
                    employeeId: 'TTE_01',
                    role: 'TTE',
                    active: true,
                    passwordHash: 'hashed'
                })
            };

            db.getDb.mockResolvedValue({
                collection: jest.fn().mockReturnValue(mockCollection)
            });
            bcrypt.compare.mockResolvedValue(true);

            await authController.staffLogin(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: expect.stringContaining('No train assigned')
                })
            );
        });

        it('should set httpOnly cookies', async () => {
            req.body = {
                employeeId: 'ADMIN_01',
                password: 'password123'
            };

            const mockUser = {
                employeeId: 'ADMIN_01',
                passwordHash: 'hashed_password',
                active: true,
                role: 'ADMIN'
            };

            const mockCollection = {
                findOne: jest.fn().mockResolvedValue(mockUser),
                updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
            };

            db.getDb.mockResolvedValue({
                collection: jest.fn().mockReturnValue(mockCollection)
            });

            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token');
            RefreshTokenService.createRefreshToken.mockResolvedValue('refresh');

            await authController.staffLogin(req, res);

            expect(res.cookie).toHaveBeenCalledWith(
                'accessToken',
                'token',
                expect.objectContaining({
                    httpOnly: true,
                    sameSite: 'strict'
                })
            );

            expect(res.cookie).toHaveBeenCalledWith(
                'refreshToken',
                'refresh',
                expect.objectContaining({
                    httpOnly: true,
                    sameSite: 'strict'
                })
            );
        });

        it('should return 500 when staffLogin throws unexpectedly', async () => {
            req.body = { employeeId: 'ADMIN_01', password: 'password123' };
            db.getDb.mockRejectedValue(new Error('staff-login-fail'));
            await authController.staffLogin(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('passengerLogin', () => {
        it('should login passenger with valid IRCTC ID', async () => {
            req.body = {
                irctcId: 'TEST123',
                password: 'password123'
            };

            const mockUser = {
                IRCTC_ID: 'TEST123',
                name: 'Test Passenger',
                email: 'test@example.com',
                phone: '9876543210',
                passwordHash: 'hashed_password',
                active: true
            };

            const mockAccountsCollection = {
                findOne: jest.fn().mockResolvedValue(mockUser),
                updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
            };

            const mockTickets = [
                { PNR_Number: '1234567890', Train_Number: '17225', PNR_Status: 'CNF' }
            ];

            const mockTrainsCollection = {
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([{ passengersCollection: '17225_passengers' }])
                })
            };

            const mockPassengersCollection = {
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue(mockTickets)
                })
            };

            db.getDb.mockResolvedValue({
                collection: jest.fn((name) => {
                    if (name === 'Trains_Details') return mockTrainsCollection;
                    return mockAccountsCollection;
                })
            });

            db.getDbByName.mockResolvedValue({
                collection: jest.fn().mockReturnValue(mockPassengersCollection)
            });

            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('mock_token');
            RefreshTokenService.createRefreshToken.mockResolvedValue('mock_refresh');

            await authController.passengerLogin(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    user: expect.objectContaining({
                        irctcId: 'TEST123',
                        role: 'PASSENGER'
                    }),
                    tickets: expect.arrayContaining([
                        expect.objectContaining({ pnr: '1234567890' })
                    ])
                })
            );
        });

        it('should login passenger with email', async () => {
            req.body = {
                email: 'test@example.com',
                password: 'password123'
            };

            const mockUser = {
                IRCTC_ID: 'TEST123',
                email: 'test@example.com',
                passwordHash: 'hashed_password',
                active: true
            };

            const mockAccountsCollection = {
                findOne: jest.fn().mockResolvedValue(mockUser),
                updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
            };

            const mockTrainsCollection = {
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([])
                })
            };

            db.getDb.mockResolvedValue({
                collection: jest.fn((name) => {
                    if (name === 'Trains_Details') return mockTrainsCollection;
                    return mockAccountsCollection;
                })
            });

            db.getDbByName.mockResolvedValue({
                collection: jest.fn().mockReturnValue({})
            });

            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token');
            RefreshTokenService.createRefreshToken.mockResolvedValue('refresh');

            await authController.passengerLogin(req, res);

            expect(mockAccountsCollection.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: true })
            );
        });

        it('should return 400 if password is missing', async () => {
            req.body = { irctcId: 'TEST123' };

            await authController.passengerLogin(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if neither irctcId nor email provided', async () => {
            req.body = { password: 'password123' };

            await authController.passengerLogin(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('IRCTC ID or email')
                })
            );
        });

        it('should return 401 for invalid credentials', async () => {
            req.body = {
                irctcId: 'INVALID',
                password: 'password123'
            };

            const mockCollection = {
                findOne: jest.fn().mockResolvedValue(null)
            };

            db.getDb.mockResolvedValue({
                collection: jest.fn().mockReturnValue(mockCollection)
            });

            await authController.passengerLogin(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should return 403 if passenger account is deactivated', async () => {
            req.body = {
                irctcId: 'TEST123',
                password: 'password123'
            };

            const mockUser = {
                IRCTC_ID: 'TEST123',
                active: false
            };

            const mockCollection = {
                findOne: jest.fn().mockResolvedValue(mockUser)
            };

            db.getDb.mockResolvedValue({
                collection: jest.fn().mockReturnValue(mockCollection)
            });

            await authController.passengerLogin(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should continue login when one passenger collection lookup fails', async () => {
            req.body = { irctcId: 'TEST123', password: 'password123' };
            const mockUser = {
                IRCTC_ID: 'TEST123',
                email: 'test@example.com',
                passwordHash: 'hashed_password',
                active: true
            };
            const mockAccountsCollection = {
                findOne: jest.fn().mockResolvedValue(mockUser),
                updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
            };
            const mockTrainsCollection = {
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([
                        { passengersCollection: 'missing_coll' },
                        { passengersCollection: 'ok_coll' }
                    ])
                })
            };
            db.getDb.mockResolvedValue({
                collection: jest.fn((name) => (name === 'Trains_Details' ? mockTrainsCollection : mockAccountsCollection))
            });
            db.getDbByName.mockResolvedValue({
                collection: jest.fn((name) => {
                    if (name === 'missing_coll') {
                        return { find: jest.fn(() => { throw new Error('coll missing'); }) };
                    }
                    return {
                        find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ PNR_Number: 'PNR1' }]) })
                    };
                })
            });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token');
            RefreshTokenService.createRefreshToken.mockResolvedValue('refresh');

            await authController.passengerLogin(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should update group status on login when matching train state exists', async () => {
            req.body = { irctcId: 'TEST123', password: 'password123' };
            const mockUser = {
                IRCTC_ID: 'TEST123',
                email: 'test@example.com',
                passwordHash: 'hashed_password',
                active: true
            };
            const mockAccountsCollection = {
                findOne: jest.fn().mockResolvedValue(mockUser),
                updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
            };
            const mockTrainsCollection = {
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([{ Train_Number: '17225', passengersCollection: '17225_passengers' }])
                })
            };
            db.getDb.mockResolvedValue({
                collection: jest.fn((name) => (name === 'Trains_Details' ? mockTrainsCollection : mockAccountsCollection))
            });
            db.getDbByName.mockResolvedValue({
                collection: jest.fn().mockReturnValue({
                    find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ PNR_Number: 'PNR1', Train_Number: '17225' }]) })
                })
            });
            trainController.getGlobalTrainState.mockReturnValue({ trainNo: '17225' });
            PassengerService.updateGroupStatus.mockResolvedValue(true);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token');
            RefreshTokenService.createRefreshToken.mockResolvedValue('refresh');

            await authController.passengerLogin(req, res);
            expect(PassengerService.updateGroupStatus).toHaveBeenCalledWith('PNR1', 'Online', expect.any(Object));
        });

        it('should return 500 when passengerLogin throws unexpectedly', async () => {
            req.body = { irctcId: 'TEST123', password: 'password123' };
            db.getDb.mockRejectedValue(new Error('passenger-login-fail'));
            await authController.passengerLogin(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('verifyToken', () => {
        it('should verify valid token', async () => {
            req.user = {
                userId: 'ADMIN_01',
                role: 'ADMIN'
            };

            await authController.verifyToken(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    user: req.user
                })
            );
        });

        it('should return 500 when verifyToken response writing fails', async () => {
            req.user = { userId: 'ADMIN_01', role: 'ADMIN' };
            res.json.mockImplementationOnce(() => {
                throw new Error('write fail');
            });
            await authController.verifyToken(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('staffRegister', () => {
        it('returns 400 for missing required fields', async () => {
            req.body = { employeeId: 'ADMIN_2' };
            await authController.staffRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 400 for invalid role', async () => {
            req.body = {
                employeeId: 'ADMIN_2',
                password: 'Password1',
                confirmPassword: 'Password1',
                role: 'SUPERVISOR'
            };
            await authController.staffRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 400 for admin id prefix mismatch', async () => {
            req.body = {
                employeeId: 'TTE_22',
                password: 'Password1',
                confirmPassword: 'Password1',
                role: 'ADMIN'
            };
            await authController.staffRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 400 for tte id prefix mismatch', async () => {
            req.body = {
                employeeId: 'ADMIN_22',
                password: 'Password1',
                confirmPassword: 'Password1',
                role: 'TTE'
            };
            await authController.staffRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 400 when staff passwords do not match', async () => {
            req.body = {
                employeeId: 'ADMIN_2',
                password: 'Password1',
                confirmPassword: 'Password2',
                role: 'ADMIN'
            };
            await authController.staffRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 400 for weak staff password', async () => {
            req.body = {
                employeeId: 'ADMIN_2',
                password: 'weak',
                confirmPassword: 'weak',
                role: 'ADMIN'
            };
            await authController.staffRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 409 when employeeId already exists', async () => {
            req.body = {
                employeeId: 'ADMIN_2',
                password: 'Password1',
                confirmPassword: 'Password1',
                role: 'ADMIN'
            };
            const col = { findOne: jest.fn().mockResolvedValue({ employeeId: 'ADMIN_2' }) };
            db.getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(col) });

            await authController.staffRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(409);
        });

        it('registers staff successfully', async () => {
            req.body = {
                employeeId: 'ADMIN_2',
                password: 'Password1',
                confirmPassword: 'Password1',
                role: 'ADMIN',
                name: 'Admin'
            };
            const col = {
                findOne: jest.fn().mockResolvedValue(null),
                insertOne: jest.fn().mockResolvedValue({ acknowledged: true })
            };
            db.getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(col) });
            bcrypt.hash.mockResolvedValue('hash');

            await authController.staffRegister(req, res);

            expect(col.insertOne).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('calls welcome email sender for staff with email', async () => {
            req.body = {
                employeeId: 'ADMIN_2',
                password: 'Password1',
                confirmPassword: 'Password1',
                role: 'ADMIN',
                email: 'admin2@example.com'
            };
            const col = {
                findOne: jest.fn().mockResolvedValue(null),
                insertOne: jest.fn().mockResolvedValue({ acknowledged: true })
            };
            db.getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(col) });
            bcrypt.hash.mockResolvedValue('hash');
            const emailSpy = jest.spyOn(authController, '_sendWelcomeEmail').mockResolvedValue();

            await authController.staffRegister(req, res);
            expect(emailSpy).toHaveBeenCalled();
            emailSpy.mockRestore();
        });

        it('returns 500 when staffRegister throws', async () => {
            req.body = {
                employeeId: 'ADMIN_2',
                password: 'Password1',
                confirmPassword: 'Password1',
                role: 'ADMIN'
            };
            db.getDb.mockRejectedValue(new Error('staff-register-fail'));
            await authController.staffRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('registerTTE', () => {
        it('returns 400 for missing required fields', async () => {
            req.body = { trainNo: '17225' };
            await authController.registerTTE(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 404 when train does not exist', async () => {
            req.body = { trainNo: '17225', name: 'tte', employeeId: 'TTE_1' };
            const trainsCol = { findOne: jest.fn().mockResolvedValue(null) };
            db.getDb.mockResolvedValue({
                collection: jest.fn().mockReturnValue(trainsCol)
            });
            await authController.registerTTE(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 409 for duplicate employee id', async () => {
            req.body = { trainNo: '17225', name: 'tte', employeeId: 'TTE_1' };
            const trainsCol = { findOne: jest.fn().mockResolvedValue({ trainNo: '17225' }) };
            const tteCol = { findOne: jest.fn().mockResolvedValue({ employeeId: 'TTE_1' }) };
            db.getDb.mockResolvedValue({
                collection: jest.fn((name) => (name === 'Trains_Details' ? trainsCol : tteCol))
            });
            await authController.registerTTE(req, res);
            expect(res.status).toHaveBeenCalledWith(409);
        });

        it('registers tte successfully', async () => {
            req.body = { trainNo: '17225', name: 'tte', employeeId: 'TTE_1', password: 'Password1' };
            const trainsCol = {
                findOne: jest.fn()
                    .mockResolvedValueOnce({ trainNo: '17225' })
            };
            const tteCol = {
                findOne: jest.fn().mockResolvedValue(null),
                insertOne: jest.fn().mockResolvedValue({ acknowledged: true })
            };
            db.getDb.mockResolvedValue({
                collection: jest.fn((name) => (name === 'Trains_Details' ? trainsCol : tteCol))
            });
            bcrypt.hash.mockResolvedValue('hash');

            await authController.registerTTE(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('calls welcome email sender when TTE email is provided', async () => {
            req.body = { trainNo: '17225', name: 'tte', employeeId: 'TTE_1', password: 'Password1', email: 'tte@example.com' };
            const trainsCol = { findOne: jest.fn().mockResolvedValue({ trainNo: '17225' }) };
            const tteCol = { findOne: jest.fn().mockResolvedValue(null), insertOne: jest.fn().mockResolvedValue({ acknowledged: true }) };
            db.getDb.mockResolvedValue({ collection: jest.fn((name) => (name === 'Trains_Details' ? trainsCol : tteCol)) });
            bcrypt.hash.mockResolvedValue('hash');
            const emailSpy = jest.spyOn(authController, '_sendWelcomeEmail').mockResolvedValue();

            await authController.registerTTE(req, res);
            expect(emailSpy).toHaveBeenCalled();
            emailSpy.mockRestore();
        });

        it('returns 500 when registerTTE throws', async () => {
            req.body = { trainNo: '17225', name: 'tte', employeeId: 'TTE_1' };
            db.getDb.mockRejectedValue(new Error('register-tte-fail'));
            await authController.registerTTE(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('passengerRegister', () => {
        it('returns 400 for missing required passenger fields', async () => {
            req.body = { email: 'a@b.com' };
            await authController.passengerRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 400 for invalid IRCTC prefix', async () => {
            req.body = {
                email: 'a@b.com',
                password: 'Password1',
                confirmPassword: 'Password1',
                name: 'Passenger',
                irctcId: 'XX_001'
            };
            await authController.passengerRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 400 for weak passenger password', async () => {
            req.body = {
                email: 'a@b.com',
                password: 'weak',
                confirmPassword: 'weak',
                name: 'Passenger',
                irctcId: 'IR_001'
            };
            await authController.passengerRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
        it('returns 400 for invalid email format', async () => {
            req.body = {
                email: 'bad-email',
                password: 'Password1',
                confirmPassword: 'Password1',
                name: 'Passenger',
                irctcId: 'IR_001'
            };
            await authController.passengerRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 400 for mismatched passwords', async () => {
            req.body = {
                email: 'a@b.com',
                password: 'Password1',
                confirmPassword: 'Password2',
                name: 'Passenger',
                irctcId: 'IR_001'
            };
            await authController.passengerRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 409 for duplicate email', async () => {
            req.body = {
                email: 'a@b.com',
                password: 'Password1',
                confirmPassword: 'Password1',
                name: 'Passenger',
                irctcId: 'IR_001'
            };
            const col = { findOne: jest.fn().mockResolvedValueOnce({ email: 'a@b.com' }) };
            db.getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(col) });
            await authController.passengerRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(409);
        });

        it('returns 409 for duplicate IRCTC ID', async () => {
            req.body = {
                email: 'a@b.com',
                password: 'Password1',
                confirmPassword: 'Password1',
                name: 'Passenger',
                irctcId: 'IR_001'
            };
            const col = {
                findOne: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ IRCTC_ID: 'IR_001' })
            };
            db.getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(col) });
            await authController.passengerRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(409);
        });

        it('registers passenger successfully', async () => {
            req.body = {
                email: 'a@b.com',
                password: 'Password1',
                confirmPassword: 'Password1',
                name: 'Passenger',
                irctcId: 'IR_001'
            };
            const col = {
                findOne: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null),
                insertOne: jest.fn().mockResolvedValue({ acknowledged: true })
            };
            db.getDb.mockResolvedValue({ collection: jest.fn().mockReturnValue(col) });
            bcrypt.hash.mockResolvedValue('hash');

            await authController.passengerRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('returns 500 when passengerRegister throws', async () => {
            req.body = {
                email: 'a@b.com',
                password: 'Password1',
                confirmPassword: 'Password1',
                name: 'Passenger',
                irctcId: 'IR_001'
            };
            db.getDb.mockRejectedValue(new Error('passenger-register-fail'));
            await authController.passengerRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('logout', () => {
        it('should logout and revoke refresh token', async () => {
            req.body = { refreshToken: 'valid_refresh_token' };

            RefreshTokenService.revokeRefreshToken.mockResolvedValue(true);

            await authController.logout(req, res);

            expect(RefreshTokenService.revokeRefreshToken).toHaveBeenCalledWith('valid_refresh_token');
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: expect.stringContaining('Logged out')
                })
            );
        });

        it('should handle logout without refresh token', async () => {
            req.body = {};

            await authController.logout(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: true })
            );
        });

        it('should handle logout errors', async () => {
            req.body = { refreshToken: 'token' };

            RefreshTokenService.revokeRefreshToken.mockRejectedValue(new Error('Revoke failed'));

            await authController.logout(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should sync passenger groups offline before revoking token', async () => {
            req.body = { refreshToken: 'passenger_refresh' };
            RefreshTokenService.validateRefreshToken.mockResolvedValue({
                userId: 'IR123',
                role: 'PASSENGER'
            });
            RefreshTokenService.revokeRefreshToken.mockResolvedValue(true);

            const mockTrainState = { trainNo: '17225' };
            trainController.getGlobalTrainState.mockReturnValue(mockTrainState);
            PassengerService.updateGroupStatus.mockResolvedValue(true);

            db.getPassengersCollection.mockReturnValue({
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([
                        { PNR_Number: 'PNR1' },
                        { PNR_Number: 'PNR2' }
                    ])
                })
            });

            await authController.logout(req, res);

            expect(PassengerService.updateGroupStatus).toHaveBeenCalledWith('PNR1', 'Offline', mockTrainState);
            expect(PassengerService.updateGroupStatus).toHaveBeenCalledWith('PNR2', 'Offline', mockTrainState);
            expect(RefreshTokenService.revokeRefreshToken).toHaveBeenCalledWith('passenger_refresh');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should continue logout when offline sync fails', async () => {
            req.body = { refreshToken: 'passenger_refresh' };
            RefreshTokenService.validateRefreshToken.mockRejectedValue(new Error('sync-fail'));
            RefreshTokenService.revokeRefreshToken.mockResolvedValue(true);

            await authController.logout(req, res);
            expect(RefreshTokenService.revokeRefreshToken).toHaveBeenCalledWith('passenger_refresh');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('refresh', () => {
        it('should refresh access token with valid refresh token', async () => {
            req.body = { refreshToken: 'valid_refresh_token' };

            const mockStoredToken = {
                userId: 'ADMIN_01',
                role: 'ADMIN'
            };

            RefreshTokenService.validateRefreshToken.mockResolvedValue(mockStoredToken);
            jwt.sign.mockReturnValue('new_access_token');

            await authController.refresh(req, res);

            expect(RefreshTokenService.validateRefreshToken).toHaveBeenCalledWith('valid_refresh_token');
            expect(jwt.sign).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'ADMIN_01',
                    role: 'ADMIN'
                }),
                expect.any(String),
                expect.any(Object)
            );
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    token: 'new_access_token'
                })
            );
        });

        it('should return 400 if refresh token is missing', async () => {
            req.body = {};

            await authController.refresh(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('required')
                })
            );
        });

        it('should return 401 for invalid refresh token', async () => {
            req.body = { refreshToken: 'invalid_token' };

            RefreshTokenService.validateRefreshToken.mockResolvedValue(null);

            await authController.refresh(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Invalid or expired')
                })
            );
        });

        it('should handle refresh errors', async () => {
            req.body = { refreshToken: 'token' };

            RefreshTokenService.validateRefreshToken.mockRejectedValue(new Error('Validation error'));

            await authController.refresh(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('_sendWelcomeEmail', () => {
        it('should swallow welcome email send errors', async () => {
            const NotificationService = require('../../services/NotificationService');
            NotificationService.emailTransporter.sendMail.mockRejectedValueOnce(new Error('email-fail'));
            await authController._sendWelcomeEmail('u@example.com', 'User', 'ADMIN', 'ADMIN_1');
            expect(NotificationService.emailTransporter.sendMail).toHaveBeenCalled();
        });
    });
});

// 20 comprehensive tests for authController
