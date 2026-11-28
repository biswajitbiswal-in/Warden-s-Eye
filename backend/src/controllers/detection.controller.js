const mongoose = require('mongoose');
const { getEnv } = require('../config/env');
const { Camera } = require('../models/Camera.model');
const { PpeDetection } = require('../models/PpeDetection.model');
const { Worker } = require('../models/Worker.model');
const { Incident } = require('../models/Incident.model');
const { IncidentEvidence } = require('../models/IncidentEvidence.model');
const { recordAuditLog } = require('../services/audit.service');
const { AppError } = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Bidirectional mapping between canonical 3-state ML reliability enum (`SAFE | VIOLATION | UNCERTAIN`)
 * and canonical database `safetyStatus` (`SAFE | UNSAFE | REVIEW_REQUIRED`).
 */
const resolveStates = (inputDetectionState, inputSafetyStatus) => {
  if (inputDetectionState) {
    const map = {
      SAFE: 'SAFE',
      VIOLATION: 'UNSAFE',
      UNCERTAIN: 'REVIEW_REQUIRED',
    };
    return {
      detectionState: inputDetectionState,
      safetyStatus: inputSafetyStatus || map[inputDetectionState],
    };
  }
  const reverseMap = {
    SAFE: 'SAFE',
    UNSAFE: 'VIOLATION',
    REVIEW_REQUIRED: 'UNCERTAIN',
  };
  return {
    detectionState: reverseMap[inputSafetyStatus] || 'SAFE',
    safetyStatus: inputSafetyStatus || 'SAFE',
  };
};

/**
 * Verify Worker Association Strictly via RFID Zone Presence:
 * - Camera object detection alone never identifies a named worker.
 * - If the caller passes `workerId` OR `verifyWorkerByRfid: true`, we verify whether
 *   that worker (or a single uniquely checked-in worker) has an active RFID check-in
 *   in the camera's workplace zone within the active presence window (default 15 minutes).
 * - If not verified via RFID check-in in that zone, `workerId` is forced to `null`
 *   and `workerIdentificationSource` is set to `'NONE'`.
 */
const resolveVerifiedWorker = async (cameraZoneId, candidateWorkerId, verifyWorkerByRfid) => {
  const presenceWindowMs = 15 * 60 * 1000; // 15 minutes active RFID zone presence window
  const presenceCutoff = new Date(Date.now() - presenceWindowMs);

  // Case 1: Caller suggested a specific candidateWorkerId -> verify they actually scanned into this zone via RFID
  if (candidateWorkerId) {
    if (!mongoose.Types.ObjectId.isValid(candidateWorkerId)) {
      return { verifiedWorkerId: null, workerIdentificationSource: 'NONE' };
    }
    const verifiedWorker = await Worker.findOne({
      _id: candidateWorkerId,
      status: 'ACTIVE',
      lastSeenZoneId: cameraZoneId,
      lastRfidScanAt: { $gte: presenceCutoff },
    }).lean();

    if (verifiedWorker) {
      return {
        verifiedWorkerId: verifiedWorker._id,
        workerIdentificationSource: 'RFID_CHECKPOINT_VERIFIED',
      };
    }
    // Reject unverified/arbitrary workerId
    return { verifiedWorkerId: null, workerIdentificationSource: 'NONE' };
  }

  // Case 2: Caller requested automatic RFID checkpoint correlation (`verifyWorkerByRfid: true`)
  if (verifyWorkerByRfid) {
    const activeWorkersInZone = await Worker.find({
      status: 'ACTIVE',
      lastSeenZoneId: cameraZoneId,
      lastRfidScanAt: { $gte: presenceCutoff },
    })
      .limit(2)
      .lean();

    // Only auto-associate if exactly 1 worker is uniquely checked into that zone via RFID
    if (activeWorkersInZone.length === 1) {
      return {
        verifiedWorkerId: activeWorkersInZone[0]._id,
        workerIdentificationSource: 'RFID_CHECKPOINT_VERIFIED',
      };
    }
  }

  return { verifiedWorkerId: null, workerIdentificationSource: 'NONE' };
};

/**
 * Determine canonical incidentType and severity from missingPPE / detections.
 */
