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
    // NOTE: req.path does NOT include the /api prefix (Express strips the mount prefix)
    // So we compare against the path WITHOUT /api
    const publicPaths = [
        '/auth/staff/login',
        '/auth/passenger/login',
        '/auth/passenger/register',
        '/auth/refresh',
        '/otp/send',
        '/otp/verify',
        '/config/setup',
        '/train/initialize',
        '/train/start-journey',
        '/train/next-station',
        '/train/reset',
        '/admin/push-subscribe',
        '/tte/push-subscribe',
        '/passenger/push-subscribe',
        '/test-email',
        '/push/test',
        '/passenger/revert-no-show',
        '/push-subscribe',
        '/passenger/no-show',
        '/passenger/cancel',
        '/passenger/accept-upgrade',
        '/passenger/deny-upgrade',
        '/passenger/send-upgrade-otp',
        '/passenger/verify-upgrade-otp',
    ];

    // Also check full path in case middleware is mounted differently
    const fullPath = req.originalUrl?.split('?')[0] || req.path;
    if (publicPaths.some(p => req.path.startsWith(p) || fullPath.includes(p))) {
        return next();
    }

    // If request has a Bearer JWT token, skip CSRF check.
    // JWT tokens are manually attached (not auto-sent like cookies),
    // so they inherently protect against CSRF attacks.
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
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
