const express = require('express');
const {
  getSystemOverview,
  getAdminZones,
  createZone,
  updateZone,
  deleteZone,
  assignSupervisorToZone,
  unassignSupervisorFromZone,
  getSupervisors,
  createSupervisor,
  updateSupervisor,
  deleteSupervisor,
  getAuditLogs,
} = require('../controllers/admin.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  createZoneSchema,
  updateZoneSchema,
  assignSupervisorSchema,
  createSupervisorSchema,
  updateSupervisorSchema,
} = require('../validators/admin.validator');

const router = express.Router();

// All /api/admin/* endpoints strictly require an authenticated ADMINISTRATOR
router.use(requireAuth, requireRole(['ADMINISTRATOR']));

// System Overview & Audit Logs
router.get('/overview', getSystemOverview);
router.get('/audit-logs', getAuditLogs);

// Workplace Zone Management & Supervisor Assignment
router.get('/zones', getAdminZones);
router.post('/zones', validate(createZoneSchema), createZone);
router.put('/zones/:id', validate(updateZoneSchema), updateZone);
router.delete('/zones/:id', deleteZone);
router.post('/zones/:id/assign-supervisor', validate(assignSupervisorSchema), assignSupervisorToZone);
router.delete('/zones/:id/assign-supervisor/:supervisorId', unassignSupervisorFromZone);

// Supervisor Management
router.get('/supervisors', getSupervisors);
router.post('/supervisors', validate(createSupervisorSchema), createSupervisor);
router.put('/supervisors/:id', validate(updateSupervisorSchema), updateSupervisor);
router.delete('/supervisors/:id', deleteSupervisor);

module.exports = router;