const classifyViolation = (missingPPE = [], detections = []) => {
  const hasFall = detections.some(
    (d) => d.classLabel && d.classLabel.toLowerCase() === 'person_fall'
  );
  if (hasFall) {
    return {
      incidentType: 'PERSON_FALL_DETECTED',
      severity: 'CRITICAL',
      isEmergency: true,
    };
  }

  const missingSet = new Set(missingPPE.map((item) => item.toLowerCase()));
  const missingHelmet = missingSet.has('helmet') || missingSet.has('no_helmet');
  const missingVest = missingSet.has('safety_vest') || missingSet.has('no_safety_vest');

  if (missingHelmet && missingVest) {
    return {
      incidentType: 'MULTIPLE_PPE_VIOLATION',
      severity: 'HIGH',
      isEmergency: false,
    };
  }
  if (missingHelmet) {
    return {
      incidentType: 'MISSING_HELMET',
      severity: 'HIGH',
      isEmergency: false,
    };
  }
  return {
    incidentType: 'MISSING_SAFETY_VEST',
    severity: 'MEDIUM',
    isEmergency: false,
  };
};

/**
 * POST /api/detections
 * Authenticated via `requireMlAuth` (`X-ML-Service-Key`).
 * - Validates registered `cameraCode`, updates camera `lastHeartbeat` and sets status to `ONLINE`.
 * - Clearly labels mock detections (`isMockDetection: true` whenever `isMockDetection` flag is passed or `modelVersion` starts with `mock-`).
 * - Enforces strict worker identification rule (`workerId` only set when verified via active RFID zone presence).
 * - Handles the 3 detection states:
 *   1. `SAFE`: Logs compliance; does not create an incident.
 *   2. `UNCERTAIN`: Logs diagnostic telemetry (`safetyStatus: "REVIEW_REQUIRED"`); NEVER triggers normal violation escalation.
 *   3. `VIOLATION`: Logs violation (`safetyStatus: "UNSAFE"`) and creates/merges an incident (subject to `INCIDENT_COOLDOWN_SECONDS`).
 */
