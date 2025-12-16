/**
 * CSRF Protection Middleware
 * Uses double-submit cookie pattern for stateless CSRF protection
 */
const crypto = require('crypto');

// Generate a secure random CSRF token
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// CSRF middleware
const csrfProtection = (req, res, next) => {
    // Skip CSRF for safe methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    // Skip CSRF for specific public endpoints (login, OTP, push notifications)
    const publicPaths = [
        '/api/auth/staff/login',
        '/api/auth/passenger/login',
        '/api/auth/refresh',
        '/api/otp/send',
        '/api/otp/verify',
        '/api/config/setup',
        '/api/train/initialize',
        '/api/tte/push-subscribe',
        '/api/passenger/push-subscribe',
        '/api/push-subscribe'
    ];

    if (publicPaths.some(path => req.path.startsWith(path))) {
        return next();
    }

    // Get token from header
    const headerToken = req.headers['x-csrf-token'];
    const cookieToken = req.cookies?.csrfToken;

    if (!headerToken || !cookieToken) {
        return res.status(403).json({
            success: false,
            message: 'CSRF token missing',
            error: 'FORBIDDEN'
        });
    }

    if (headerToken !== cookieToken) {
        return res.status(403).json({
            success: false,
            message: 'CSRF token mismatch',
            error: 'FORBIDDEN'
        });
    }

    next();
};

// Endpoint to get CSRF token - sets cookie and returns token
const getCsrfToken = (req, res) => {
    const token = generateToken();

    res.cookie('csrfToken', token, {
        httpOnly: false, // Must be readable by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
        success: true,
        csrfToken: token
    });
};

module.exports = {
    csrfProtection,
    getCsrfToken,
    generateToken
};
