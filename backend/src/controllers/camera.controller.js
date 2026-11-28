const mongoose = require('mongoose');
const { Camera } = require('../models/Camera.model');
const { Zone } = require('../models/Zone.model');
const { sweepStaleCameras, reconcileCameraStatus } = require('../services/heartbeatMonitor.service');
const { recordAuditLog } = require('../services/audit.service');
const { AppError } = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * POST /api/cameras
 * Registers a new camera (including Smartphone Wi-Fi stream, Local USB, RTSP, or IP HTTP)
 * and maps it to an active workplace zone (`ADMINISTRATOR` only).
 */
const registerCamera = async (req, res, next) => {
  try {
    const { cameraCode, cameraName, zoneId, locationDescription, streamType, streamUrl } = req.body;

    if (!mongoose.Types.ObjectId.isValid(zoneId)) {
      return next(new AppError('Invalid zoneId format.', 400, 'INVALID_IDENTIFIER'));
    }

    const zone = await Zone.findById(zoneId);
    if (!zone) {
      return next(new AppError('Assigned workplace zone not found.', 404, 'ZONE_NOT_FOUND'));
    }

    if (zone.status !== 'ACTIVE') {
      return next(
        new AppError('Cannot register a camera to an INACTIVE workplace zone.', 400, 'ZONE_INACTIVE')
      );
    }

    const newCamera = await Camera.create({
      cameraCode,
      cameraName,
      zoneId,
      locationDescription: locationDescription || null,
      streamType: streamType || 'SMARTPHONE_WIFI',
      streamUrl: streamUrl || null,
      status: 'OFFLINE',
      lastHeartbeat: null,
    });

    await recordAuditLog({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'CAMERA_REGISTERED',
      entityType: 'CAMERA',
      entityId: newCamera.cameraId,
      details: {
        cameraCode: newCamera.cameraCode,
        cameraName: newCamera.cameraName,
        zoneId: newCamera.zoneId.toString(),
        streamType: newCamera.streamType,
        streamUrl: newCamera.streamUrl,
      },
    });

    const populatedCamera = await Camera.findById(newCamera._id).populate('zoneId', 'zoneCode zoneName status');

    return sendSuccess(res, 201, 'Camera registered successfully', {
      camera: populatedCamera,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/cameras
 * Evaluates stale camera heartbeats (`>90s` -> `OFFLINE`) and returns registered cameras scoped by role:
 * - ADMINISTRATOR: All cameras across all workplace zones.
 * - SUPERVISOR: Cameras within the supervisor's assigned workplace zones only.
 * - WORKER: 403 Forbidden.
 */
const getCameras = async (req, res, next) => {
  try {
    const { role, assignedZoneIds } = req.user;

    if (role === 'WORKER') {
      return next(new AppError('Access denied. Workers cannot view camera registries.', 403, 'FORBIDDEN'));
    }

    // Automatically transition any stale ONLINE cameras (>90s without heartbeat) to OFFLINE
    await sweepStaleCameras();

    const filter = {};
    if (req.query.status) {
      filter.status = String(req.query.status).toUpperCase();
    }
    if (req.query.streamType) {
      filter.streamType = String(req.query.streamType).toUpperCase();
    }

    if (role === 'SUPERVISOR') {
      if (!assignedZoneIds || assignedZoneIds.length === 0) {
        return sendSuccess(res, 200, 'Cameras retrieved successfully', {
          cameras: [],
          total: 0,
        });
      }
      if (req.query.zoneId) {
        const requestedZoneId = String(req.query.zoneId);
        if (!assignedZoneIds.includes(requestedZoneId)) {
          return next(
            new AppError(
              'Access denied. Supervisors can only view cameras in their assigned workplace zones.',
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

    const cameras = await Camera.find(filter)
      .populate('zoneId', 'zoneCode zoneName status')
      .sort({ cameraCode: 1 });

    return sendSuccess(res, 200, 'Cameras retrieved successfully', {
      cameras,
      total: cameras.length,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/cameras/:id
 * Returns a single camera after reconciling its heartbeat timeout status.
 */
const getCameraById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid camera ID format.', 400, 'INVALID_IDENTIFIER'));
    }

    const { role, assignedZoneIds } = req.user;
    if (role === 'WORKER') {
      return next(new AppError('Access denied. Workers cannot view camera details.', 403, 'FORBIDDEN'));
    }

    let camera = await Camera.findById(id).populate('zoneId', 'zoneCode zoneName status');
    if (!camera) {
      return next(new AppError('Camera not found.', 404, 'CAMERA_NOT_FOUND'));
    }

    const recordZoneId = camera.zoneId?._id
      ? camera.zoneId._id.toString()
      : camera.zoneId?.toString();

    if (role === 'SUPERVISOR' && !assignedZoneIds.includes(recordZoneId)) {
      return next(
        new AppError(
          'Access denied. This camera belongs to an unassigned workplace zone.',
          403,
          'ZONE_ACCESS_DENIED'
        )
      );
    }

    camera = await reconcileCameraStatus(camera);

    return sendSuccess(res, 200, 'Camera retrieved successfully', {
      camera,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/cameras/:id
 * Updates camera configuration (`cameraName`, `zoneId`, `streamType`, `streamUrl`, `status`) (`ADMINISTRATOR` only).
 */
const updateCamera = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid camera ID format.', 400, 'INVALID_IDENTIFIER'));
    }

    const camera = await Camera.findById(id);
    if (!camera) {
      return next(new AppError('Camera not found.', 404, 'CAMERA_NOT_FOUND'));
    }

    if (req.body.zoneId) {
      if (!mongoose.Types.ObjectId.isValid(req.body.zoneId)) {
        return next(new AppError('Invalid zoneId format.', 400, 'INVALID_IDENTIFIER'));
      }
      const zone = await Zone.findById(req.body.zoneId);
      if (!zone) {
        return next(new AppError('Assigned workplace zone not found.', 404, 'ZONE_NOT_FOUND'));
      }
      if (zone.status !== 'ACTIVE') {
        return next(
          new AppError('Cannot assign camera to an INACTIVE workplace zone.', 400, 'ZONE_INACTIVE')
        );
      }
    }

    Object.assign(camera, req.body);
    await camera.save();

    await recordAuditLog({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'CAMERA_UPDATED',
      entityType: 'CAMERA',
      entityId: camera.cameraId,
      details: req.body,
    });

    const populatedCamera = await Camera.findById(camera._id).populate('zoneId', 'zoneCode zoneName status');

    return sendSuccess(res, 200, 'Camera updated successfully', {
      camera: populatedCamera,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/cameras/:id/status
 * Updates camera operational status (`ONLINE`, `OFFLINE`, `STREAM_ERROR`, `MAINTENANCE`) (`ADMINISTRATOR` only).
 */
const updateCameraStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid camera ID format.', 400, 'INVALID_IDENTIFIER'));
    }

    const camera = await Camera.findById(id);
    if (!camera) {
      return next(new AppError('Camera not found.', 404, 'CAMERA_NOT_FOUND'));
    }

    const { status, reconnectAttempts, lastStreamError } = req.body;
    camera.status = status;
    if (status === 'ONLINE') {
      camera.lastHeartbeat = new Date();
      camera.reconnectAttempts = 0;
      camera.lastStreamError = null;
    }
    if (reconnectAttempts !== undefined) {
      camera.reconnectAttempts = reconnectAttempts;
    }
    if (lastStreamError !== undefined) {
      camera.lastStreamError = lastStreamError;
    }
    await camera.save();

    await recordAuditLog({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'CAMERA_STATUS_CHANGED',
      entityType: 'CAMERA',
      entityId: camera.cameraId,
      details: {
        cameraCode: camera.cameraCode,
        status: camera.status,
        reconnectAttempts: camera.reconnectAttempts,
      },
    });

    return sendSuccess(res, 200, 'Camera status updated successfully', {
      camera,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/cameras/heartbeat
 * Authenticated via `requireMlAuth` (`X-ML-Service-Key`).
 * Allows the Smartphone Wi-Fi camera stream bridge or ML inference service to report
 * camera connectivity (`ONLINE`, `OFFLINE`, `STREAM_ERROR`) and reconnection telemetry.
 */
const recordCameraHeartbeat = async (req, res, next) => {
  try {
    const { cameraCode, status, streamUrl, reconnectAttempts, lastStreamError } = req.body;

    const camera = await Camera.findOne({ cameraCode });
    if (!camera) {
      return next(new AppError(`Registered camera '${cameraCode}' not found.`, 404, 'CAMERA_NOT_FOUND'));
    }

    if (camera.status === 'MAINTENANCE') {
      return next(
        new AppError(
          `Camera '${camera.cameraCode}' is in MAINTENANCE mode.`,
          403,
          'CAMERA_IN_MAINTENANCE'
        )
      );
    }

    camera.status = status || 'ONLINE';
    if (camera.status === 'ONLINE') {
      camera.lastHeartbeat = new Date();
      camera.reconnectAttempts = 0;
      camera.lastStreamError = null;
    }
    if (streamUrl !== undefined) {
      camera.streamUrl = streamUrl;
    }
    if (reconnectAttempts !== undefined) {
      camera.reconnectAttempts = reconnectAttempts;
    }
    if (lastStreamError !== undefined) {
      camera.lastStreamError = lastStreamError;
    }
    await camera.save();

    return sendSuccess(res, 200, 'Camera heartbeat recorded', {
      cameraId: camera.cameraId,
      cameraCode: camera.cameraCode,
      zoneId: camera.zoneId.toString(),
      status: camera.status,
      streamType: camera.streamType,
      streamUrl: camera.streamUrl,
      reconnectAttempts: camera.reconnectAttempts,
      lastHeartbeat: camera.lastHeartbeat,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  registerCamera,
  getCameras,
  getCameraById,
  updateCamera,
  updateCameraStatus,
  recordCameraHeartbeat,
};