const submitDetection = async (req, res, next) => {
  try {
    const {
      cameraCode,
      occurredAt,
      modelVersion,
      idempotencyKey,
      workerId: rawWorkerId,
      verifyWorkerByRfid,
      isMockDetection: rawIsMock,
      trackId,
      detections,
      missingPPE,
      detectionState: rawDetectionState,
      safetyStatus: rawSafetyStatus,
      overallConfidence,
      headRegionVisible,
      evidenceUrl,
      evidenceFileHash,
    } = req.body;

    // 1. Validate camera exists and is not in MAINTENANCE mode
    const camera = await Camera.findOne({ cameraCode });
    if (!camera) {
      return next(
        new AppError(`Registered camera '${cameraCode}' not found.`, 404, 'CAMERA_NOT_FOUND')
      );
    }

    if (camera.status === 'MAINTENANCE') {
      return next(
        new AppError(
          `Camera '${camera.cameraCode}' is currently in MAINTENANCE mode and cannot submit detections.`,
          403,
          'CAMERA_IN_MAINTENANCE'
        )
      );
    }

    // 2. Check idempotencyKey to prevent duplicate retry processing
    if (idempotencyKey) {
      const existingDetection = await PpeDetection.findOne({ idempotencyKey });
      if (existingDetection) {
        return next(
          new AppError(
            `Duplicate detection idempotencyKey '${idempotencyKey}' already processed.`,
            409,
            'DUPLICATE_IDEMPOTENCY_KEY'
          )
        );
      }
    }

    // 3. Update camera status to ONLINE & refresh lastHeartbeat (handles automatic reconnection)
    camera.status = 'ONLINE';
    camera.lastHeartbeat = new Date();
    camera.reconnectAttempts = 0;
    camera.lastStreamError = null;
    await camera.save();

    // 4. Resolve canonical 3-state enum and mock status
    let { detectionState, safetyStatus } = resolveStates(rawDetectionState, rawSafetyStatus);

    // If headRegionVisible is explicitly false on a helmet check, force UNCERTAIN to prevent false positive escalation
    if (headRegionVisible === false && detectionState === 'VIOLATION') {
      detectionState = 'UNCERTAIN';
      safetyStatus = 'REVIEW_REQUIRED';
    }

    const isMockDetection =
      Boolean(rawIsMock) || /^mock[-_]/i.test(String(modelVersion));

    // 5. Verify Worker Identification strictly via RFID checkpoint correlation
    const { verifiedWorkerId, workerIdentificationSource } = await resolveVerifiedWorker(
      camera.zoneId,
      rawWorkerId,
      verifyWorkerByRfid
    );

    const detectionTimestamp = new Date(occurredAt);

    // 6. Store PPE Detection record
    const newDetection = await PpeDetection.create({
      idempotencyKey: idempotencyKey || null,
      cameraId: camera._id,
      cameraCode: camera.cameraCode,
      zoneId: camera.zoneId,
      workerId: verifiedWorkerId,
      workerIdentificationSource,
      isMockDetection,
      trackId: trackId || null,
      modelVersion,
      detections,
      missingPPE,
      detectionState,
      safetyStatus,
      overallConfidence,
      headRegionVisible: headRegionVisible ?? true,
      evidenceUrl: evidenceUrl || null,
      evidenceFileHash: evidenceFileHash || null,
      occurredAt: detectionTimestamp,
    });

    let incidentCreated = false;
    let cooldownMerged = false;
    let incidentId = null;

    // 7. Three-State Routing Rule:
    // - SAFE: No violation incident created.
    // - UNCERTAIN: Never trigger violation escalation from uncertain predictions.
    // - VIOLATION: Create or merge violation incident subject to INCIDENT_COOLDOWN_SECONDS.
    if (detectionState === 'VIOLATION') {
      const { incidentCooldownSeconds, warningGraceSeconds } = getEnv();
      const { incidentType, severity, isEmergency } = classifyViolation(missingPPE, detections);

      const cooldownCutoff = new Date(Date.now() - incidentCooldownSeconds * 1000);
      let activeIncident = await Incident.findOne({
        zoneId: camera.zoneId,
        deviceOrCameraCode: camera.cameraCode,
        incidentType,
        status: { $in: ['WARNING_GRACE_PERIOD', 'OPEN', 'UNDER_REVIEW'] },
        updatedAt: { $gte: cooldownCutoff },
      });

      if (activeIncident) {
        activeIncident.occurrenceCount += 1;
        if (verifiedWorkerId && !activeIncident.workerId) {
          activeIncident.workerId = verifiedWorkerId;
        }
        await activeIncident.save();
        cooldownMerged = true;
        incidentId = activeIncident.incidentId;
      } else {
        const now = new Date();
        const mockPrefix = isMockDetection ? '[MOCK TEST DETECTION] ' : '';
        const missingListText =
          missingPPE.length > 0 ? missingPPE.join(', ') : incidentType;

        activeIncident = await Incident.create({
          incidentType,
          isEmergency,
          severity,
          status: isEmergency ? 'OPEN' : 'WARNING_GRACE_PERIOD',
          zoneId: camera.zoneId,
          workerId: verifiedWorkerId,
          trackId: trackId || null,
          sourceType: 'CAMERA_DETECTION',
          sourceId: newDetection._id,
          deviceOrCameraCode: camera.cameraCode,
          description: `${mockPrefix}PPE violation (${missingListText}) detected on camera ${camera.cameraCode} (confidence: ${overallConfidence})`,
          occurrenceCount: 1,
          speakerWarningPlayedAt: isEmergency ? null : now,
          graceStartedAt: isEmergency ? null : now,
          graceExpiresAt: isEmergency ? null : new Date(now.getTime() + warningGraceSeconds * 1000),
          escalatedToSupervisorAt: isEmergency ? now : null,
        });

        incidentCreated = true;
        incidentId = activeIncident.incidentId;

        if (evidenceUrl) {
          await IncidentEvidence.create({
            incidentId: activeIncident._id,
            evidenceType: 'IMAGE',
            evidenceUrl,
            fileHash: evidenceFileHash || null,
            uploadedBy: null,
          });
        }

        await recordAuditLog({
          actorId: null,
          actorRole: 'ML_SERVICE',
          action: isMockDetection ? 'MOCK_PPE_VIOLATION_DETECTED' : 'PPE_VIOLATION_DETECTED',
          entityType: 'INCIDENT',
          entityId: activeIncident.incidentId,
          details: {
            cameraCode: camera.cameraCode,
            zoneId: camera.zoneId.toString(),
            incidentType,
            detectionState,
            isMockDetection,
            workerId: verifiedWorkerId ? verifiedWorkerId.toString() : null,
            workerIdentificationSource,
          },
        });
      }
    }

    return sendSuccess(res, 201, 'PPE detection recorded', {
      detectionId: newDetection.detectionId,
      cameraCode: camera.cameraCode,
      zoneId: camera.zoneId.toString(),
      detectionState: newDetection.detectionState,
      safetyStatus: newDetection.safetyStatus,
      isMockDetection: newDetection.isMockDetection,
      workerId: verifiedWorkerId ? verifiedWorkerId.toString() : null,
      workerIdentificationSource: newDetection.workerIdentificationSource,
      incidentCreated,
      cooldownMerged,
      incidentId,
      occurredAt: newDetection.occurredAt,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/detections
 * Returns detection history scoped by role and zone permissions.
 * Supports filtering by `?zoneId=`, `?cameraCode=`, `?detectionState=`, `?isMockDetection=true|false`.
 */
const getDetections = async (req, res, next) => {
  try {
    const { role, assignedZoneIds, workerId } = req.user;
    const filter = {};

    if (req.query.cameraCode) {
      filter.cameraCode = String(req.query.cameraCode).toUpperCase();
    }
    if (req.query.detectionState) {
      filter.detectionState = String(req.query.detectionState).toUpperCase();
    }
    if (req.query.safetyStatus) {
      filter.safetyStatus = String(req.query.safetyStatus).toUpperCase();
    }
    if (req.query.isMockDetection !== undefined) {
      filter.isMockDetection = req.query.isMockDetection === 'true';
    }

    if (role === 'WORKER') {
      if (!workerId) {
        return sendSuccess(res, 200, 'PPE detections retrieved successfully', {
          detections: [],
          total: 0,
        });
      }
      filter.workerId = workerId;
    } else if (role === 'SUPERVISOR') {
      if (!assignedZoneIds || assignedZoneIds.length === 0) {
        return sendSuccess(res, 200, 'PPE detections retrieved successfully', {
          detections: [],
          total: 0,
        });
      }
      if (req.query.zoneId) {
        const requestedZoneId = String(req.query.zoneId);
        if (!assignedZoneIds.includes(requestedZoneId)) {
          return next(
            new AppError(
              'Access denied. Supervisors can only view detections in their assigned workplace zones.',
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
    const detections = await PpeDetection.find(filter)
      .populate('zoneId', 'zoneCode zoneName')
      .populate('workerId', 'employeeCode name department')
      .sort({ occurredAt: -1 })
      .limit(limit);

    return sendSuccess(res, 200, 'PPE detections retrieved successfully', {
      detections,
      total: detections.length,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/detections/:id
 * Returns a single PPE detection record with role and zone authorization.
 */
const getDetectionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid detection ID format.', 400, 'INVALID_IDENTIFIER'));
    }

    const detection = await PpeDetection.findById(id)
      .populate('zoneId', 'zoneCode zoneName')
      .populate('workerId', 'employeeCode name department');

    if (!detection) {
      return next(new AppError('PPE detection record not found.', 404, 'DETECTION_NOT_FOUND'));
    }

    const { role, assignedZoneIds, workerId } = req.user;
    const recordZoneId = detection.zoneId?._id
      ? detection.zoneId._id.toString()
      : detection.zoneId?.toString();
    const recordWorkerId = detection.workerId?._id
      ? detection.workerId._id.toString()
      : detection.workerId?.toString();

    if (role === 'WORKER' && (!workerId || recordWorkerId !== workerId)) {
      return next(
        new AppError('Access denied. Workers can only view detections linked to their own profile.', 403, 'FORBIDDEN')
      );
    }

    if (role === 'SUPERVISOR' && !assignedZoneIds.includes(recordZoneId)) {
      return next(
        new AppError(
          'Access denied. This detection belongs to an unassigned workplace zone.',
          403,
          'ZONE_ACCESS_DENIED'
        )
      );
    }

    return sendSuccess(res, 200, 'PPE detection retrieved successfully', {
      detection,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  submitDetection,
  getDetections,
  getDetectionById,
};
