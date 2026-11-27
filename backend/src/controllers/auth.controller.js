const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getEnv } = require('../config/env');
const { User } = require('../models/User.model');
const { AppError } = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { attachRoleContext, revokeToken } = require('../middleware/auth.middleware');
const { recordAuditLog } = require('../services/audit.service');

/**
 * Generate a signed JWT access token for a user.
 */
const signAccessToken = (userDoc) => {
  const { jwtSecret, jwtExpiresIn } = getEnv();
  if (!jwtSecret) {
    throw new AppError('JWT_SECRET is not configured.', 500, 'SERVER_CONFIG_ERROR');
  }
  return jwt.sign(
    {
      sub: userDoc._id.toString(),
      role: userDoc.role,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
};

/**
 * POST /api/auth/register
 * Restricted according to SECURITY_AND_ROLES.md:
 * - Only an authenticated ADMINISTRATOR can register users or assign elevated roles.
 * - Initial bootstrap exception: if 0 users exist in the database, the very first registration
 *   is permitted to bootstrap the initial ADMINISTRATOR account.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const totalUsers = await User.countDocuments();
    const isFirstUserBootstrap = totalUsers === 0;

    if (!isFirstUserBootstrap) {
      if (!req.user) {
        return next(
          new AppError(
            'Authentication required. Only an ADMINISTRATOR can register new user accounts.',
            401,
            'UNAUTHORIZED'
          )
        );
      }
      if (req.user.role !== 'ADMINISTRATOR') {
        return next(
          new AppError(
            'Access denied. Only an ADMINISTRATOR can register new user accounts or assign roles.',
            403,
            'FORBIDDEN'
          )
        );
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('A user with this email address already exists.', 409, 'DUPLICATE_EMAIL'));
    }

    const { bcryptSaltRounds } = getEnv();
    const passwordHash = await bcrypt.hash(password, bcryptSaltRounds);

    // If bootstrapping the very first user, allow the requested role (or ADMINISTRATOR)
    const assignedRole = isFirstUserBootstrap ? role || 'ADMINISTRATOR' : role || 'WORKER';

    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role: assignedRole,
      status: 'ACTIVE',
    });

    const userContext = await attachRoleContext(newUser);

    await recordAuditLog({
      actorId: req.user ? req.user.userId : newUser._id,
      actorRole: req.user ? req.user.role : assignedRole,
      action: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: newUser.userId,
      details: {
        email: newUser.email,
        role: newUser.role,
        bootstrap: isFirstUserBootstrap,
      },
    });

    return sendSuccess(res, 201, 'User registered successfully', {
      user: userContext,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/auth/login
 * Authenticates a user by email and password, returns JWT access token and sanitized user profile.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const userDoc = await User.findOne({ email }).select('+passwordHash');
    if (!userDoc) {
      return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    }

    const isPasswordValid = await bcrypt.compare(password, userDoc.passwordHash);
    if (!isPasswordValid) {
      return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    }

    if (userDoc.status !== 'ACTIVE') {
      return next(new AppError(`User account is ${userDoc.status}. Login denied.`, 403, 'ACCOUNT_INACTIVE'));
    }

    const token = signAccessToken(userDoc);
    const { jwtExpiresIn } = getEnv();
    const userContext = await attachRoleContext(userDoc);

    await recordAuditLog({
      actorId: userDoc._id,
      actorRole: userDoc.role,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: userDoc.userId,
      details: {
        email: userDoc.email,
      },
    });

    return sendSuccess(res, 200, 'Login successful', {
      token,
      expiresIn: jwtExpiresIn,
      user: userContext,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/auth/me (and GET /api/users/me)
 * Returns the authenticated user's profile, role, linked workerId, and assigned zoneIds.
 */
const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Authenticated user profile retrieved', {
      user: req.user,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/auth/logout
 * Revokes the current Bearer token.
 */
const logout = async (req, res, next) => {
  try {
    if (req.token) {
      revokeToken(req.token);
    }
    return sendSuccess(res, 200, 'Logged out successfully', {});
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  signAccessToken,
};
