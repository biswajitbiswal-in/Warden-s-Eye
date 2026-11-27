const express = require('express');
const {
  registerDevice,
  getDevices,
  getDeviceById,
  updateDevice,
  rotateDeviceApiKey,
  recordHeartbeat,
} = require('../controllers/device.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { requireDeviceAuth } = require('../middleware/deviceAuth.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  registerDeviceSchema,
  updateDeviceSchema,
  deviceHeartbeatSchema,
} = require('../validators/device.validator');

const router = express.Router();

// ESP32 hardware heartbeat route (authenticated via X-Device-Code & X-Device-Key)
router.post('/heartbeat', validate(deviceHeartbeatSchema), requireDeviceAuth, recordHeartbeat);

// Human user / dashboard routes (authenticated via Bearer JWT)
router.use(requireAuth);

router.get('/', getDevices);
router.get('/:id', getDeviceById);

// Administrator-only device registration, configuration & key rotation
router.post('/', requireRole(['ADMINISTRATOR']), validate(registerDeviceSchema), registerDevice);
router.patch('/:id', requireRole(['ADMINISTRATOR']), validate(updateDeviceSchema), updateDevice);
router.post('/:id/rotate-key', requireRole(['ADMINISTRATOR']), rotateDeviceApiKey);

module.exports = router;
