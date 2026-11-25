const mongoose = require('mongoose');
const { Zone } = require('../models/Zone.model');
const { AppError } = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/zones
 * Enforces role-scoped workplace zone visibility per SECURITY_AND_ROLES.md:
 * - ADMINISTRATOR: Views all workplace zones.
 * - SUPERVISOR: Views only their assigned workplace zones.
 * - WORKER: Views only their own assigned workplace zone (if linked to a worker profile).
 */
const getZones = async (req, res, next) => {
  try {
    const { role, assignedZoneIds, workerZoneId } = req.user;
    const filter = {};

    if (role === 'SUPERVISOR') {
      filter._id = { $in: assignedZoneIds || [] };
    } else if (role === 'WORKER') {
      if (!workerZoneId) {
        return sendSuccess(res, 200, 'Workplace zones retrieved successfully', {
          zones: [],
          total: 0,
        });
      }
      filter._id = workerZoneId;
    }

    if (req.query.status) {
      filter.status = String(req.query.status).toUpperCase();
    }

    const zones = await Zone.find(filter).sort({ zoneCode: 1 });

    return sendSuccess(res, 200, 'Workplace zones retrieved successfully', {
      zones,
      total: zones.length,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/zones/:id
 * Enforces zone-level access restrictions:
 * - ADMINISTRATOR: Can access any workplace zone.
 * - SUPERVISOR: Can access only an assigned workplace zone; unassigned zone returns 403 Forbidden.
 * - WORKER: Can access only their own assigned workplace zone; any other zone returns 403 Forbidden.
 */
const getZoneById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid zone ID format.', 400, 'INVALID_IDENTIFIER'));
    }

    const { role, assignedZoneIds, workerZoneId } = req.user;

    if (role === 'SUPERVISOR' && !assignedZoneIds.includes(id)) {
      return next(
        new AppError(
          'Access denied. Supervisors can only access their assigned workplace zones.',
          403,
          'ZONE_ACCESS_DENIED'
        )
      );
    }

    if (role === 'WORKER' && workerZoneId !== id) {
      return next(
        new AppError(
          'Access denied. Workers can only view their own assigned workplace zone.',
          403,
          'ZONE_ACCESS_DENIED'
        )
      );
    }

    const zone = await Zone.findById(id);
    if (!zone) {
      return next(new AppError('Workplace zone not found.', 404, 'ZONE_NOT_FOUND'));
    }

    return sendSuccess(res, 200, 'Workplace zone retrieved successfully', {
      zone,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getZones,
  getZoneById,
};
