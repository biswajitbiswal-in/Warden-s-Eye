const express = require('express');
const { getZones, getZoneById } = require('../controllers/zone.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', getZones);
router.get('/:id', getZoneById);

module.exports = router;
