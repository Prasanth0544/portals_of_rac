// backend/middleware/auth.js

const jwt = require("jsonwebtoken");

// JWT Secret (must match authController)
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user info to request
 *
 * Priority order:
 *  1. Authorization header (Bearer token from localStorage — portal-specific, no cross-portal leakage)
 *  2. httpOnly accessToken cookie (fallback for browser-only flows)
 *
 * Why header-first?
 *  All portals now run on a single origin (localhost:3000 / portals-of-rac.vercel.app).
 *  However, cookies are scoped to the domain, not the path. When admin, TTE, and
 *  passenger portals share the same cookie jar, a login from one portal can overwrite
 *  another's accessToken cookie. localStorage IS path-independent but per-origin,
 *  so the Authorization header carries the correct, role-specific token and is
 *  checked first.
 */
const authMiddleware = (req, res, next) => {
  try {
    // 1. Prefer Authorization header (portal-specific, no cross-portal collision)
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      token = authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : authHeader;
    }

    // 2. Fall back to httpOnly cookie (e.g. direct browser fetch without header)
    if (!token) {
      token = req.cookies?.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authorization token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user info to request
    req.user = decoded;

    // Continue to next middleware/route handler
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

/**
 * Optional Authentication Middleware
 * Attaches user info if a valid JWT is present, but does NOT block
 * the request if the token is missing or expired.
 *
 * Used for OTP-protected routes (cancel, deboarding, change boarding)
 * where OTP verification replaces JWT as the authentication mechanism.
 * Logged-in users still benefit from user context being attached.
 */
const optionalAuth = (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      token = authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : authHeader;
    }
    if (!token) {
      token = req.cookies?.accessToken;
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    }
  } catch (_) {
    // Token invalid/expired — that's fine, proceed without user context
  }
  next();
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
        message: "Authentication required",
      });
    }

    // Support both requireRole(['TTE', 'ADMIN']) and requireRole('TTE', 'ADMIN')
    const roles = Array.isArray(allowedRoles[0])
      ? allowedRoles[0]
      : allowedRoles;

    if (!roles.includes(req.user.role)) {
      console.log(
        `[AUTH] Role check failed: "${req.user.role}" not in [${roles.join(", ")}] for ${req.method} ${req.path}`,
      );
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
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
        message: "Authentication required",
      });
    }

    const userPermissions = req.user.permissions || [];

    if (
      !userPermissions.includes(permission) &&
      !userPermissions.includes("ALL")
    ) {
      return res.status(403).json({
        success: false,
        message: `Permission denied. Requires: ${permission}`,
      });
    }

    next();
  };
};

/**
 * Train-Scoped Access Control Middleware
 * Ensures TTE can only operate on their assigned train's data.
 * ADMINs bypass this check.
 */
const requireTrainMatch = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // ADMINs can access any train
  if (req.user.role === "ADMIN") {
    return next();
  }

  // For TTE: check trainAssigned exists in JWT
  const tteTrainAssigned = req.user.trainAssigned;
  if (!tteTrainAssigned) {
    return res.status(403).json({
      success: false,
      message: "No train assigned to your account. Contact admin.",
    });
  }

  // Get trainNo from the request (auto-injected by TTE portal's request interceptor)
  const requestTrainNo =
    req.body?.trainNo || req.query?.trainNo || req.params?.trainNo;

  // If the request includes a trainNo, ensure it matches the TTE's assigned train
  // This prevents a TTE from accessing another train's data
  if (requestTrainNo && String(requestTrainNo) !== String(tteTrainAssigned)) {
    console.log(
      `[AUTH] Train mismatch: TTE assigned to ${tteTrainAssigned}, request for ${requestTrainNo}`,
    );
    return res.status(403).json({
      success: false,
      message: `Access denied. You are assigned to train ${tteTrainAssigned}, not ${requestTrainNo}.`,
    });
  }

  // If no trainNo in request, auto-inject it from the JWT so route handlers can use it
  if (!req.body?.trainNo && req.body) {
    req.body.trainNo = String(tteTrainAssigned);
  }
  if (!req.query?.trainNo) {
    req.query = req.query || {};
    req.query.trainNo = String(tteTrainAssigned);
  }

  next();
};

module.exports = {
  authMiddleware,
  optionalAuth,
  requireRole,
  requirePermission,
  requireTrainMatch,
};
