const mongoose = require('mongoose');
const { getEnv } = require('../config/env');
const { SensorEvent } = require('../models/SensorEvent.model');
const { Device } = require('../models/Device.model');
const { Incident } = require('../models/Incident.model');
const { Worker } = require('../models/Worker.model');
const { Zone } = require('../models/Zone.model');
const { recordAuditLog } = require('../services/audit.service');
const { AppError } = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * POST /api/sensors/events
 * Authenticated via `requireDeviceAuth` (`X-Device-Code` + `X-Device-Key`).
 * - Stores supplementary SMOKE and FLAME sensor readings in `sensorEvents`.
 * - Updates device `lastHeartbeat` and sets status to `ONLINE`.
 * - When `alertStatus` is `WARNING` or `CRITICAL`, creates or merges an incident
 *   (`SMOKE_DETECTED` or `FLAME_DETECTED`) subject to `INCIDENT_COOLDOWN_SECONDS`.
 * - Note: Flame detection (`FLAME`) or critical smoke (`SMOKE` + `CRITICAL`) skips the 120s grace period
 *   and creates an immediate `OPEN` critical/high incident with `manualSosSummary` when critical.
 */
const submitSensorEvent = async (req, res, next) => {
  try {
    const device = req.device;
    const { sensorType, sensorValue, threshold, alertStatus, occurredAt, firmwareVersion } = req.body;
    const eventTimestamp = occurredAt ? new Date(occurredAt) : new Date();
    const { incidentCooldownSeconds } = getEnv();

    // Update device heartbeat
    device.lastHeartbeat = new Date();
    device.status = 'ONLINE';
    if (firmwareVersion) {
      device.firmwareVersion = firmwareVersion;
    }
    await device.save();

    // 1. Save SensorEvent record
    const sensorEvent = await SensorEvent.create({
      deviceId: device._id,
      deviceCode: device.deviceCode,
      zoneId: device.zoneId,
      sensorType,
      sensorValue,
      threshold,
      alertStatus,
      occurredAt: eventTimestamp,
    });

    let incidentCreated = false;
    let cooldownMerged = false;
    let incidentId = null;

    // 2. Evaluate Hazard Alert & Incident Creation
    if (alertStatus === 'WARNING' || alertStatus === 'CRITICAL') {
      const incidentType = sensorType === 'FLAME' ? 'FLAME_DETECTED' : 'SMOKE_DETECTED';
      const isEmergency = sensorType === 'FLAME' || alertStatus === 'CRITICAL';
      const severity = isEmergency ? 'CRITICAL' : 'HIGH';

      const cooldownCutoff = new Date(Date.now() - incidentCooldownSeconds * 1000);
      let activeIncident = await Incident.findOne({
        zoneId: device.zoneId,
        deviceOrCameraCode: device.deviceCode,
        incidentType,
        status: { $in: ['OPEN', 'UNDER_REVIEW'] },
        updatedAt: { $gte: cooldownCutoff },
      });

      if (activeIncident) {
        activeIncident.occurrenceCount += 1;
        if (severity === 'CRITICAL' && activeIncident.severity !== 'CRITICAL') {
          activeIncident.severity = 'CRITICAL';
          activeIncident.isEmergency = true;
        }
        await activeIncident.save();
        cooldownMerged = true;
        incidentId = activeIncident.incidentId;
      } else {
        let manualSosSummary = null;
        if (isEmergency) {
          const [zoneDoc, activeZoneWorkers] = await Promise.all([
            Zone.findById(device.zoneId).lean(),
            Worker.find({ lastSeenZoneId: device.zoneId, status: 'ACTIVE' })
              .select('employeeCode name department lastRfidScanAt')
              .lean(),
          ]);

          const zoneLabel = zoneDoc ? `${zoneDoc.zoneName} (${zoneDoc.zoneCode})` : device.zoneId.toString();
          manualSosSummary = {
            headline: 'URGENT INDUSTRIAL EMERGENCY — MANUAL DISPATCH REQUIRED',
            incidentType,
            severity: 'CRITICAL',
            zoneId: device.zoneId.toString(),
            zoneLabel,
            deviceOrCameraCode: device.deviceCode,
            sensorValue,
            threshold,
            occurredAt: eventTimestamp.toISOString(),
            activeWorkersInZone: activeZoneWorkers.map((w) => ({
              employeeCode: w.employeeCode,
              name: w.name,
              department: w.department,
            })),
            automatedExternalDispatch: false,
            disclaimer:
              'Automated external fire/ambulance dispatch is NOT enabled. Forward this SOS summary or contact emergency services manually.',
          };
        }

        activeIncident = await Incident.create({
          incidentType,
          isEmergency,
          severity,
          status: 'OPEN', // Environmental hazards & emergencies skip the 120s PPE grace period
          zoneId: device.zoneId,
          workerId: null,
          sourceType: 'SENSOR_EVENT',
          sourceId: sensorEvent._id,
          deviceOrCameraCode: device.deviceCode,
          description: `Supplementary ${sensorType} sensor reported ${alertStatus} level (${sensorValue} >= threshold ${threshold}) at device ${device.deviceCode}`,
          occurrenceCount: 1,
          escalatedToSupervisorAt: new Date(),
          manualSosSummary,
        });

        incidentCreated = true;
        incidentId = activeIncident.incidentId;

        await recordAuditLog({
          actorId: null,
          actorRole: 'DEVICE',
          action: isEmergency ? 'CRITICAL_SENSOR_EMERGENCY_CREATED' : 'SENSOR_ALERT_INCIDENT_CREATED',
          entityType: 'INCIDENT',
          entityId: activeIncident.incidentId,
          details: {
            deviceCode: device.deviceCode,
            zoneId: device.zoneId.toString(),
            sensorType,
            sensorValue,
            threshold,
            alertStatus,
          },
        });
      }
    }

    return sendSuccess(res, 201, 'Sensor event recorded', {
      eventId: sensorEvent.eventId,
      deviceCode: device.deviceCode,
      zoneId: device.zoneId.toString(),
      sensorType: sensorEvent.sensorType,
      sensorValue: sensorEvent.sensorValue,
      threshold: sensorEvent.threshold,
      alertStatus: sensorEvent.alertStatus,
      incidentCreated,
      cooldownMerged,
      incidentId,
      occurredAt: sensorEvent.occurredAt,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/sensors/events
 * Returns paginated sensor event history scoped by role:
 * - ADMINISTRATOR: All zones.
 * - SUPERVISOR: Assigned zones only.
 * - WORKER: 403 Forbidden.
 */
const getSensorEvents = async (req, res, next) => {
  try {
    const { role, assignedZoneIds } = req.user;
    if (role === 'WORKER') {
      return next(new AppError('Access denied. Workers cannot query raw sensor telemetry.', 403, 'FORBIDDEN'));
    }

    const filter = {};
    if (req.query.sensorType) {
      filter.sensorType = String(req.query.sensorType).toUpperCase();
    }
    if (req.query.alertStatus) {
      filter.alertStatus = String(req.query.alertStatus).toUpperCase();
    }
    if (req.query.deviceCode) {
      filter.deviceCode = String(req.query.deviceCode).toUpperCase();
    }

    if (role === 'SUPERVISOR') {
      if (!assignedZoneIds || assignedZoneIds.length === 0) {
        return sendSuccess(res, 200, 'Sensor events retrieved successfully', {
          events: [],
          total: 0,
        });
      }
      if (req.query.zoneId) {
        const requestedZoneId = String(req.query.zoneId);
        if (!assignedZoneIds.includes(requestedZoneId)) {
          return next(
            new AppError(
              'Access denied. Supervisors can only view sensor events in their assigned workplace zones.',
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
    const events = await SensorEvent.find(filter)
      .populate('zoneId', 'zoneCode zoneName')
      .sort({ occurredAt: -1 })
      .limit(limit);

    return sendSuccess(res, 200, 'Sensor events retrieved successfully', {
      events,
      total: events.length,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/sensors/status
 * Returns the latest smoke and flame reading per registered ESP32 device in accessible workplace zones.
 */
const getLatestSensorStatus = async (req, res, next) => {
  try {
    const { role, assignedZoneIds } = req.user;
    if (role === 'WORKER') {
      return next(new AppError('Access denied. Workers cannot view device sensor statuses.', 403, 'FORBIDDEN'));
    }

    const deviceFilter = {};
    if (role === 'SUPERVISOR') {
      deviceFilter.zoneId = { $in: assignedZoneIds || [] };
    } else if (role === 'ADMINISTRATOR' && req.query.zoneId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.zoneId)) {
        return next(new AppError('Invalid zoneId query parameter.', 400, 'INVALID_IDENTIFIER'));
      }
      deviceFilter.zoneId = req.query.zoneId;
    }

    const devices = await Device.find(deviceFilter)
      .populate('zoneId', 'zoneCode zoneName status')
      .sort({ deviceCode: 1 });

    const statusList = await Promise.all(
      devices.map(async (dev) => {
        const [latestSmoke, latestFlame] = await Promise.all([
          SensorEvent.findOne({ deviceId: dev._id, sensorType: 'SMOKE' }).sort({ occurredAt: -1 }),
          SensorEvent.findOne({ deviceId: dev._id, sensorType: 'FLAME' }).sort({ occurredAt: -1 }),
        ]);

        return {
          deviceId: dev.deviceId,
          deviceCode: dev.deviceCode,
          deviceName: dev.deviceName,
          status: dev.status,
          lastHeartbeat: dev.lastHeartbeat,
          zone: dev.zoneId,
          sensors: {
            SMOKE: latestSmoke || null,
            FLAME: latestFlame || null,
          },
        };
      })
    );

    return sendSuccess(res, 200, 'Latest sensor status retrieved successfully', {
      devices: statusList,
      total: statusList.length,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  submitSensorEvent,
  getSensorEvents,
  getLatestSensorStatus,
};
