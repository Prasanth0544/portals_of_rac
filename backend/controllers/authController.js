// backend/controllers/authController.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '48h'; // Token valid for 48 hours

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

            // Return success with token and user info
            res.json({
                success: true,
                message: 'Login successful',
                token,
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

            // Return success with token, user info, and tickets
            res.json({
                success: true,
                message: 'Login successful',
                token,
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
     * Logout (optional - mainly client-side token removal)
     * POST /api/auth/logout
     */
    async logout(req, res) {
        try {
            // For JWT, logout is mainly handled client-side by removing the token
            // Could add token blacklisting here if needed
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
}

module.exports = new AuthController();
