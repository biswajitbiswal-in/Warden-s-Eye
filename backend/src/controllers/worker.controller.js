const mongoose = require('mongoose');
const { Worker } = require('../models/Worker.model');
const { AppError } = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/workers
 * Enforces SECURITY_AND_ROLES.md & ApiDocumentation.md Section 4.2:
 * - WORKER: 403 Forbidden (Workers cannot browse other workers; they must use /api/workers/me or /api/workers/:ownId).
 * - SUPERVISOR: Returns only workers assigned to the supervisor's assigned workplace zones (read-only).
 * - ADMINISTRATOR: Returns all workers across all workplace zones (supports optional ?zoneId= and ?status= filters).
 */
const getWorkers = async (req, res, next) => {
  try {
    const { role, assignedZoneIds } = req.user;

    if (role === 'WORKER') {
      return next(
        new AppError(
          'Access denied. Workers cannot list all workers. Use GET /api/workers/me to view your profile.',
          403,
          'FORBIDDEN'
        )
      );
    }

    const filter = {};

    if (req.query.status) {
      filter.status = String(req.query.status).toUpperCase();
    }

    if (role === 'SUPERVISOR') {
      if (!assignedZoneIds || assignedZoneIds.length === 0) {
        return sendSuccess(res, 200, 'Workers retrieved successfully', {
          workers: [],
          total: 0,
        });
      }

      if (req.query.zoneId) {
        const requestedZoneId = String(req.query.zoneId);
        if (!assignedZoneIds.includes(requestedZoneId)) {
          return next(
            new AppError(
              'Access denied. You can only view workers within your assigned workplace zones.',
              403,
              'ZONE_ACCESS_DENIED'
            )
          );
        }
        filter.zoneId = requestedZoneId;
      } else {
        filter.zoneId = { $in: assignedZoneIds };
      }
    } else if (role === 'ADMINISTRATOR' && req.query.zoneId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.zoneId)) {
        return next(new AppError('Invalid zoneId query parameter.', 400, 'INVALID_IDENTIFIER'));
      }
      filter.zoneId = req.query.zoneId;
    }

    const workers = await Worker.find(filter)
      .populate('zoneId', 'zoneCode zoneName status')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Workers retrieved successfully', {
      workers,
      total: workers.length,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/workers/me
 * Self-service endpoint for an authenticated WORKER to view their own linked worker profile.
 */
const getMyWorkerProfile = async (req, res, next) => {
  try {
    if (!req.user.workerId) {
      return next(
        new AppError('No worker profile is linked to this user account.', 404, 'WORKER_PROFILE_NOT_FOUND')
      );
    }

    const worker = await Worker.findById(req.user.workerId).populate('zoneId', 'zoneCode zoneName status');
    if (!worker) {
      return next(new AppError('Worker profile not found.', 404, 'WORKER_NOT_FOUND'));
    }

    return sendSuccess(res, 200, 'Worker profile retrieved successfully', {
      worker,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/workers/:id
 * Enforces IDOR & Zone Isolation rules:
 * - ADMINISTRATOR: Can view any worker by ID.
 * - SUPERVISOR: Can view the worker ONLY if the worker's zoneId is in the supervisor's assignedZoneIds.
 * - WORKER: Can view ONLY their own worker record (req.user.workerId === :id); any other ID returns 403 Forbidden.
 */
const getWorkerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid worker ID format.', 400, 'INVALID_IDENTIFIER'));
    }

    const { role, workerId, assignedZoneIds } = req.user;

    if (role === 'WORKER' && workerId !== id) {
      return next(
        new AppError(
          'Access denied. Workers can only view their own worker profile.',
          403,
          'FORBIDDEN'
        )
      );
    }

    const worker = await Worker.findById(id).populate('zoneId', 'zoneCode zoneName status');
    if (!worker) {
      return next(new AppError('Worker not found.', 404, 'WORKER_NOT_FOUND'));
    }

    const recordZoneId = worker.zoneId?._id
      ? worker.zoneId._id.toString()
      : worker.zoneId?.toString();

    if (role === 'SUPERVISOR' && !assignedZoneIds.includes(recordZoneId)) {
      return next(
        new AppError(
          'Access denied. This worker belongs to an unassigned workplace zone.',
          403,
          'ZONE_ACCESS_DENIED'
        )
      );
    }

    return sendSuccess(res, 200, 'Worker retrieved successfully', {
      worker,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getWorkers,
  getMyWorkerProfile,
  getWorkerById,
};
