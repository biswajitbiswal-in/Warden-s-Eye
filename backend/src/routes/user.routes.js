const express = require('express');
const { getMe } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Alias of GET /api/auth/me for user profile retrieval
router.get('/me', requireAuth, getMe);

module.exports = router;
