const mongoose = require('mongoose');
const { Device } = require('../models/Device.model');
const { Zone } = require('../models/Zone.model');
const { generateDeviceApiKey, hashDeviceApiKey } = require('../middleware/deviceAuth.middleware');
const { sweepStaleDevices, reconcileDeviceStatus } = require('../services/heartbeatMonitor.service');
const { recordAuditLog } = require('../services/audit.service');
const { AppError } = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * POST /api/devices
 * Registers a new ESP32 IoT device (`ADMINISTRATOR` only).
 * Generates a one-time raw `deviceApiKey` and stores only its SHA-256 `apiKeyHash` in MongoDB.
 */
const registerDevice = async (req, res, next) => {
  try {
    const { deviceCode, deviceName, deviceType, zoneId, firmwareVersion } = req.body;

    if (!mongoose.Types.ObjectId.isValid(zoneId)) {
      return next(new AppError('Invalid zoneId format.', 400, 'INVALID_IDENTIFIER'));
    }

    const zone = await Zone.findById(zoneId);
    if (!zone) {
      return next(new AppError('Assigned workplace zone not found.', 404, 'ZONE_NOT_FOUND'));
    }

    if (zone.status !== 'ACTIVE') {
      return next(
        new AppError('Cannot register an ESP32 device to an INACTIVE workplace zone.', 400, 'ZONE_INACTIVE')
      );
    }

    const rawDeviceApiKey = generateDeviceApiKey();
    const apiKeyHash = hashDeviceApiKey(rawDeviceApiKey);

    const newDevice = await Device.create({
      deviceCode,
      deviceName,
      deviceType: deviceType || 'ESP32',
      zoneId,
      apiKeyHash,
      firmwareVersion: firmwareVersion || null,
      status: 'OFFLINE',
      lastHeartbeat: null,
    });

    await recordAuditLog({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'DEVICE_REGISTERED',
      entityType: 'DEVICE',
      entityId: newDevice.deviceId,
      details: {
        deviceCode: newDevice.deviceCode,
        deviceName: newDevice.deviceName,
        zoneId: newDevice.zoneId.toString(),
      },
    });

    const populatedDevice = await Device.findById(newDevice._id).populate('zoneId', 'zoneCode zoneName status');

    return sendSuccess(
      res,
      201,
      'ESP32 device registered successfully. Save deviceApiKey now; it will not be shown again.',
      {
        device: populatedDevice,
        deviceApiKey: rawDeviceApiKey,
      }
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/devices
 * Evaluates stale heartbeats (`>90s` -> `OFFLINE`) and returns registered devices scoped by role:
 * - ADMINISTRATOR: All devices across all workplace zones.
 * - SUPERVISOR: Devices within the supervisor's assigned workplace zones only.
 * - WORKER: 403 Forbidden.
 */
const getDevices = async (req, res, next) => {
  try {
    const { role, assignedZoneIds } = req.user;

    if (role === 'WORKER') {
      return next(new AppError('Access denied. Workers cannot view IoT device registries.', 403, 'FORBIDDEN'));
    }

    // Automatically transition any stale ONLINE devices (>90s without heartbeat) to OFFLINE
    await sweepStaleDevices();

    const filter = {};
    if (req.query.status) {
      filter.status = String(req.query.status).toUpperCase();
    }

    if (role === 'SUPERVISOR') {
      if (!assignedZoneIds || assignedZoneIds.length === 0) {
        return sendSuccess(res, 200, 'Devices retrieved successfully', {
          devices: [],
          total: 0,
        });
      }
      if (req.query.zoneId) {
        const requestedZoneId = String(req.query.zoneId);
        if (!assignedZoneIds.includes(requestedZoneId)) {
          return next(
            new AppError(
              'Access denied. Supervisors can only view devices in their assigned workplace zones.',
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

    const devices = await Device.find(filter)
      .populate('zoneId', 'zoneCode zoneName status')
      .sort({ deviceCode: 1 });

    return sendSuccess(res, 200, 'Devices retrieved successfully', {
      devices,
      total: devices.length,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/devices/:id
 * Returns a single device after reconciling its heartbeat timeout status.
 */
const getDeviceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid device ID format.', 400, 'INVALID_IDENTIFIER'));
    }

    const { role, assignedZoneIds } = req.user;
    if (role === 'WORKER') {
      return next(new AppError('Access denied. Workers cannot view IoT device details.', 403, 'FORBIDDEN'));
    }

    let device = await Device.findById(id).populate('zoneId', 'zoneCode zoneName status');
    if (!device) {
      return next(new AppError('Device not found.', 404, 'DEVICE_NOT_FOUND'));
    }

    const recordZoneId = device.zoneId?._id
      ? device.zoneId._id.toString()
      : device.zoneId?.toString();

    if (role === 'SUPERVISOR' && !assignedZoneIds.includes(recordZoneId)) {
      return next(
        new AppError(
          'Access denied. This device belongs to an unassigned workplace zone.',
          403,
          'ZONE_ACCESS_DENIED'
        )
      );
    }

    device = await reconcileDeviceStatus(device);

    return sendSuccess(res, 200, 'Device retrieved successfully', {
      device,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/devices/:id
 * Updates device name, assigned zone, or operational status (`ADMINISTRATOR` only).
 */
const updateDevice = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid device ID format.', 400, 'INVALID_IDENTIFIER'));
    }

    const device = await Device.findById(id);
    if (!device) {
      return next(new AppError('Device not found.', 404, 'DEVICE_NOT_FOUND'));
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
          new AppError('Cannot assign device to an INACTIVE workplace zone.', 400, 'ZONE_INACTIVE')
        );
      }
    }

    Object.assign(device, req.body);
    await device.save();

    await recordAuditLog({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'DEVICE_UPDATED',
      entityType: 'DEVICE',
      entityId: device.deviceId,
      details: req.body,
    });

    const populatedDevice = await Device.findById(device._id).populate('zoneId', 'zoneCode zoneName status');

    return sendSuccess(res, 200, 'Device updated successfully', {
      device: populatedDevice,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/devices/:id/rotate-key
 * Rotates a device's API key (`ADMINISTRATOR` only).
 */
const rotateDeviceApiKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid device ID format.', 400, 'INVALID_IDENTIFIER'));
    }

    const device = await Device.findById(id);
    if (!device) {
      return next(new AppError('Device not found.', 404, 'DEVICE_NOT_FOUND'));
    }

    const rawDeviceApiKey = generateDeviceApiKey();
    device.apiKeyHash = hashDeviceApiKey(rawDeviceApiKey);
    await device.save();

    await recordAuditLog({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'DEVICE_KEY_ROTATED',
      entityType: 'DEVICE',
      entityId: device.deviceId,
      details: { deviceCode: device.deviceCode },
    });

    return sendSuccess(
      res,
      200,
      'Device API key rotated successfully. Update the ESP32 firmware with the new key.',
      {
        deviceId: device.deviceId,
        deviceCode: device.deviceCode,
        deviceApiKey: rawDeviceApiKey,
      }
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/devices/heartbeat
 * Authenticated via `requireDeviceAuth` (`X-Device-Code` + `X-Device-Key`).
 * Marks the ESP32 device as ONLINE and updates `lastHeartbeat`.
 */
const recordHeartbeat = async (req, res, next) => {
  try {
    const device = req.device;
    const { status, firmwareVersion, uptimeSeconds } = req.body;

    device.status = status || 'ONLINE';
    device.lastHeartbeat = new Date();
    if (firmwareVersion !== undefined) {
      device.firmwareVersion = firmwareVersion;
    }
    await device.save();

    return sendSuccess(res, 200, 'Device heartbeat recorded', {
      deviceId: device.deviceId,
      deviceCode: device.deviceCode,
      zoneId: device.zoneId.toString(),
      status: device.status,
      lastHeartbeat: device.lastHeartbeat,
      firmwareVersion: device.firmwareVersion,
      uptimeSeconds: uptimeSeconds ?? null,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  registerDevice,
  getDevices,
  getDeviceById,
  updateDevice,
  rotateDeviceApiKey,
  recordHeartbeat,
};
