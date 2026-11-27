const express = require('express');
const {
  getWorkers,
  getMyWorkerProfile,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
} = require('../controllers/worker.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createWorkerSchema, updateWorkerSchema } = require('../validators/worker.validator');

const router = express.Router();

router.use(requireAuth);

router.get('/', getWorkers);
router.get('/me', getMyWorkerProfile);
router.get('/:id', getWorkerById);

// Administrator-only worker management routes
router.post('/', requireRole(['ADMINISTRATOR']), validate(createWorkerSchema), createWorker);
router.put('/:id', requireRole(['ADMINISTRATOR']), validate(updateWorkerSchema), updateWorker);
router.delete('/:id', requireRole(['ADMINISTRATOR']), deleteWorker);

module.exports = router;
