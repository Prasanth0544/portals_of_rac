// backend/controllers/authController.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const RefreshTokenService = require('../services/RefreshTokenService');

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'; // Access token expiry (1 hour for dev, configure shorter in production)

/**
 * Authentication Controller
 * Handles login for Admin, TTE, and Passenger users
 */
class AuthController {
    /**
     * Admin/TTE Login
     * POST /api/auth/staff/login
     * Body: { employeeId, password }
     */
    async staffLogin(req, res) {
        try {
            const { employeeId, password } = req.body;

            // Validate input
            if (!employeeId || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee ID and password are required'
                });
            }

            // Find user in tte_users collection
            const racDb = await db.getDb();
            const tteUsersCollection = racDb.collection('tte_users');
            const user = await tteUsersCollection.findOne({ employeeId });

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Check if account is active
            if (!user.active) {
                return res.status(403).json({
                    success: false,
                    message: 'Account is deactivated. Please contact administrator.'
                });
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Update last login
            await tteUsersCollection.updateOne(
                { employeeId },
                { $set: { lastLogin: new Date() } }
            );

            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: user.employeeId,
                    role: user.role,
                    trainAssigned: user.trainAssigned,
                    permissions: user.permissions
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            // Generate refresh token
            const refreshToken = await RefreshTokenService.createRefreshToken(
                user.employeeId,
                user.role,
                { trainAssigned: user.trainAssigned }
            );

            // Set tokens as httpOnly cookies (secure in production)
            const isProduction = process.env.NODE_ENV === 'production';

            res.cookie('accessToken', token, {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            // Return success with tokens and user info
            // Also return tokens in body for backward compatibility
            res.json({
                success: true,
                message: 'Login successful',
                token,
                refreshToken,
                expiresIn: 900, // 15 minutes in seconds
                user: {
                    employeeId: user.employeeId,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    trainAssigned: user.trainAssigned,
                    permissions: user.permissions
                }
            });

        } catch (error) {
            console.error('Staff login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during login'
            });
        }
    }

    /**
     * Passenger Login
     * POST /api/auth/passenger/login
     * Body: { irctcId, password } OR { email, password }
     */
    async passengerLogin(req, res) {
        try {
            const { irctcId, email, password } = req.body;

            // Validate input
            if (!password) {
                return res.status(400).json({
                    success: false,
                    message: 'Password is required'
                });
            }

            if (!irctcId && !email) {
                return res.status(400).json({
                    success: false,
                    message: 'IRCTC ID or email is required'
                });
            }

            // Find user in passenger_accounts collection
            const racDb = await db.getDb();
            const passengerAccountsCollection = racDb.collection('passenger_accounts');
            const query = irctcId ? { IRCTC_ID: irctcId } : { email };
            const user = await passengerAccountsCollection.findOne(query);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Check if account is active
            if (!user.active) {
                return res.status(403).json({
                    success: false,
                    message: 'Account is deactivated. Please contact support.'
                });
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Fetch all tickets for this IRCTC ID from passenger collection
            const passengersCollection = db.getPassengersCollection();
            const tickets = await passengersCollection.find({
                IRCTC_ID: user.IRCTC_ID  // ✅ FIXED: Use uppercase field name
            }).toArray();

            // Update last login
            await passengerAccountsCollection.updateOne(
                { _id: user._id },
                { $set: { lastLogin: new Date() } }
            );

            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: user.IRCTC_ID,  // ✅ FIXED: Use uppercase field
                    email: user.email,
                    role: 'PASSENGER'
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            // Generate refresh token
            const refreshToken = await RefreshTokenService.createRefreshToken(
                user.IRCTC_ID,
                'PASSENGER',
                { email: user.email }
            );

            // Set tokens as httpOnly cookies (secure in production)
            const isProduction = process.env.NODE_ENV === 'production';

            res.cookie('accessToken', token, {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            // Return success with tokens, user info, and tickets
            // Also return tokens in body for backward compatibility
            res.json({
                success: true,
                message: 'Login successful',
                token,
                refreshToken,
                expiresIn: 900, // 15 minutes in seconds
                user: {
                    irctcId: user.IRCTC_ID,  // ✅ FIXED: Read from uppercase field
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: 'PASSENGER'
                },
                tickets: tickets.map(t => ({
                    pnr: t.PNR_Number,
                    trainNumber: t.Train_Number,
                    trainName: t.Train_Name,
                    from: t.Boarding_Station,
                    to: t.Deboarding_Station,
                    journeyDate: t.Journey_Date,
                    status: t.PNR_Status,
                    racStatus: t.Rac_status,
                    coach: t.Assigned_Coach,
                    berth: t.Assigned_Berth,
                    class: t.Class
                }))
            });

        } catch (error) {
            console.error('Passenger login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during login'
            });
        }
    }

    /**
     * Verify Token (for protected routes)
     * GET /api/auth/verify
     * Headers: Authorization: Bearer <token>
     */
    async verifyToken(req, res) {
        try {
            // Token is already verified by auth middleware
            // If we reach here, token is valid
            res.json({
                success: true,
                user: req.user // Populated by auth middleware
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Token verification failed'
            });
        }
    }

    /**
     * Logout (revoke refresh token)
     * POST /api/auth/logout
     * Body: { refreshToken }
     */
    async logout(req, res) {
        try {
            const { refreshToken } = req.body;

            if (refreshToken) {
                // Revoke the refresh token
                await RefreshTokenService.revokeRefreshToken(refreshToken);
            }

            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        }
    }

    /**
     * Refresh Access Token
     * POST /api/auth/refresh
     * Body: { refreshToken }
     */
    async refresh(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Refresh token is required'
                });
            }

            // Validate the refresh token
            const storedToken = await RefreshTokenService.validateRefreshToken(refreshToken);

            if (!storedToken) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired refresh token. Please login again.'
                });
            }

            // Generate new access token
            const newAccessToken = jwt.sign(
                {
                    userId: storedToken.userId,
                    role: storedToken.role
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            res.json({
                success: true,
                token: newAccessToken,
                expiresIn: 900 // 15 minutes in seconds
            });

        } catch (error) {
            console.error('Token refresh error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to refresh token'
            });
        }
    }
}

module.exports = new AuthController();
