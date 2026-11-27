const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { getEnv } = require('../config/env');
const { User } = require('../models/User.model');
const { Zone } = require('../models/Zone.model');
const { Worker } = require('../models/Worker.model');
const { ZoneAssignment } = require('../models/ZoneAssignment.model');
const { Device } = require('../models/Device.model');
const { Camera } = require('../models/Camera.model');
const { Incident } = require('../models/Incident.model');
const { AuditLog } = require('../models/AuditLog.model');
const { recordAuditLog } = require('../services/audit.service');
const { AppError } = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/admin/overview
 * System-wide administrative metrics across all workplace zones.
 */
const getSystemOverview = async (_req, res, next) => {
  try {
    const [
      totalZones,
      activeZones,
      totalWorkers,
      activeWorkers,
      totalSupervisors,
      totalDevices,
      onlineDevices,
      totalCameras,
      onlineCameras,
      totalIncidents,
      openIncidents,
      activeGraceWarnings,
    ] = await Promise.all([
      Zone.countDocuments(),
      Zone.countDocuments({ status: 'ACTIVE' }),
      Worker.countDocuments(),
      Worker.countDocuments({ status: 'ACTIVE' }),
      User.countDocuments({ role: 'SUPERVISOR', status: 'ACTIVE' }),
      Device.countDocuments(),
      Device.countDocuments({ status: 'ONLINE' }),
      Camera.countDocuments(),
      Camera.countDocuments({ status: 'ONLINE' }),
      Incident.countDocuments(),
      Incident.countDocuments({ status: { $in: ['OPEN', 'UNDER_REVIEW'] } }),
      Incident.countDocuments({ status: 'WARNING_GRACE_PERIOD' }),
    ]);

    return sendSuccess(res, 200, 'System overview retrieved successfully', {
      overview: {
        totalZones,
        activeZones,
        totalWorkers,
        activeWorkers,
        totalSupervisors,
        totalDevices,
        onlineDevices,
        totalCameras,
        onlineCameras,
        totalIncidents,
        openIncidents,
        activeGraceWarnings,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/zones
 * Lists all workplace zones with their assigned supervisors.
 */
const getAdminZones = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = String(req.query.status).toUpperCase();
    }

    const zones = await Zone.find(filter).sort({ zoneCode: 1 });
    const assignments = await ZoneAssignment.find({ status: 'ACTIVE' }).populate(
      'userId',
      'name email role status'
    );

    const assignmentsByZone = {};
    for (const assignment of assignments) {
      const zId = assignment.zoneId.toString();
      if (!assignmentsByZone[zId]) {
        assignmentsByZone[zId] = [];
      }
      if (assignment.userId) {
        assignmentsByZone[zId].push({
          assignmentId: assignment.assignmentId,
          userId: assignment.userId._id.toString(),
          name: assignment.userId.name,
          email: assignment.userId.email,
          assignedAt: assignment.assignedAt,
        });
      }
    }

    const enrichedZones = zones.map((zone) => {
      const zObj = zone.toJSON();
      zObj.assignedSupervisors = assignmentsByZone[zObj.zoneId] || [];
      return zObj;
    });

    return sendSuccess(res, 200, 'Workplace zones retrieved successfully', {
      zones: enrichedZones,
      total: enrichedZones.length,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/admin/zones
 * Creates a new workplace zone and records an audit log entry.
 */
const createZone = async (req, res, next) => {
  try {
    const { zoneCode, zoneName, description, status } = req.body;

    const newZone = await Zone.create({
      zoneCode,
      zoneName,
      description: description || null,
      status: status || 'ACTIVE',
    });

    await recordAuditLog({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'ZONE_CREATED',
      entityType: 'ZONE',
      entityId: newZone.zoneId,
      details: {
        zoneCode: newZone.zoneCode,
        zoneName: newZone.zoneName,
        status: newZone.status,
      },
    });

    return sendSuccess(res, 201, 'Workplace zone created successfully', {
      zone: newZone,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/admin/zones/:id
 * Updates a workplace zone and records an audit log entry.
 */
const updateZone = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid zone ID format.', 400, 'INVALID_IDENTIFIER'));
    }

    const zone = await Zone.findById(id);
    if (!zone) {
      return next(new AppError('Workplace zone not found.', 404, 'ZONE_NOT_FOUND'));
    }

    Object.assign(zone, req.body);
    await zone.save();

    await recordAuditLog({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'ZONE_UPDATED',
      entityType: 'ZONE',
      entityId: zone.zoneId,
      details: req.body,
    });

    return sendSuccess(res, 200, 'Workplace zone updated successfully', {
      zone,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/admin/zones/:id
 * Soft-deactivates a workplace zone (`status: 'INACTIVE'`) and records an audit log entry.
 */
const deleteZone = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid zone ID format.', 400, 'INVALID_IDENTIFIER'));
    }

    const zone = await Zone.findById(id);
    if (!zone) {
      return next(new AppError('Workplace zone not found.', 404, 'ZONE_NOT_FOUND'));
    }

    zone.status = 'INACTIVE';
    await zone.save();

    await ZoneAssignment.updateMany({ zoneId: zone._id }, { $set: { status: 'INACTIVE' } });

    await recordAuditLog({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'ZONE_DEACTIVATED',
      entityType: 'ZONE',
      entityId: zone.zoneId,
      details: { zoneCode: zone.zoneCode, status: 'INACTIVE' },
    });

    return sendSuccess(res, 200, 'Workplace zone deactivated successfully', {
      zone,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/admin/zones/:id/assign-supervisor
 * Assigns a supervisor user account to a workplace zone (`ZoneAssignment`).
 */
const assignSupervisorToZone = async (req, res, next) => {
  try {
    const { id: zoneId } = req.params;
    const { supervisorId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(zoneId) || !mongoose.Types.ObjectId.isValid(supervisorId)) {
      return next(new AppError('Invalid zoneId or supervisorId format.', 400, 'INVALID_IDENTIFIER'));
    }

    const [zone, supervisor] = await Promise.all([
      Zone.findById(zoneId),
      User.findById(supervisorId),
    ]);

    if (!zone) {
      return next(new AppError('Workplace zone not found.', 404, 'ZONE_NOT_FOUND'));
    }

    if (!supervisor) {
      return next(new AppError('Supervisor user account not found.', 404, 'USER_NOT_FOUND'));
    }

    if (supervisor.role !== 'SUPERVISOR') {
      return next(
        new AppError(
          `Cannot assign user with role '${supervisor.role}' as a zone supervisor. User must have role SUPERVISOR.`,
          400,
          'INVALID_ROLE'
        )
      );
    }

    if (supervisor.status !== 'ACTIVE') {
      return next(
        new AppError(
          `Cannot assign supervisor with status '${supervisor.status}'. Supervisor must be ACTIVE.`,
          400,
          'SUPERVISOR_INACTIVE'
        )
      );
    }

    if (zone.status !== 'ACTIVE') {
      return next(
        new AppError(
          `Cannot assign supervisor to an INACTIVE workplace zone.`,
          400,
          'ZONE_INACTIVE'
        )
      );
    }

    const assignment = await ZoneAssignment.findOneAndUpdate(
      { userId: supervisor._id, zoneId: zone._id },
      {
        $set: {
          assignedBy: req.user.userId,
          status: 'ACTIVE',
          assignedAt: new Date(),
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    await recordAuditLog({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'SUPERVISOR_ZONE_ASSIGNED',
      entityType: 'ZONE_ASSIGNMENT',
      entityId: assignment.assignmentId,
      details: {
        supervisorId: supervisor.userId,
        supervisorEmail: supervisor.email,
        zoneId: zone.zoneId,
        zoneCode: zone.zoneCode,
      },
    });

    return sendSuccess(res, 200, 'Supervisor assigned to workplace zone successfully', {
      assignment,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/admin/zones/:id/assign-supervisor/:supervisorId
 * Unassigns (deactivates) a supervisor from a workplace zone.
 */
const unassignSupervisorFromZone = async (req, res, next) => {
  try {
    const { id: zoneId, supervisorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(zoneId) || !mongoose.Types.ObjectId.isValid(supervisorId)) {
      return next(new AppError('Invalid zoneId or supervisorId format.', 400, 'INVALID_IDENTIFIER'));
    }

    const assignment = await ZoneAssignment.findOne({
      userId: supervisorId,
      zoneId,
      status: 'ACTIVE',
    });

    if (!assignment) {
      return next(new AppError('Active zone assignment not found.', 404, 'ASSIGNMENT_NOT_FOUND'));
    }

    assignment.status = 'INACTIVE';
    await assignment.save();

    await recordAuditLog({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'SUPERVISOR_ZONE_UNASSIGNED',
      entityType: 'ZONE_ASSIGNMENT',
      entityId: assignment.assignmentId,
      details: {
        supervisorId,
        zoneId,
      },
    });

    return sendSuccess(res, 200, 'Supervisor unassigned from workplace zone successfully', {
      assignment,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/supervisors
 * Lists all supervisor accounts and their assigned workplace zones.
 */
const getSupervisors = async (_req, res, next) => {
  try {
    const supervisors = await User.find({ role: 'SUPERVISOR' }).sort({ createdAt: -1 });
    const assignments = await ZoneAssignment.find({ status: 'ACTIVE' }).populate(
      'zoneId',
      'zoneCode zoneName status'
    );

    const zonesBySupervisor = {};
    for (const assignment of assignments) {
      const sId = assignment.userId.toString();
      if (!zonesBySupervisor[sId]) {
        zonesBySupervisor[sId] = [];
      }
      if (assignment.zoneId) {
        zonesBySupervisor[sId].push({
          zoneId: assignment.zoneId._id.toString(),
          zoneCode: assignment.zoneId.zoneCode,
          zoneName: assignment.zoneId.zoneName,
          status: assignment.zoneId.status,
        });
      }
    }

    const enrichedSupervisors = supervisors.map((sup) => {
      const supObj = sup.toJSON();
      supObj.assignedZones = zonesBySupervisor[supObj.userId] || [];
      return supObj;
    });

    return sendSuccess(res, 200, 'Supervisors retrieved successfully', {
      supervisors: enrichedSupervisors,
      total: enrichedSupervisors.length,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/admin/supervisors
 * Creates a new SUPERVISOR account (with optional initial zoneIds assignments) and records an audit log entry.
 */
const createSupervisor = async (req, res, next) => {
  try {
    const { name, email, password, status, zoneIds } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('A user with this email address already exists.', 409, 'DUPLICATE_EMAIL'));
    }

    const validatedZones = [];
    if (Array.isArray(zoneIds) && zoneIds.length > 0) {
      for (const zId of zoneIds) {
        if (!mongoose.Types.ObjectId.isValid(zId)) {
          return next(new AppError(`Invalid zoneId format in zoneIds: '${zId}'.`, 400, 'INVALID_IDENTIFIER'));
        }
        const zone = await Zone.findById(zId);
        if (!zone) {
          return next(new AppError(`Workplace zone not found for zoneId: '${zId}'.`, 404, 'ZONE_NOT_FOUND'));
        }
        if (zone.status !== 'ACTIVE') {
          return next(
            new AppError(`Cannot assign supervisor to inactive workplace zone '${zone.zoneCode}'.`, 400, 'ZONE_INACTIVE')
          );
        }
        validatedZones.push(zone);
      }
    }

    const { bcryptSaltRounds } = getEnv();
    const passwordHash = await bcrypt.hash(password, bcryptSaltRounds);

    const supervisor = await User.create({
      name,
      email,
      passwordHash,
      role: 'SUPERVISOR',
      status: status || 'ACTIVE',
    });

    const assignedZones = [];
    for (const zone of validatedZones) {
      await ZoneAssignment.findOneAndUpdate(
        { userId: supervisor._id, zoneId: zone._id },
        {
          $set: {
            assignedBy: req.user.userId,
            status: 'ACTIVE',
            assignedAt: new Date(),
          },
        },
        { new: true, upsert: true }
      );
      assignedZones.push({
        zoneId: zone.zoneId,
        zoneCode: zone.zoneCode,
        zoneName: zone.zoneName,
      });
    }

    await recordAuditLog({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'SUPERVISOR_CREATED',
      entityType: 'USER',
      entityId: supervisor.userId,
      details: {
        name: supervisor.name,
        email: supervisor.email,
        assignedZoneIds: assignedZones.map((z) => z.zoneId),
      },
    });

    const supObj = supervisor.toJSON();
    supObj.assignedZones = assignedZones;

    return sendSuccess(res, 201, 'Supervisor created successfully', {
      supervisor: supObj,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/admin/supervisors/:id
 * Updates a supervisor account.
 */
const updateSupervisor = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid supervisor ID format.', 400, 'INVALID_IDENTIFIER'));
    }

    const supervisor = await User.findOne({ _id: id, role: 'SUPERVISOR' });
    if (!supervisor) {
      return next(new AppError('Supervisor account not found.', 404, 'SUPERVISOR_NOT_FOUND'));
    }

    const { name, email, password, status } = req.body;
    if (name !== undefined) supervisor.name = name;
    if (email !== undefined) supervisor.email = email;
    if (status !== undefined) supervisor.status = status;
    if (password !== undefined) {
      const { bcryptSaltRounds } = getEnv();
      supervisor.passwordHash = await bcrypt.hash(password, bcryptSaltRounds);
    }

    await supervisor.save();

    await recordAuditLog({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'SUPERVISOR_UPDATED',
      entityType: 'USER',
      entityId: supervisor.userId,
      details: req.body,
    });

    return sendSuccess(res, 200, 'Supervisor updated successfully', {
      supervisor,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/admin/supervisors/:id
 * Deactivates a supervisor account (`status: 'INACTIVE'`) and deactivates their zone assignments.
 */
const deleteSupervisor = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid supervisor ID format.', 400, 'INVALID_IDENTIFIER'));
    }

    const supervisor = await User.findOne({ _id: id, role: 'SUPERVISOR' });
    if (!supervisor) {
      return next(new AppError('Supervisor account not found.', 404, 'SUPERVISOR_NOT_FOUND'));
    }

    supervisor.status = 'INACTIVE';
    await supervisor.save();

    await ZoneAssignment.updateMany({ userId: supervisor._id }, { $set: { status: 'INACTIVE' } });

    await recordAuditLog({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'SUPERVISOR_DEACTIVATED',
      entityType: 'USER',
      entityId: supervisor.userId,
      details: { email: supervisor.email, status: 'INACTIVE' },
    });

    return sendSuccess(res, 200, 'Supervisor deactivated successfully', {
      supervisor,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/audit-logs
 * Returns paginated append-only system audit logs.
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.action) {
      filter.action = String(req.query.action).toUpperCase();
    }
    if (req.query.entityType) {
      filter.entityType = String(req.query.entityType).toUpperCase();
    }
    if (req.query.actorRole) {
      filter.actorRole = String(req.query.actorRole).toUpperCase();
    }

    const [auditLogs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actorId', 'name email role')
        .sort({ occurredAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, 'Audit logs retrieved successfully', {
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
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
};
