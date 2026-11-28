const express = require('express');
const {
  registerCamera,
  getCameras,
  getCameraById,
  updateCamera,
  updateCameraStatus,
  recordCameraHeartbeat,
} = require('../controllers/camera.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { requireMlAuth } = require('../middleware/mlAuth.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  registerCameraSchema,
  updateCameraSchema,
  updateCameraStatusSchema,
  cameraHeartbeatSchema,
} = require('../validators/camera.validator');

const router = express.Router();

// Smartphone Wi-Fi stream bridge / ML service camera heartbeat & reconnection telemetry
router.post('/heartbeat', validate(cameraHeartbeatSchema), requireMlAuth, recordCameraHeartbeat);

// Human user / dashboard routes (authenticated via Bearer JWT)
router.use(requireAuth);

router.get('/', getCameras);
router.get('/:id', getCameraById);

// Administrator-only camera registration & status management
router.post('/', requireRole(['ADMINISTRATOR']), validate(registerCameraSchema), registerCamera);
router.patch('/:id', requireRole(['ADMINISTRATOR']), validate(updateCameraSchema), updateCamera);
router.patch(
  '/:id/status',
  requireRole(['ADMINISTRATOR']),
  validate(updateCameraStatusSchema),
  updateCameraStatus
);

module.exports = router;
