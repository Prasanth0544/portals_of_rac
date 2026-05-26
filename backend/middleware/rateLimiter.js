// backend/middleware/rateLimiter.js
// Rate limiting middleware to protect against brute force and API abuse
// Environment-aware: strict limits in production, relaxed in development

const rateLimit = require('express-rate-limit');

const isProd = process.env.NODE_ENV === 'production';

/**
 * Authentication Rate Limiter
 * For login endpoints - strict limit to prevent brute force attacks
 * Development: 50 attempts per 15 minutes per IP
 * Production:  5 attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProd ? 5 : 50,
    message: {
        success: false,
        message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
        code: 'RATE_LIMIT_AUTH'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: false, // Count all requests
    handler: (req, res, next, options) => {
        console.warn(`[RATE LIMIT] Auth limit exceeded for IP: ${req.ip}`);
        res.status(429).json(options.message);
    }
});

/**
 * OTP Rate Limiter
 * For OTP sending endpoints - very strict to prevent email spam
 * Development: 50 requests per 15 minutes per IP
 * Production:  3 requests per hour per IP
 */
const otpLimiter = rateLimit({
    windowMs: isProd ? 60 * 60 * 1000 : 15 * 60 * 1000, // 1 hour (prod) / 15 min (dev)
    max: isProd ? 3 : 50,
    message: {
        success: false,
        message: isProd
            ? 'OTP request limit exceeded. Please try again after 1 hour.'
            : 'OTP request limit exceeded. Please try again after 15 minutes.',
        code: 'RATE_LIMIT_OTP'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        console.warn(`[RATE LIMIT] OTP limit exceeded for IP: ${req.ip}`);
        res.status(429).json(options.message);
    }
});

/**
 * General API Rate Limiter
 * For all API endpoints - moderate limit to prevent abuse
 * Development: 5000 requests per 15 minutes per IP
 * Production:  200 requests per 15 minutes per IP (state-changing only)
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProd ? 200 : 5000,
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again later.',
        code: 'RATE_LIMIT_API'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for read-only GET requests (polling, data fetches)
        // Only rate-limit state-changing POST/PUT/DELETE operations
        if (req.method === 'GET') return true;

        // Also skip push subscription endpoints (called on every page load)
        const skipPaths = ['/api/push/subscribe', '/api/passenger/push-subscribe',
            '/api/push/vapid-key', '/api/push/vapid-public-key', '/api/csrf-token'];
        return skipPaths.some(p => req.path.includes(p));
    }
});

/**
 * Sensitive Operations Rate Limiter
 * For sensitive actions like password reset, account changes
 * Development: 20 requests per hour per IP
 * Production:  10 requests per hour per IP
 */
const sensitiveOpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isProd ? 10 : 20,
    message: {
        success: false,
        message: 'Too many sensitive operation requests. Please try again later.',
        code: 'RATE_LIMIT_SENSITIVE'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    authLimiter,
    otpLimiter,
    apiLimiter,
    sensitiveOpLimiter
};
