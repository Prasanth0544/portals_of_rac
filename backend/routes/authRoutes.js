// backend/routes/authRoutes.js — Authentication & OTP routes

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const otpController = require('../controllers/otpController');
const validationMiddleware = require('../middleware/validation');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');

// ========== AUTHENTICATION ROUTES ==========

// Staff Login (Admin + TTE)
router.post('/auth/staff/login',
  authLimiter,
  validationMiddleware.sanitizeBody,
  (req, res) => authController.staffLogin(req, res)
);

// Passenger Login
router.post('/auth/passenger/login',
  authLimiter,
  validationMiddleware.sanitizeBody,
  (req, res) => authController.passengerLogin(req, res)
);

// Verify Token
router.get('/auth/verify',
  authMiddleware,
  (req, res) => authController.verifyToken(req, res)
);

// Logout
router.post('/auth/logout',
  authMiddleware,
  (req, res) => authController.logout(req, res)
);

// Refresh access token
router.post('/auth/refresh',
  (req, res) => authController.refresh(req, res)
);

// Staff Registration (Admin + TTE self-register via signup page)
router.post('/auth/staff/register',
  authLimiter,
  validationMiddleware.sanitizeBody,
  (req, res) => authController.staffRegister(req, res)
);

// TTE Registration (Admin registers a TTE for a specific train from Landing Page)
router.post('/auth/tte/register',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware.sanitizeBody,
  (req, res) => authController.registerTTE(req, res)
);

// Passenger Registration
router.post('/auth/passenger/register',
  authLimiter,
  validationMiddleware.sanitizeBody,
  (req, res) => authController.passengerRegister(req, res)
);

// ========== OTP ROUTES ==========

// Send OTP for verification
router.post('/otp/send',
  otpLimiter,
  validationMiddleware.sanitizeBody,
  (req, res) => otpController.sendOTP(req, res)
);

// Verify OTP
router.post('/otp/verify',
  validationMiddleware.sanitizeBody,
  (req, res) => otpController.verifyOTP(req, res)
);

module.exports = router;
