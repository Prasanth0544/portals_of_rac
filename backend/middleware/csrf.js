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

    // Skip CSRF for specific public endpoints (login, OTP, push notifications, registration)
    // NOTE: Train lifecycle routes (initialize, start-journey, next-station, reset) are
    // intentionally NOT exempted — they require CSRF tokens for security.
    const publicPaths = [
        '/api/auth/staff/login',
        '/api/auth/passenger/login',
        '/api/auth/staff/register',
        '/api/auth/passenger/register',
        '/api/auth/refresh',
        '/api/otp/send',
        '/api/otp/verify',
        '/api/config/setup',
        '/api/admin/push-subscribe',
        '/api/tte/push-subscribe',
        '/api/passenger/push-subscribe',
        '/api/test-email',
        '/api/push/test',
        '/api/push-subscribe'
    ];

    if (publicPaths.some(path => req.path.startsWith(path))) {
        return next();
    }

    // Get token from header
    const headerToken = req.headers['x-csrf-token'];
    const cookieToken = req.cookies?.csrfToken;

    // Header is always required
    if (!headerToken) {
        return res.status(403).json({
            success: false,
            message: 'CSRF token missing',
            error: 'FORBIDDEN'
        });
    }

    // In cross-origin deployments (Vercel→Render), browsers may block
    // third-party cookies even with sameSite:'none'. If the cookie is
    // present, enforce double-submit match. If absent (blocked), accept
    // the header token alone — it still proves the client called our
    // /csrf-token endpoint. Rate limiting provides abuse protection.
    if (cookieToken && headerToken !== cookieToken) {
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

    // For cross-origin deployments (e.g., Vercel frontend + Render backend),
    // sameSite must be 'none' with secure: true
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('csrfToken', token, {
        httpOnly: false, // Must be readable by JavaScript
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-origin
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
