const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_smartppe_phase4_ml_detection_256bit';
process.env.JWT_EXPIRES_IN = '2h';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.ML_SERVICE_API_KEY = 'ml_test_service_secret_key_for_phase4_verification';
process.env.INCIDENT_COOLDOWN_SECONDS = '60';
process.env.WARNING_GRACE_SECONDS = '120';
process.env.DEVICE_HEARTBEAT_TIMEOUT_SECONDS = '90';

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { User } = require('../src/models/User.model');
const { Zone } = require('../src/models/Zone.model');
const { Worker } = require('../src/models/Worker.model');
const { ZoneAssignment } = require('../src/models/ZoneAssignment.model');
const { Device } = require('../src/models/Device.model');
const { Camera } = require('../src/models/Camera.model');
const { PpeDetection } = require('../src/models/PpeDetection.model');
const { Incident } = require('../src/models/Incident.model');
const { IncidentEvidence } = require('../src/models/IncidentEvidence.model');
const { AuditLog } = require('../src/models/AuditLog.model');
const {
  MOCK_MODEL_VERSION,
  buildMockDetectionPayload,
  probeSmartphoneWifiStream,
} = require('../src/services/mockMl.service');

let mongoServer;
let mockSmartphoneServer;
let mockSmartphoneUrl;
let adminToken;
let supervisorAToken;
let worker1Token;
let zoneAId;
let zoneBId;
let worker1Id;
let worker2Id;
let device1ApiKey;
let camera1Id;
let camera2Id;
const mlKey = process.env.ML_SERVICE_API_KEY;

