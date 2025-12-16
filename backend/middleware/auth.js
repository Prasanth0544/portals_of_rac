// backend/middleware/auth.js

const jwt = require('jsonwebtoken');

// JWT Secret (must match authController)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */
const authMiddleware = (req, res, next) => {
    try {
        // Try to get token from httpOnly cookie first, then Authorization header
        let token = req.cookies?.accessToken;

        if (!token) {
            // Fall back to Authorization header for backward compatibility
            const authHeader = req.headers.authorization;
            if (authHeader) {
                token = authHeader.startsWith('Bearer ')
                    ? authHeader.substring(7)
                    : authHeader;
            }
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No authorization token provided'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Attach user info to request
        req.user = decoded;

        // Continue to next middleware/route handler
        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please login again.'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

/**
 * Role-based Access Control Middleware
 * Checks if user has required role
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Support both requireRole(['TTE', 'ADMIN']) and requireRole('TTE', 'ADMIN')
        const roles = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles;

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

/**
 * Permission-based Access Control
 * Checks if user has specific permission
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userPermissions = req.user.permissions || [];

        if (!userPermissions.includes(permission) && !userPermissions.includes('ALL')) {
            return res.status(403).json({
                success: false,
                message: `Permission denied. Requires: ${permission}`
            });
        }

        next();
    };
};

module.exports = {
    authMiddleware,
    requireRole,
    requirePermission
};
