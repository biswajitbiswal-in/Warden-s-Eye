const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_smartppe_phase2_admin_crud_verification_256bit';
process.env.JWT_EXPIRES_IN = '2h';
process.env.BCRYPT_SALT_ROUNDS = '4';

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { User } = require('../src/models/User.model');
const { Zone } = require('../src/models/Zone.model');
const { Worker } = require('../src/models/Worker.model');
const { ZoneAssignment } = require('../src/models/ZoneAssignment.model');
const { Device } = require('../src/models/Device.model');
const { Camera } = require('../src/models/Camera.model');
const { RfidLog } = require('../src/models/RfidLog.model');
const { PpeDetection } = require('../src/models/PpeDetection.model');
const { SensorEvent } = require('../src/models/SensorEvent.model');
const { Incident } = require('../src/models/Incident.model');
const { IncidentEvidence } = require('../src/models/IncidentEvidence.model');
const { AuditLog } = require('../src/models/AuditLog.model');

let mongoServer;
let adminToken;
let adminUserId;
let supervisorToken;
let supervisorUserId;
let workerToken;
let workerUserId;
let zoneAId;
let zoneBId;
let createdWorkerId;

describe('SmartPPE — Warden\'s Eye: Phase 2 Admin Write CRUD, Models, Security & Audit Logging Test Suite', () => {
  before(async () => {
    const externalTestUri = process.env.TEST_MONGODB_URI;
    if (externalTestUri) {
      await connectDB(externalTestUri);
    } else {
      mongoServer = await MongoMemoryServer.create({
        binary: {
          downloadDir: path.resolve(__dirname, '../.cache/mongodb-binaries'),
        },
      });
      await connectDB(mongoServer.getUri());
    }

    await mongoose.connection.db.dropDatabase();
    await Promise.all([
      User.init(),
      Zone.init(),
      Worker.init(),
      ZoneAssignment.init(),
      Device.init(),
      Camera.init(),
      RfidLog.init(),
      PpeDetection.init(),
      SensorEvent.init(),
      Incident.init(),
      IncidentEvidence.init(),
      AuditLog.init(),
    ]);

    // Bootstrap Administrator
    const adminReg = await request(app).post('/api/auth/register').send({
      name: 'Chief Safety Admin',
      email: 'admin@smartppe.local',
      password: 'AdminPassword123!',
      role: 'ADMINISTRATOR',
    });
    adminUserId = adminReg.body.data.user.userId;

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@smartppe.local',
      password: 'AdminPassword123!',
    });
    adminToken = loginRes.body.data.token;

    // Register a Worker user account for RBAC and linking tests
    const wrkUserRes = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Floor Worker User',
        email: 'worker.user@smartppe.local',
        password: 'WorkerPassword123!',
        role: 'WORKER',
      });
    workerUserId = wrkUserRes.body.data.user.userId;

    const wrkLogin = await request(app).post('/api/auth/login').send({
      email: 'worker.user@smartppe.local',
      password: 'WorkerPassword123!',
    });
    workerToken = wrkLogin.body.data.token;
  });

  after(async () => {
    await disconnectDB();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test('1. Verify All 8 Remaining Operational Mongoose Models Schema, Indexes & Secret Redaction', async () => {
    const tempZone = await Zone.create({
      zoneCode: 'ZONE_MODEL_TEST',
      zoneName: 'Model Verification Zone',
    });

    // 1. Device model (apiKeyHash hidden from JSON & default queries)
    const device = await Device.create({
      deviceCode: 'ESP32_TEST_01',
      deviceName: 'Test ESP32 Unit',
      zoneId: tempZone.zoneId,
      apiKeyHash: 'sha256_hashed_secret_value_never_exposed',
      status: 'ONLINE',
    });
    const deviceJson = device.toJSON();
    assert.equal(deviceJson.deviceCode, 'ESP32_TEST_01');
    assert.equal(deviceJson.apiKeyHash, undefined, 'apiKeyHash must never appear in toJSON output');

    const queriedDevice = await Device.findById(device._id);
    assert.equal(queriedDevice.apiKeyHash, undefined, 'apiKeyHash must be excluded by select: false');

    // 2. Camera model (encryptedStreamCredentials hidden from JSON & default queries)
    const camera = await Camera.create({
      cameraCode: 'CAM_TEST_01',
      cameraName: 'Test Zone Camera',
      zoneId: tempZone.zoneId,
      streamType: 'RTSP',
      encryptedStreamCredentials: 'aes256gcm:iv:tag:ciphertext',
      status: 'ONLINE',
    });
    const cameraJson = camera.toJSON();
    assert.equal(cameraJson.cameraCode, 'CAM_TEST_01');
    assert.equal(cameraJson.encryptedStreamCredentials, undefined);

    const queriedCamera = await Camera.findById(camera._id);
    assert.equal(queriedCamera.encryptedStreamCredentials, undefined);

    // 3. RfidLog model (validates hex UID and scanStatus enum)
    const rfidLog = await RfidLog.create({
      rfidUid: '11223344',
      deviceId: device.deviceId,
      deviceCode: device.deviceCode,
      zoneId: tempZone.zoneId,
      scanStatus: 'UNKNOWN_CARD',
    });
    assert.ok(rfidLog.logId);

    // 4. PpeDetection model (supporting SAFE / VIOLATION / UNCERTAIN & partial unique idempotencyKey)
    const detection = await PpeDetection.create({
      idempotencyKey: 'CAM_TEST_01-10001',
      cameraId: camera.cameraId,
      cameraCode: camera.cameraCode,
      zoneId: tempZone.zoneId,
      modelVersion: 'yolov8-ppe-v1',
      detections: [{ classLabel: 'person', confidence: 0.95, bbox: [10, 10, 100, 200] }],
      missingPPE: ['helmet'],
      detectionState: 'VIOLATION',
      safetyStatus: 'UNSAFE',
      overallConfidence: 0.91,
      headRegionVisible: true,
    });
    assert.ok(detection.detectionId);

    // Duplicate idempotencyKey must be rejected by unique partial index
    await assert.rejects(
      async () => {
        await PpeDetection.create({
          idempotencyKey: 'CAM_TEST_01-10001',
          cameraId: camera.cameraId,
          cameraCode: camera.cameraCode,
          zoneId: tempZone.zoneId,
          modelVersion: 'yolov8-ppe-v1',
          detections: [],
          missingPPE: [],
          detectionState: 'SAFE',
          safetyStatus: 'SAFE',
          overallConfidence: 0.95,
        });
      },
      (err) => err.code === 11000
    );

    // 5. SensorEvent model
    const sensorEvent = await SensorEvent.create({
      deviceId: device.deviceId,
      deviceCode: device.deviceCode,
      zoneId: tempZone.zoneId,
      sensorType: 'SMOKE',
      sensorValue: 1900,
      threshold: 1500,
      alertStatus: 'CRITICAL',
    });
    assert.ok(sensorEvent.eventId);

    // 6. Incident & 7. IncidentEvidence models (supporting 120s grace fields & SHA-256 hash fields)
    const now = new Date();
    const incident = await Incident.create({
      idempotencyKey: 'INC_SYNC_001',
      incidentType: 'MISSING_HELMET',
      severity: 'HIGH',
      status: 'WARNING_GRACE_PERIOD',
      zoneId: tempZone.zoneId,
      sourceType: 'CAMERA_DETECTION',
      sourceId: detection.detectionId,
      deviceOrCameraCode: 'CAM_TEST_01',
      description: 'Worker detected without safety helmet in Model Verification Zone',
      speakerWarningPlayedAt: now,
      graceStartedAt: now,
      graceExpiresAt: new Date(now.getTime() + 120000),
    });
    assert.ok(incident.incidentId);
    assert.equal(incident.status, 'WARNING_GRACE_PERIOD');

    const evidence = await IncidentEvidence.create({
      incidentId: incident.incidentId,
      evidenceType: 'IMAGE',
      evidenceUrl: 'evidence/cam_test_01.jpg',
      fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    });
    assert.ok(evidence.evidenceId);

    // Cleanup temporary model verification documents
    await Promise.all([
      IncidentEvidence.deleteMany({}),
      Incident.deleteMany({}),
      SensorEvent.deleteMany({}),
      PpeDetection.deleteMany({}),
      RfidLog.deleteMany({}),
      Camera.deleteMany({}),
      Device.deleteMany({}),
      Zone.deleteOne({ _id: tempZone._id }),
    ]);
  });

  test('2. Admin Workplace Zone CRUD (POST, GET, PUT, DELETE /api/admin/zones)', async () => {
    // Create Zone A
    const createARes = await request(app)
      .post('/api/admin/zones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        zoneCode: 'zone_a',
        zoneName: 'Assembly Zone A',
        description: 'Primary assembly floor requiring helmet and safety vest',
      });
    assert.equal(createARes.status, 201);
    assert.equal(createARes.body.data.zone.zoneCode, 'ZONE_A');
    zoneAId = createARes.body.data.zone.zoneId;

    // Create Zone B
    const createBRes = await request(app)
      .post('/api/admin/zones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        zoneCode: 'ZONE_B',
        zoneName: 'Warehouse Zone B',
        description: 'Forklift and pallet storage zone',
      });
    assert.equal(createBRes.status, 201);
    zoneBId = createBRes.body.data.zone.zoneId;

    // Duplicate zoneCode must return 409
    const dupZoneRes = await request(app)
      .post('/api/admin/zones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        zoneCode: 'ZONE_A',
        zoneName: 'Duplicate Zone A',
      });
    assert.equal(dupZoneRes.status, 409);
    assert.equal(dupZoneRes.body.error.code, 'DUPLICATE_RESOURCE');

    // Update Zone A
    const updateARes = await request(app)
      .put(`/api/admin/zones/${zoneAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Updated description: Helmet and high-vis vest mandatory',
      });
    assert.equal(updateARes.status, 200);
    assert.equal(
      updateARes.body.data.zone.description,
      'Updated description: Helmet and high-vis vest mandatory'
    );
  });

  test('3. Admin Supervisor CRUD & Zone Assignment (POST/GET/PUT/DELETE /api/admin/supervisors & assign-supervisor)', async () => {
    // Create Supervisor with initial assignment to Zone A
    const createSupRes = await request(app)
      .post('/api/admin/supervisors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Supervisor Alice',
        email: 'alice.sup@smartppe.local',
        password: 'SupervisorPassword123!',
        zoneIds: [zoneAId],
      });
    assert.equal(createSupRes.status, 201);
    assert.equal(createSupRes.body.data.supervisor.role, 'SUPERVISOR');
    assert.equal(createSupRes.body.data.supervisor.passwordHash, undefined);
    assert.equal(createSupRes.body.data.supervisor.assignedZones.length, 1);
    assert.equal(createSupRes.body.data.supervisor.assignedZones[0].zoneCode, 'ZONE_A');
    supervisorUserId = createSupRes.body.data.supervisor.userId;

    // Login as Supervisor Alice
    const supLogin = await request(app).post('/api/auth/login').send({
      email: 'alice.sup@smartppe.local',
      password: 'SupervisorPassword123!',
    });
    assert.equal(supLogin.status, 200);
    supervisorToken = supLogin.body.data.token;
    assert.deepEqual(supLogin.body.data.user.assignedZoneIds, [zoneAId]);

    // Assign Supervisor Alice to Zone B as well via POST /api/admin/zones/:id/assign-supervisor
    const assignBRes = await request(app)
      .post(`/api/admin/zones/${zoneBId}/assign-supervisor`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supervisorId: supervisorUserId,
      });
    assert.equal(assignBRes.status, 200);
    assert.equal(assignBRes.body.data.assignment.status, 'ACTIVE');

    // Unassign Supervisor Alice from Zone B via DELETE /api/admin/zones/:id/assign-supervisor/:supervisorId
    const unassignBRes = await request(app)
      .delete(`/api/admin/zones/${zoneBId}/assign-supervisor/${supervisorUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(unassignBRes.status, 200);
    assert.equal(unassignBRes.body.data.assignment.status, 'INACTIVE');

    // Verify GET /api/admin/supervisors lists Supervisor Alice with only Zone A active
    const listSupRes = await request(app)
      .get('/api/admin/supervisors')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(listSupRes.status, 200);
    assert.equal(listSupRes.body.data.total, 1);
    assert.equal(listSupRes.body.data.supervisors[0].assignedZones.length, 1);
    assert.equal(listSupRes.body.data.supervisors[0].assignedZones[0].zoneId, zoneAId);
  });

  test('4. Admin Worker Write CRUD & RFID Mapping (POST, PUT, DELETE /api/workers)', async () => {
    // Create Worker 1 in Zone A linked to workerUserId
    const createWrkRes = await request(app)
      .post('/api/workers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeCode: 'emp-101',
        name: 'Rajesh Sharma',
        department: 'Assembly',
        designation: 'Senior Technician',
        zoneId: zoneAId,
        rfidUid: 'a1b2c3d4',
        userId: workerUserId,
      });
    assert.equal(createWrkRes.status, 201);
    assert.equal(createWrkRes.body.data.worker.employeeCode, 'EMP-101');
    assert.equal(createWrkRes.body.data.worker.rfidUid, 'A1B2C3D4');
    createdWorkerId = createWrkRes.body.data.worker.workerId;

    // Duplicate RFID card assignment must be rejected with 409
    const dupRfidRes = await request(app)
      .post('/api/workers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeCode: 'EMP-102',
        name: 'Another Worker',
        department: 'Assembly',
        zoneId: zoneAId,
        rfidUid: 'A1B2C3D4',
      });
    assert.equal(dupRfidRes.status, 409);
    assert.equal(dupRfidRes.body.error.code, 'DUPLICATE_RESOURCE');

    // Invalid RFID hex string must be rejected with 400 VALIDATION_ERROR
    const badRfidRes = await request(app)
      .post('/api/workers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeCode: 'EMP-103',
        name: 'Invalid RFID Worker',
        department: 'Assembly',
        zoneId: zoneAId,
        rfidUid: 'NOT_HEX!',
      });
    assert.equal(badRfidRes.status, 400);
    assert.equal(badRfidRes.body.error.code, 'VALIDATION_ERROR');

    // Update Worker 1 RFID UID and designation
    const updateWrkRes = await request(app)
      .put(`/api/workers/${createdWorkerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        designation: 'Lead Assembly Technician',
        rfidUid: 'F1E2D3C4',
      });
    assert.equal(updateWrkRes.status, 200);
    assert.equal(updateWrkRes.body.data.worker.designation, 'Lead Assembly Technician');
    assert.equal(updateWrkRes.body.data.worker.rfidUid, 'F1E2D3C4');
  });

  test('5. Role Authorization Enforcement (Supervisors, Workers, and Unauthenticated callers blocked from Admin Write CRUD)', async () => {
    // Unauthenticated caller attempting to create a worker -> 401 Unauthorized
    const unauthCreateWorker = await request(app).post('/api/workers').send({
      employeeCode: 'EMP-998',
      name: 'Unauth Worker',
      department: 'Assembly',
      zoneId: zoneAId,
    });
    assert.equal(unauthCreateWorker.status, 401);

    // Supervisor attempting to create, update, or delete a worker -> 403 Forbidden
    const supCreateWorker = await request(app)
      .post('/api/workers')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        employeeCode: 'EMP-999',
        name: 'Unauthorized Worker',
        department: 'Assembly',
        zoneId: zoneAId,
      });
    assert.equal(supCreateWorker.status, 403);
    assert.equal(supCreateWorker.body.error.code, 'FORBIDDEN');

    const supUpdateWorker = await request(app)
      .put(`/api/workers/${createdWorkerId}`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ name: 'Tampered By Supervisor' });
    assert.equal(supUpdateWorker.status, 403);

    const supDeleteWorker = await request(app)
      .delete(`/api/workers/${createdWorkerId}`)
      .set('Authorization', `Bearer ${supervisorToken}`);
    assert.equal(supDeleteWorker.status, 403);

    // Supervisor attempting to access /api/admin/* -> 403 Forbidden
    const supAdminOverview = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${supervisorToken}`);
    assert.equal(supAdminOverview.status, 403);

    const supAuditLogs = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${supervisorToken}`);
    assert.equal(supAuditLogs.status, 403);

    // Worker attempting to create a zone or view audit logs -> 403 Forbidden
    const wrkCreateZone = await request(app)
      .post('/api/admin/zones')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        zoneCode: 'ZONE_ROGUE',
        zoneName: 'Rogue Zone',
      });
    assert.equal(wrkCreateZone.status, 403);

    const wrkAuditLogs = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${workerToken}`);
    assert.equal(wrkAuditLogs.status, 403);
  });

  test('6. Security Hardening: Mass-Assignment Prevention, Cross-Role Linking Prevention & Inactive Account Blocking', async () => {
    // 6.1 Mass-Assignment Prevention (.strict() Zod schemas reject injected extra fields)
    const massAssignSupervisorRes = await request(app)
      .put(`/api/admin/supervisors/${supervisorUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Attempted Privilege Escalation',
        role: 'ADMINISTRATOR', // Unrecognized field in updateSupervisorSchema
      });
    assert.equal(massAssignSupervisorRes.status, 400);
    assert.equal(massAssignSupervisorRes.body.error.code, 'VALIDATION_ERROR');

    const massAssignWorkerRes = await request(app)
      .post('/api/workers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeCode: 'EMP-777',
        name: 'Injected Field Worker',
        department: 'Assembly',
        zoneId: zoneAId,
        isAdmin: true, // Unrecognized field
      });
    assert.equal(massAssignWorkerRes.status, 400);
    assert.equal(massAssignWorkerRes.body.error.code, 'VALIDATION_ERROR');

    // 6.2 Prevent linking a SUPERVISOR or ADMINISTRATOR userId to a Worker profile
    const linkAdminToWorkerRes = await request(app)
      .post('/api/workers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeCode: 'EMP-888',
        name: 'Fake Admin Worker',
        department: 'Assembly',
        zoneId: zoneAId,
        userId: adminUserId,
      });
    assert.equal(linkAdminToWorkerRes.status, 400);
    assert.equal(linkAdminToWorkerRes.body.error.code, 'INVALID_USER_ROLE');

    // 6.3 Prevent assigning a WORKER userId as a Zone Supervisor
    const assignWorkerAsSupRes = await request(app)
      .post(`/api/admin/zones/${zoneAId}/assign-supervisor`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supervisorId: workerUserId,
      });
    assert.equal(assignWorkerAsSupRes.status, 400);
    assert.equal(assignWorkerAsSupRes.body.error.code, 'INVALID_ROLE');

    // 6.4 Prevent creating a Supervisor with a malformed or non-existent zoneId in zoneIds
    const badZoneSupRes = await request(app)
      .post('/api/admin/supervisors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Bad Zone Supervisor',
        email: 'badzone.sup@smartppe.local',
        password: 'SupervisorPassword123!',
        zoneIds: ['invalid-object-id'],
      });
    assert.equal(badZoneSupRes.status, 400);
    assert.equal(badZoneSupRes.body.error.code, 'INVALID_IDENTIFIER');

    // 6.5 Deactivating a Zone cascades to deactivate its ZoneAssignments and blocks new assignments
    const deactivateZoneBRes = await request(app)
      .delete(`/api/admin/zones/${zoneBId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(deactivateZoneBRes.status, 200);
    assert.equal(deactivateZoneBRes.body.data.zone.status, 'INACTIVE');

    const assignToInactiveZoneRes = await request(app)
      .post(`/api/admin/zones/${zoneBId}/assign-supervisor`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supervisorId: supervisorUserId,
      });
    assert.equal(assignToInactiveZoneRes.status, 400);
    assert.equal(assignToInactiveZoneRes.body.error.code, 'ZONE_INACTIVE');

    // 6.6 Deactivating a Supervisor immediately blocks their active JWT token & future logins
    const updateSupPassRes = await request(app)
      .put(`/api/admin/supervisors/${supervisorUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Supervisor Alice Updated',
        password: 'NewSupervisorPassword456!',
      });
    assert.equal(updateSupPassRes.status, 200);

    const deactivateSupRes = await request(app)
      .delete(`/api/admin/supervisors/${supervisorUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(deactivateSupRes.status, 200);
    assert.equal(deactivateSupRes.body.data.supervisor.status, 'INACTIVE');

    // Existing JWT token for deactivated supervisor must immediately be rejected with 403 ACCOUNT_INACTIVE
    const deactivatedTokenRes = await request(app)
      .get('/api/zones')
      .set('Authorization', `Bearer ${supervisorToken}`);
    assert.equal(deactivatedTokenRes.status, 403);
    assert.equal(deactivatedTokenRes.body.error.code, 'ACCOUNT_INACTIVE');
  });

  test('7. System Overview & Append-Only Audit Logs Secret Redaction Verification', async () => {
    // Deactivate Worker 1 via DELETE /api/workers/:id
    const delWrkRes = await request(app)
      .delete(`/api/workers/${createdWorkerId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(delWrkRes.status, 200);
    assert.equal(delWrkRes.body.data.worker.status, 'INACTIVE');

    // Check System Overview counts
    const overviewRes = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(overviewRes.status, 200);
    assert.equal(overviewRes.body.data.overview.totalZones, 2);
    assert.equal(overviewRes.body.data.overview.activeZones, 1);
    assert.equal(overviewRes.body.data.overview.totalWorkers, 1);
    assert.equal(overviewRes.body.data.overview.activeWorkers, 0);
    assert.equal(overviewRes.body.data.overview.totalSupervisors, 0); // Supervisor Alice was deactivated

    // Check Audit Logs contain recorded actions and redact passwords in details
    const auditRes = await request(app)
      .get('/api/admin/audit-logs?limit=100')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(auditRes.status, 200);
    assert.ok(auditRes.body.data.auditLogs.length >= 10, 'Audit logs should contain all Phase 2 mutations');

    const recordedActions = auditRes.body.data.auditLogs.map((log) => log.action);
    assert.ok(recordedActions.includes('USER_REGISTERED'));
    assert.ok(recordedActions.includes('USER_LOGIN'));
    assert.ok(recordedActions.includes('ZONE_CREATED'));
    assert.ok(recordedActions.includes('ZONE_UPDATED'));
    assert.ok(recordedActions.includes('ZONE_DEACTIVATED'));
    assert.ok(recordedActions.includes('SUPERVISOR_CREATED'));
    assert.ok(recordedActions.includes('SUPERVISOR_UPDATED'));
    assert.ok(recordedActions.includes('SUPERVISOR_DEACTIVATED'));
    assert.ok(recordedActions.includes('SUPERVISOR_ZONE_ASSIGNED'));
    assert.ok(recordedActions.includes('SUPERVISOR_ZONE_UNASSIGNED'));
    assert.ok(recordedActions.includes('WORKER_CREATED'));
    assert.ok(recordedActions.includes('WORKER_UPDATED'));
    assert.ok(recordedActions.includes('WORKER_DEACTIVATED'));

    // Verify that the SUPERVISOR_UPDATED audit log redacted the password field!
    const supUpdatedLog = auditRes.body.data.auditLogs.find((log) => log.action === 'SUPERVISOR_UPDATED');
    assert.ok(supUpdatedLog);
    assert.equal(
      supUpdatedLog.details.password,
      '[REDACTED]',
      'AuditLog service must redact password fields so plaintext passwords never enter audit logs'
    );

    // Verify audit logs cannot be modified or deleted by any API route (Append-Only Integrity)
    const modifyAuditAttempt = await request(app)
      .delete(`/api/admin/audit-logs/${supUpdatedLog.auditId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(modifyAuditAttempt.status, 404);
    assert.equal(modifyAuditAttempt.body.error.code, 'ROUTE_NOT_FOUND');
  });
});
