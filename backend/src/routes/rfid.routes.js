const express = require('express');
const { scanRfidCard, getRfidLogs } = require('../controllers/rfid.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireDeviceAuth } = require('../middleware/deviceAuth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { rfidScanSchema } = require('../validators/rfid.validator');

const router = express.Router();

// ESP32 + RC522 RFID scan ingestion (authenticated via X-Device-Code & X-Device-Key)
router.post('/scan', validate(rfidScanSchema), requireDeviceAuth, scanRfidCard);

// RFID scan history (authenticated via Bearer JWT, scoped by role/zone)
router.get('/logs', requireAuth, getRfidLogs);

module.exports = router;
