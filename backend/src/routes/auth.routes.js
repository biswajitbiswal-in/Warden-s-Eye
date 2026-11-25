const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, getMe, logout } = require('../controllers/auth.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { registerSchema, loginSchema } = require('../validators/auth.validator');
const { getEnv } = require('../config/env');

const router = express.Router();

// Rate limiter for authentication endpoints (disabled or higher limit in test environment unless explicitly tested)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: () => (getEnv().nodeEnv === 'test' ? 100 : 15),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    error: { code: 'RATE_LIMIT_EXCEEDED' },
  },
});

router.post('/register', authLimiter, optionalAuth, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);

module.exports = router;
