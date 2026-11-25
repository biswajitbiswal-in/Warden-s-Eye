const jwt = require('jsonwebtoken');
const { getEnv } = require('../config/env');
const { User } = require('../models/User.model');
const { Worker } = require('../models/Worker.model');
const { ZoneAssignment } = require('../models/ZoneAssignment.model');
const { AppError } = require('../utils/AppError');

// In-memory revoked token set for stateless JWT logout during runtime
const revokedTokens = new Set();

const revokeToken = (token) => {
  if (token) {
    revokedTokens.add(token);
  }
};

const isTokenRevoked = (token) => revokedTokens.has(token);

/**
 * Helper to extract Bearer token from Authorization header.
 */
const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7).trim();
};

/**
 * Resolves the authenticated user's linked worker profile (if WORKER) and assigned zoneIds (if SUPERVISOR).
 */
const attachRoleContext = async (userDoc) => {
  const userObj = {
    userId: userDoc._id.toString(),
    name: userDoc.name,
    email: userDoc.email,
    role: userDoc.role,
    status: userDoc.status,
    workerId: null,
    workerZoneId: null,
    assignedZoneIds: [],
  };

  if (userDoc.role === 'WORKER') {
    const workerProfile = await Worker.findOne({ userId: userDoc._id, status: 'ACTIVE' }).lean();
    if (workerProfile) {
      userObj.workerId = workerProfile._id.toString();
      userObj.workerZoneId = workerProfile.zoneId ? workerProfile.zoneId.toString() : null;
    }
  } else if (userDoc.role === 'SUPERVISOR') {
    const assignments = await ZoneAssignment.find({
      userId: userDoc._id,
      status: 'ACTIVE',
    }).lean();
    userObj.assignedZoneIds = assignments.map((a) => a.zoneId.toString());
  }

  return userObj;
};

/**
 * Strict JWT authentication middleware.
 * Verifies signature, checks revocation, confirms user exists and is ACTIVE,
 * and attaches role context (`workerId`, `workerZoneId`, `assignedZoneIds`) to `req.user`.
 */
const requireAuth = async (req, _res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return next(new AppError('Authentication required. Please provide a valid Bearer token.', 401, 'UNAUTHORIZED'));
    }

    if (isTokenRevoked(token)) {
      return next(new AppError('Token has been logged out or revoked.', 401, 'TOKEN_REVOKED'));
    }

    const { jwtSecret } = getEnv();
    if (!jwtSecret) {
      return next(new AppError('Server authentication configuration error.', 500, 'SERVER_CONFIG_ERROR'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
      return next(new AppError('Invalid or expired authentication token.', 401, code));
    }

    const userDoc = await User.findById(decoded.sub);
    if (!userDoc) {
      return next(new AppError('The user belonging to this token no longer exists.', 401, 'USER_NOT_FOUND'));
    }

    if (userDoc.status !== 'ACTIVE') {
      return next(new AppError(`User account is ${userDoc.status}. Access denied.`, 403, 'ACCOUNT_INACTIVE'));
    }

    req.token = token;
    req.user = await attachRoleContext(userDoc);
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Optional JWT parser (used by POST /api/auth/register to check if caller is an ADMINISTRATOR).
 */
const optionalAuth = async (req, _res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token || isTokenRevoked(token)) {
      req.user = null;
      return next();
    }
    const { jwtSecret } = getEnv();
    if (!jwtSecret) {
      req.user = null;
      return next();
    }
    const decoded = jwt.verify(token, jwtSecret);
    const userDoc = await User.findById(decoded.sub);
    if (userDoc && userDoc.status === 'ACTIVE') {
      req.token = token;
      req.user = await attachRoleContext(userDoc);
    } else {
      req.user = null;
    }
    return next();
  } catch (_err) {
    req.user = null;
    return next();
  }
};

/**
 * Role-Based Access Control (RBAC) middleware.
 * Restricts route execution to the specified list of canonical roles:
 * WORKER, SUPERVISOR, ADMINISTRATOR
 */
const requireRole = (allowedRoles = []) => (req, _res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(
      new AppError(
        `Access denied. Role '${req.user.role}' is not authorized to perform this action.`,
        403,
        'FORBIDDEN'
      )
    );
  }

  return next();
};

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  revokeToken,
  attachRoleContext,
};
