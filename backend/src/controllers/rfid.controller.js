const mongoose = require('mongoose');
const { getEnv } = require('../config/env');
const { Worker } = require('../models/Worker.model');
const { RfidLog } = require('../models/RfidLog.model');
const { Incident } = require('../models/Incident.model');
const { recordAuditLog } = require('../services/audit.service');
const { AppError } = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * POST /api/rfid/scan
 * Authenticated via `requireDeviceAuth` (`X-Device-Code` + `X-Device-Key`).
 * - Resolves zoneId strictly from the registered ESP32 device (`req.device.zoneId`).
 * - Updates device `lastHeartbeat` and sets status to `ONLINE`.
 * - Enforces duplicate-scan cooldown (`RFID_COOLDOWN_SECONDS`, default 10s).
 * - Resolves active worker by `rfidUid` and updates `worker.lastSeenZoneId` and `worker.lastRfidScanAt`.
 * - For unknown cards: records `UNKNOWN_CARD` without auto-creating a worker, and creates/merges an
 *   `UNKNOWN_RFID` incident subject to `INCIDENT_COOLDOWN_SECONDS`.
 */
const scanRfidCard = async (req, res, next) => {
  try {
    const device = req.device;
    const { rfidUid, occurredAt, firmwareVersion } = req.body;
    const scanTimestamp = occurredAt ? new Date(occurredAt) : new Date();
    const { rfidCooldownSeconds, incidentCooldownSeconds } = getEnv();

    // Update device heartbeat on valid incoming event
    device.lastHeartbeat = new Date();
    device.status = 'ONLINE';
    if (firmwareVersion) {
      device.firmwareVersion = firmwareVersion;
    }
    await device.save();

    // 1. Check Duplicate Scan Cooldown Window on this device for this UID
    const cooldownCutoff = new Date(scanTimestamp.getTime() - rfidCooldownSeconds * 1000);
    const recentScan = await RfidLog.findOne({
      rfidUid,
      deviceId: device._id,
      scanStatus: { $in: ['SUCCESS', 'UNKNOWN_CARD'] },
      occurredAt: { $gte: cooldownCutoff },
    }).sort({ occurredAt: -1 });

    // Look up registered active worker by rfidUid
    const worker = await Worker.findOne({ rfidUid, status: 'ACTIVE' });

    if (recentScan) {
      const duplicateLog = await RfidLog.create({
        rfidUid,
        workerId: worker ? worker._id : null,
        deviceId: device._id,
        deviceCode: device.deviceCode,
        zoneId: device.zoneId,
        scanStatus: 'DUPLICATE_IGNORED',
        occurredAt: scanTimestamp,
      });

      return sendSuccess(res, 200, 'Duplicate RFID scan within cooldown window ignored', {
        logId: duplicateLog.logId,
        recognized: Boolean(worker),
        scanStatus: 'DUPLICATE_IGNORED',
        duplicateIgnored: true,
        zoneId: device.zoneId.toString(),
        worker: worker
          ? {
              workerId: worker.workerId,
              employeeCode: worker.employeeCode,
              name: worker.name,
              department: worker.department,
              assignedZoneId: worker.zoneId.toString(),
            }
          : null,
        occurredAt: duplicateLog.occurredAt,
      });
    }

    // 2. Recognized Active Worker Path
    if (worker) {
      worker.lastSeenZoneId = device.zoneId;
      worker.lastRfidScanAt = scanTimestamp;
      await worker.save();

      const successLog = await RfidLog.create({
        rfidUid,
        workerId: worker._id,
        deviceId: device._id,
        deviceCode: device.deviceCode,
        zoneId: device.zoneId,
        scanStatus: 'SUCCESS',
        occurredAt: scanTimestamp,
      });

      return sendSuccess(res, 200, 'Worker identified', {
        logId: successLog.logId,
        recognized: true,
        scanStatus: 'SUCCESS',
        duplicateIgnored: false,
        zoneId: device.zoneId.toString(),
        worker: {
          workerId: worker.workerId,
          employeeCode: worker.employeeCode,
          name: worker.name,
          department: worker.department,
          assignedZoneId: worker.zoneId.toString(),
        },
        occurredAt: successLog.occurredAt,
      });
    }

    // 3. Unknown RFID Card Path (Never auto-create a worker)
    const unknownLog = await RfidLog.create({
      rfidUid,
      workerId: null,
      deviceId: device._id,
      deviceCode: device.deviceCode,
      zoneId: device.zoneId,
      scanStatus: 'UNKNOWN_CARD',
      occurredAt: scanTimestamp,
    });

    // Check Incident Deduplication Cooldown for UNKNOWN_RFID on this device/zone
    const incidentCooldownCutoff = new Date(Date.now() - incidentCooldownSeconds * 1000);
    let activeIncident = await Incident.findOne({
      zoneId: device.zoneId,
      deviceOrCameraCode: device.deviceCode,
      incidentType: 'UNKNOWN_RFID',
      status: { $in: ['OPEN', 'UNDER_REVIEW'] },
      updatedAt: { $gte: incidentCooldownCutoff },
    });

    let incidentCreated = false;
    if (activeIncident) {
      activeIncident.occurrenceCount += 1;
      await activeIncident.save();
    } else {
      activeIncident = await Incident.create({
        incidentType: 'UNKNOWN_RFID',
        isEmergency: false,
        severity: 'MEDIUM',
        status: 'OPEN',
        zoneId: device.zoneId,
        workerId: null,
        sourceType: 'RFID_SCAN',
        sourceId: unknownLog._id,
        deviceOrCameraCode: device.deviceCode,
        description: `Unregistered RFID card (${rfidUid}) scanned at device ${device.deviceCode}`,
        occurrenceCount: 1,
      });
      incidentCreated = true;

      await recordAuditLog({
        actorId: null,
        actorRole: 'DEVICE',
        action: 'UNKNOWN_RFID_INCIDENT_CREATED',
        entityType: 'INCIDENT',
        entityId: activeIncident.incidentId,
        details: {
          rfidUid,
          deviceCode: device.deviceCode,
          zoneId: device.zoneId.toString(),
        },
      });
    }

    return sendSuccess(res, 200, 'Unknown RFID card recorded', {
      logId: unknownLog.logId,
      recognized: false,
      scanStatus: 'UNKNOWN_CARD',
      duplicateIgnored: false,
      zoneId: device.zoneId.toString(),
      worker: null,
      incidentCreated,
      incidentId: activeIncident.incidentId,
      occurredAt: unknownLog.occurredAt,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/rfid/logs
 * Returns RFID scan history scoped by user role and zone permissions:
 * - ADMINISTRATOR: All zones (supports ?zoneId=, ?scanStatus=, ?rfidUid=).
 * - SUPERVISOR: Assigned zones only.
 * - WORKER: Own workerId RFID logs only.
 */
const getRfidLogs = async (req, res, next) => {
  try {
    const { role, assignedZoneIds, workerId } = req.user;
    const filter = {};

    if (req.query.scanStatus) {
      filter.scanStatus = String(req.query.scanStatus).toUpperCase();
    }
    if (req.query.rfidUid) {
      filter.rfidUid = String(req.query.rfidUid).toUpperCase();
    }

    if (role === 'WORKER') {
      if (!workerId) {
        return sendSuccess(res, 200, 'RFID scan logs retrieved successfully', {
          logs: [],
          total: 0,
        });
      }
      filter.workerId = workerId;
    } else if (role === 'SUPERVISOR') {
      if (!assignedZoneIds || assignedZoneIds.length === 0) {
        return sendSuccess(res, 200, 'RFID scan logs retrieved successfully', {
          logs: [],
          total: 0,
        });
      }
      if (req.query.zoneId) {
        const requestedZoneId = String(req.query.zoneId);
        if (!assignedZoneIds.includes(requestedZoneId)) {
          return next(
            new AppError(
              'Access denied. Supervisors can only view RFID logs in their assigned workplace zones.',
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

    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const logs = await RfidLog.find(filter)
      .populate('workerId', 'employeeCode name department')
      .populate('zoneId', 'zoneCode zoneName')
      .sort({ occurredAt: -1 })
      .limit(limit);

    return sendSuccess(res, 200, 'RFID scan logs retrieved successfully', {
      logs,
      total: logs.length,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  scanRfidCard,
  getRfidLogs,
};
