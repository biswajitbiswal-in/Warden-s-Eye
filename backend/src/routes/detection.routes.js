const express = require('express');
const {
  submitDetection,
  getDetections,
  getDetectionById,
} = require('../controllers/detection.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireMlAuth } = require('../middleware/mlAuth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { submitDetectionSchema } = require('../validators/detection.validator');

const router = express.Router();

// ML service / Mock ML detection ingestion route (authenticated via X-ML-Service-Key)
router.post('/', validate(submitDetectionSchema), requireMlAuth, submitDetection);

// Dashboard detection history routes (authenticated via Bearer JWT)
router.get('/', requireAuth, getDetections);
router.get('/:id', requireAuth, getDetectionById);

module.exports = router;
