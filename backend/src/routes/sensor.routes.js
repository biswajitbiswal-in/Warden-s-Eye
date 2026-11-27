const express = require('express');
const {
  submitSensorEvent,
  getSensorEvents,
  getLatestSensorStatus,
} = require('../controllers/sensor.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireDeviceAuth } = require('../middleware/deviceAuth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { submitSensorEventSchema } = require('../validators/sensor.validator');

const router = express.Router();

// ESP32 smoke & flame sensor event ingestion (authenticated via X-Device-Code & X-Device-Key)
router.post('/events', validate(submitSensorEventSchema), requireDeviceAuth, submitSensorEvent);

// Sensor event history & latest per-device status (authenticated via Bearer JWT)
router.get('/events', requireAuth, getSensorEvents);
router.get('/status', requireAuth, getLatestSensorStatus);

module.exports = router;
