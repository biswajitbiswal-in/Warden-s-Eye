const express = require('express');
const { getWorkers, getMyWorkerProfile, getWorkerById } = require('../controllers/worker.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', getWorkers);
router.get('/me', getMyWorkerProfile);
router.get('/:id', getWorkerById);

module.exports = router;
