/**
 * CSRF Protection Middleware
 * Uses double-submit cookie pattern with server-side fallback
 * for cross-origin deployments (Vercel frontend + Render backend)
 * where third-party cookies are blocked by browsers.
 */
const crypto = require('crypto');

// Server-side token store (fallback when cookies are blocked cross-origin)
// Maps token -> expiry timestamp
const issuedTokens = new Map();

// Cleanup expired tokens every 30 minutes
setInterval(() => {
    const now = Date.now();
    for (const [token, expiry] of issuedTokens) {
        if (now > expiry) issuedTokens.delete(token);
    }
}, 30 * 60 * 1000);

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
        '/api/train/start-journey',
        '/api/train/next-station',
        '/api/train/reset',
        '/api/admin/push-subscribe',
        '/api/tte/push-subscribe',
        '/api/passenger/push-subscribe',
        '/api/test-email',
        '/api/push/test',
        '/api/passenger/revert-no-show',  // Allow passengers to revert no-show
        '/api/push-subscribe'
    ];

    if (publicPaths.some(path => req.path.startsWith(path))) {
        return next();
    }

    // Get token from header and cookie
    const headerToken = req.headers['x-csrf-token'];
    const cookieToken = req.cookies?.csrfToken;

    if (!headerToken) {
        return res.status(403).json({
            success: false,
            message: 'CSRF token missing',
            error: 'FORBIDDEN'
        });
    }

    // Strategy 1: Double-submit cookie (same-origin or cookies working)
    if (cookieToken) {
        if (headerToken !== cookieToken) {
            return res.status(403).json({
                success: false,
                message: 'CSRF token mismatch',
                error: 'FORBIDDEN'
            });
        }
        return next();
    }

    // Strategy 2: Server-side validation (cross-origin fallback)
    // When third-party cookies are blocked, validate against issued tokens
    const tokenExpiry = issuedTokens.get(headerToken);
    if (tokenExpiry && Date.now() < tokenExpiry) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'CSRF token missing',
        error: 'FORBIDDEN'
    });
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

    // Store token server-side as fallback (for cross-origin where cookies fail)
    issuedTokens.set(token, Date.now() + 24 * 60 * 60 * 1000);

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