describe('SmartPPE — Warden\'s Eye: Phase 4 Smartphone Camera Stream, X-ML-Service-Key, Detections & Mock ML Test Suite', () => {
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
      PpeDetection.init(),
      Incident.init(),
      IncidentEvidence.init(),
      AuditLog.init(),
    ]);

    // Start a local HTTP server simulating a Smartphone Wi-Fi Camera MJPEG/JPEG snapshot endpoint
    mockSmartphoneServer = http.createServer((req, res) => {
      if (req.url === '/shot.jpg' || req.url === '/video') {
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(Buffer.from([0xff, 0xd8, 0xff, 0xd9])); // Minimal valid JPEG markers
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    await new Promise((resolve) => mockSmartphoneServer.listen(0, '127.0.0.1', resolve));
    const phonePort = mockSmartphoneServer.address().port;
    mockSmartphoneUrl = `http://127.0.0.1:${phonePort}/shot.jpg`;

    // 1. Bootstrap Administrator
    await request(app).post('/api/auth/register').send({
      name: 'System Admin',
      email: 'admin@smartppe.local',
      password: 'AdminPassword123!',
      role: 'ADMINISTRATOR',
    });

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@smartppe.local',
      password: 'AdminPassword123!',
    });
    adminToken = adminLogin.body.data.token;

    // 2. Create Zone A and Zone B
    const zARes = await request(app)
      .post('/api/admin/zones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        zoneCode: 'ZONE_A',
        zoneName: 'Assembly Zone A',
        description: 'Main Assembly Line',
      });
    zoneAId = zARes.body.data.zone.zoneId;

    const zBRes = await request(app)
      .post('/api/admin/zones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        zoneCode: 'ZONE_B',
        zoneName: 'Warehouse Zone B',
        description: 'Logistics Storage Area',
      });
    zoneBId = zBRes.body.data.zone.zoneId;

    // 3. Create Supervisor assigned ONLY to Zone A
    await request(app)
      .post('/api/admin/supervisors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Supervisor Zone A',
        email: 'sup.a@smartppe.local',
        password: 'SupervisorPassword123!',
        zoneIds: [zoneAId],
      });

    const supLogin = await request(app).post('/api/auth/login').send({
      email: 'sup.a@smartppe.local',
      password: 'SupervisorPassword123!',
    });
    supervisorAToken = supLogin.body.data.token;

    // 4. Create Worker 1 (in Zone A) and Worker 2 (in Zone B, never scanned into Zone A)
    const wrkUserRes = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Worker One',
        email: 'worker1@smartppe.local',
        password: 'WorkerPassword123!',
        role: 'WORKER',
      });

    const wrk1Res = await request(app)
      .post('/api/workers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeCode: 'EMP-001',
        name: 'Worker One',
        department: 'Assembly',
        zoneId: zoneAId,
        rfidUid: 'A1B2C3D4',
        userId: wrkUserRes.body.data.user.userId,
      });
    worker1Id = wrk1Res.body.data.worker.workerId;

    const wrk2Res = await request(app)
      .post('/api/workers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeCode: 'EMP-002',
        name: 'Worker Two',
        department: 'Warehouse',
        zoneId: zoneBId,
        rfidUid: 'E5F60718',
      });
    worker2Id = wrk2Res.body.data.worker.workerId;

    const wrkLogin = await request(app).post('/api/auth/login').send({
      email: 'worker1@smartppe.local',
      password: 'WorkerPassword123!',
    });
    worker1Token = wrkLogin.body.data.token;

    // 5. Register ESP32_001 in Zone A so we can test RFID-verified worker association
    const devRes = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        deviceCode: 'ESP32_001',
        deviceName: 'Zone A RFID Reader',
        zoneId: zoneAId,
      });
    device1ApiKey = devRes.body.data.deviceApiKey;
  });

  after(async () => {
    if (mockSmartphoneServer) {
      await new Promise((resolve) => mockSmartphoneServer.close(resolve));
    }
    await disconnectDB();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test('1. Register Smartphone Wi-Fi & IP Cameras and Verify Role/Zone Isolation', async () => {
    // Register CAM_001 in Zone A as SMARTPHONE_WIFI
    const cam1Res = await request(app)
      .post('/api/cameras')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cameraCode: 'cam_001',
        cameraName: 'Assembly Line Smartphone Wi-Fi Cam',
        zoneId: zoneAId,
        locationDescription: 'Mounted on Tripod overlooking Assembly Station 1',
        streamType: 'SMARTPHONE_WIFI',
        streamUrl: mockSmartphoneUrl,
      });

    assert.equal(cam1Res.status, 201);
    assert.equal(cam1Res.body.data.camera.cameraCode, 'CAM_001');
    assert.equal(cam1Res.body.data.camera.streamType, 'SMARTPHONE_WIFI');
    assert.equal(cam1Res.body.data.camera.streamUrl, mockSmartphoneUrl);
    assert.equal(cam1Res.body.data.camera.status, 'OFFLINE');
    camera1Id = cam1Res.body.data.camera.cameraId;

    // Register CAM_002 in Zone B
    const cam2Res = await request(app)
      .post('/api/cameras')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cameraCode: 'CAM_002',
        cameraName: 'Warehouse Zone B Camera',
        zoneId: zoneBId,
        streamType: 'IP_HTTP',
      });
    assert.equal(cam2Res.status, 201);
    camera2Id = cam2Res.body.data.camera.cameraId;

    // Supervisor A sees ONLY CAM_001 (Zone A)
    const supCamerasRes = await request(app)
      .get('/api/cameras')
      .set('Authorization', `Bearer ${supervisorAToken}`);
    assert.equal(supCamerasRes.status, 200);
    assert.equal(supCamerasRes.body.data.total, 1);
    assert.equal(supCamerasRes.body.data.cameras[0].cameraCode, 'CAM_001');

    // Supervisor A requesting CAM_002 (Zone B) -> 403 ZONE_ACCESS_DENIED
    const supZoneBCamRes = await request(app)
      .get(`/api/cameras/${camera2Id}`)
      .set('Authorization', `Bearer ${supervisorAToken}`);
    assert.equal(supZoneBCamRes.status, 403);
    assert.equal(supZoneBCamRes.body.error.code, 'ZONE_ACCESS_DENIED');

    // Worker attempting to register or list cameras -> 403 FORBIDDEN
    const wrkCamList = await request(app)
      .get('/api/cameras')
      .set('Authorization', `Bearer ${worker1Token}`);
    assert.equal(wrkCamList.status, 403);
  });

  test('2. Smartphone Wi-Fi Stream Probe, Camera Heartbeat, Offline Timeout & Reconnection Handling', async () => {
    // 2.1 Probe active local smartphone Wi-Fi HTTP stream
    const liveProbe = await probeSmartphoneWifiStream(mockSmartphoneUrl, 2000);
    assert.equal(liveProbe.reachable, true);
    assert.equal(liveProbe.statusCode, 200);
    assert.equal(liveProbe.contentType, 'image/jpeg');

    // 2.2 Report ONLINE heartbeat to POST /api/cameras/heartbeat
    const hbOnlineRes = await request(app)
      .post('/api/cameras/heartbeat')
      .set('X-ML-Service-Key', mlKey)
      .send({
        cameraCode: 'CAM_001',
        status: 'ONLINE',
        streamUrl: mockSmartphoneUrl,
        reconnectAttempts: 0,
      });
    assert.equal(hbOnlineRes.status, 200);
    assert.equal(hbOnlineRes.body.data.status, 'ONLINE');

    // 2.3 Simulate smartphone Wi-Fi stream dropping (unreachable URL)
    const deadProbe = await probeSmartphoneWifiStream('http://127.0.0.1:59999/shot.jpg', 800);
    assert.equal(deadProbe.reachable, false);
    assert.ok(deadProbe.error);

    // Report STREAM_ERROR with reconnectAttempts = 2
    const hbErrRes = await request(app)
      .post('/api/cameras/heartbeat')
      .set('X-ML-Service-Key', mlKey)
      .send({
        cameraCode: 'CAM_001',
        status: 'STREAM_ERROR',
        reconnectAttempts: 2,
        lastStreamError: deadProbe.error,
      });
    assert.equal(hbErrRes.status, 200);
    assert.equal(hbErrRes.body.data.status, 'STREAM_ERROR');
    assert.equal(hbErrRes.body.data.reconnectAttempts, 2);

    // 2.4 Simulate camera heartbeat timeout (>90s stale) -> automatic transition to OFFLINE
    const staleDate = new Date(Date.now() - 120 * 1000);
    await Camera.updateOne({ _id: camera2Id }, { $set: { status: 'ONLINE', lastHeartbeat: staleDate } });

    const checkCam2 = await request(app)
      .get(`/api/cameras/${camera2Id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(checkCam2.status, 200);
    assert.equal(checkCam2.body.data.camera.status, 'OFFLINE');
  });

  test('3. Security & Validation Test T07: X-ML-Service-Key Auth & Confidence Bounds Validation', async () => {
    const validPayload = buildMockDetectionPayload({
      cameraCode: 'CAM_001',
      scenario: 'SAFE',
    });

    // Missing X-ML-Service-Key -> 401 ML_AUTH_REQUIRED
    const noKeyRes = await request(app).post('/api/detections').send(validPayload);
    assert.equal(noKeyRes.status, 401);
    assert.equal(noKeyRes.body.error.code, 'ML_AUTH_REQUIRED');

    // Invalid X-ML-Service-Key -> 401 INVALID_ML_SERVICE_KEY
    const badKeyRes = await request(app)
      .post('/api/detections')
      .set('X-ML-Service-Key', 'wrong_ml_service_key_000')
      .send(validPayload);
    assert.equal(badKeyRes.status, 401);
    assert.equal(badKeyRes.body.error.code, 'INVALID_ML_SERVICE_KEY');

    // T07: Invalid overallConfidence (> 1.0) -> 400 VALIDATION_ERROR
    const highConfRes = await request(app)
      .post('/api/detections')
      .set('X-ML-Service-Key', mlKey)
      .send({
        ...validPayload,
        overallConfidence: 1.35,
      });
    assert.equal(highConfRes.status, 400);
    assert.equal(highConfRes.body.error.code, 'VALIDATION_ERROR');

    // T07: Invalid object confidence (< 0.0) -> 400 VALIDATION_ERROR
    const negConfRes = await request(app)
      .post('/api/detections')
      .set('X-ML-Service-Key', mlKey)
      .send({
        ...validPayload,
        detections: [{ classLabel: 'helmet', confidence: -0.2 }],
      });
    assert.equal(negConfRes.status, 400);
    assert.equal(negConfRes.body.error.code, 'VALIDATION_ERROR');

    // Unregistered cameraCode -> 404 CAMERA_NOT_FOUND
    const unknownCamRes = await request(app)
      .post('/api/detections')
      .set('X-ML-Service-Key', mlKey)
      .send({
        ...validPayload,
        cameraCode: 'CAM_NONEXISTENT',
      });
    assert.equal(unknownCamRes.status, 404);
    assert.equal(unknownCamRes.body.error.code, 'CAMERA_NOT_FOUND');
  });

  test('4. Three Detection States (SAFE, UNCERTAIN, VIOLATION) & Mock vs. Real Separation', async () => {
    // 4.1 SAFE State (Mock Service Payload) -> stored with isMockDetection: true, no incident created
    const safeMockPayload = buildMockDetectionPayload({
      cameraCode: 'CAM_001',
      scenario: 'SAFE',
    });
    const safeRes = await request(app)
      .post('/api/detections')
      .set('X-ML-Service-Key', mlKey)
      .send(safeMockPayload);

    assert.equal(safeRes.status, 201);
    assert.equal(safeRes.body.data.detectionState, 'SAFE');
    assert.equal(safeRes.body.data.safetyStatus, 'SAFE');
    assert.equal(safeRes.body.data.isMockDetection, true);
    assert.equal(safeRes.body.data.incidentCreated, false);
    assert.equal(safeRes.body.data.incidentId, null);

    // Confirm CAM_001 automatically reconnected to ONLINE when detection arrived
    const cam1AfterSafe = await Camera.findById(camera1Id);
    assert.equal(cam1AfterSafe.status, 'ONLINE');
    assert.equal(cam1AfterSafe.reconnectAttempts, 0);

    // 4.2 UNCERTAIN State -> stored as UNCERTAIN / REVIEW_REQUIRED; NEVER triggers violation escalation
    const uncertainMockPayload = buildMockDetectionPayload({
      cameraCode: 'CAM_001',
      scenario: 'UNCERTAIN',
    });
    const uncertainRes = await request(app)
      .post('/api/detections')
      .set('X-ML-Service-Key', mlKey)
      .send(uncertainMockPayload);

    assert.equal(uncertainRes.status, 201);
    assert.equal(uncertainRes.body.data.detectionState, 'UNCERTAIN');
    assert.equal(uncertainRes.body.data.safetyStatus, 'REVIEW_REQUIRED');
    assert.equal(uncertainRes.body.data.incidentCreated, false, 'UNCERTAIN must NEVER trigger an incident');

    // 4.3 Head-Region Cropped / Invisible Gate: even if caller submits VIOLATION,
    // if headRegionVisible === false, backend forces UNCERTAIN and suppresses false escalation
    const croppedHeadRes = await request(app)
      .post('/api/detections')
      .set('X-ML-Service-Key', mlKey)
      .send({
        cameraCode: 'CAM_001',
        occurredAt: new Date().toISOString(),
        modelVersion: MOCK_MODEL_VERSION,
        isMockDetection: true,
        detections: [{ classLabel: 'person', confidence: 0.91 }],
        missingPPE: ['helmet'],
        detectionState: 'VIOLATION',
        overallConfidence: 0.91,
        headRegionVisible: false,
      });
    assert.equal(croppedHeadRes.status, 201);
    assert.equal(croppedHeadRes.body.data.detectionState, 'UNCERTAIN');
    assert.equal(croppedHeadRes.body.data.incidentCreated, false);

    // 4.4 Duplicate idempotencyKey rejection (409 DUPLICATE_IDEMPOTENCY_KEY)
    const dupIdempRes = await request(app)
      .post('/api/detections')
      .set('X-ML-Service-Key', mlKey)
      .send(safeMockPayload);
    assert.equal(dupIdempRes.status, 409);
    assert.equal(dupIdempRes.body.error.code, 'DUPLICATE_IDEMPOTENCY_KEY');
  });

  test('5. Functional Test T06, T16 & Strict Worker Identification Only When RFID-Verified', async () => {
    // 5.1 Attempt to submit a VIOLATION claiming Worker 2 (who has NEVER scanned into Zone A via RFID)
    // Backend MUST reject the unverified workerId and force workerId: null (workerIdentificationSource: 'NONE')
    const unverifiedWorkerPayload = {
      ...buildMockDetectionPayload({
        cameraCode: 'CAM_001',
        scenario: 'VIOLATION',
        missingPPE: ['safety_vest'],
        verifyWorkerByRfid: false,
      }),
      workerId: worker2Id, // Unverified worker from Zone B!
    };

    const unverifiedRes = await request(app)
      .post('/api/detections')
      .set('X-ML-Service-Key', mlKey)
      .send(unverifiedWorkerPayload);

    assert.equal(unverifiedRes.status, 201);
    assert.equal(unverifiedRes.body.data.detectionState, 'VIOLATION');
    assert.equal(
      unverifiedRes.body.data.workerId,
      null,
      'Backend must force workerId to null when worker is not RFID-verified in that zone'
    );
    assert.equal(unverifiedRes.body.data.workerIdentificationSource, 'NONE');
    assert.equal(unverifiedRes.body.data.incidentCreated, true);

    const vestIncident = await Incident.findById(unverifiedRes.body.data.incidentId);
    assert.equal(vestIncident.incidentType, 'MISSING_SAFETY_VEST');
    assert.equal(vestIncident.status, 'WARNING_GRACE_PERIOD');
    assert.ok(vestIncident.description.startsWith('[MOCK TEST DETECTION]'));

    // 5.2 Now Worker 1 scans their RFID card (A1B2C3D4) on ESP32_001 in Zone A
    const rfidScanRes = await request(app)
      .post('/api/rfid/scan')
      .set('X-Device-Code', 'ESP32_001')
      .set('X-Device-Key', device1ApiKey)
      .send({
        deviceCode: 'ESP32_001',
        rfidUid: 'A1B2C3D4',
      });
    assert.equal(rfidScanRes.status, 200);
    assert.equal(rfidScanRes.body.data.recognized, true);

    // 5.3 Submit a MISSING_HELMET VIOLATION in Zone A with verifyWorkerByRfid: true
    // Since Worker 1 is the single active RFID-verified worker in Zone A, workerId is verified!
    const verifiedViolationPayload = buildMockDetectionPayload({
      cameraCode: 'CAM_001',
      scenario: 'VIOLATION',
      missingPPE: ['helmet'],
      verifyWorkerByRfid: true,
    });

    const verifiedRes = await request(app)
      .post('/api/detections')
      .set('X-ML-Service-Key', mlKey)
      .send(verifiedViolationPayload);

    assert.equal(verifiedRes.status, 201);
    assert.equal(verifiedRes.body.data.workerId, worker1Id);
    assert.equal(verifiedRes.body.data.workerIdentificationSource, 'RFID_CHECKPOINT_VERIFIED');
    assert.equal(verifiedRes.body.data.incidentCreated, true);

    // 5.4 T16: Send a second MISSING_HELMET VIOLATION from CAM_001 within INCIDENT_COOLDOWN_SECONDS
    // Must merge into the existing incident (occurrenceCount = 2, incidentCreated: false, cooldownMerged: true)
    const secondFramePayload = buildMockDetectionPayload({
      cameraCode: 'CAM_001',
      scenario: 'VIOLATION',
      missingPPE: ['helmet'],
      verifyWorkerByRfid: true,
    });
    const mergedRes = await request(app)
      .post('/api/detections')
      .set('X-ML-Service-Key', mlKey)
      .send(secondFramePayload);

    assert.equal(mergedRes.status, 201);
    assert.equal(mergedRes.body.data.incidentCreated, false);
    assert.equal(mergedRes.body.data.cooldownMerged, true);
    assert.equal(mergedRes.body.data.incidentId, verifiedRes.body.data.incidentId);

    const helmetIncident = await Incident.findById(verifiedRes.body.data.incidentId);
    assert.equal(helmetIncident.occurrenceCount, 2);

    // 5.5 Verify GET /api/detections supports filtering mock vs real detections (?isMockDetection=true|false)
    const mockOnlyList = await request(app)
      .get('/api/detections?isMockDetection=true')
      .set('Authorization', `Bearer ${supervisorAToken}`);
    assert.equal(mockOnlyList.status, 200);
    assert.ok(mockOnlyList.body.data.total >= 5);

    const realOnlyList = await request(app)
      .get('/api/detections?isMockDetection=false')
      .set('Authorization', `Bearer ${supervisorAToken}`);
    assert.equal(realOnlyList.status, 200);
    assert.equal(realOnlyList.body.data.total, 0, 'No real ML detections exist yet; all mock records are cleanly separated');
  });
});
