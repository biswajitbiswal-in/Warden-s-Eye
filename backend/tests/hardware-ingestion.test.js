const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_smartppe_phase3_hardware_ingestion_256bit';
process.env.JWT_EXPIRES_IN = '2h';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.RFID_COOLDOWN_SECONDS = '10';
process.env.INCIDENT_COOLDOWN_SECONDS = '60';
process.env.DEVICE_HEARTBEAT_TIMEOUT_SECONDS = '90';

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { User } = require('../src/models/User.model');
const { Zone } = require('../src/models/Zone.model');
const { Worker } = require('../src/models/Worker.model');
const { ZoneAssignment } = require('../src/models/ZoneAssignment.model');
const { Device } = require('../src/models/Device.model');
const { RfidLog } = require('../src/models/RfidLog.model');
const { SensorEvent } = require('../src/models/SensorEvent.model');
const { Incident } = require('../src/models/Incident.model');
const { AuditLog } = require('../src/models/AuditLog.model');

let mongoServer;
let adminToken;
let supervisorAToken;
let worker1Token;
let zoneAId;
let zoneBId;
let worker1Id;
let device1Id;
let device1ApiKey;
let device2Id;
let device2ApiKey;

describe('SmartPPE — Warden\'s Eye: Phase 3 Device Registry, X-Device-Key Auth, RFID & Sensor Ingestion Test Suite', () => {
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
      RfidLog.init(),
      SensorEvent.init(),
      Incident.init(),
      AuditLog.init(),
    ]);

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

    // 4. Create Worker 1 user account and link Worker 1 profile with RFID UID A1B2C3D4
    const wrkUserRes = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Worker One',
        email: 'worker1@smartppe.local',
        password: 'WorkerPassword123!',
        role: 'WORKER',
      });

    const wrkProfileRes = await request(app)
      .post('/api/workers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeCode: 'EMP-001',
        name: 'Worker One',
        department: 'Assembly',
        designation: 'Technician',
        zoneId: zoneAId,
        rfidUid: 'A1B2C3D4',
        userId: wrkUserRes.body.data.user.userId,
      });
    worker1Id = wrkProfileRes.body.data.worker.workerId;

    const wrkLogin = await request(app).post('/api/auth/login').send({
      email: 'worker1@smartppe.local',
      password: 'WorkerPassword123!',
    });
    worker1Token = wrkLogin.body.data.token;
  });

  after(async () => {
    await disconnectDB();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test('1. Register ESP32 Devices & Verify One-Time Key Generation and Hashed Storage', async () => {
    // Register ESP32_001 in Zone A
    const dev1Res = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        deviceCode: 'esp32_001',
        deviceName: 'Zone A Entry Checkpoint Node',
        zoneId: zoneAId,
        firmwareVersion: '1.0.0',
      });

    assert.equal(dev1Res.status, 201);
    assert.equal(dev1Res.body.data.device.deviceCode, 'ESP32_001');
    assert.equal(dev1Res.body.data.device.status, 'OFFLINE');
    assert.ok(dev1Res.body.data.deviceApiKey.startsWith('esp32_live_'));
    assert.equal(dev1Res.body.data.device.apiKeyHash, undefined, 'apiKeyHash must not be leaked in JSON');

    device1Id = dev1Res.body.data.device.deviceId;
    device1ApiKey = dev1Res.body.data.deviceApiKey;

    // Verify raw key is NOT stored in MongoDB (only 64-char SHA-256 hex digest)
    const dbDevice1 = await Device.findById(device1Id).select('+apiKeyHash');
    assert.notEqual(dbDevice1.apiKeyHash, device1ApiKey);
    assert.equal(dbDevice1.apiKeyHash.length, 64);

    // Register ESP32_002 in Zone B
    const dev2Res = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        deviceCode: 'ESP32_002',
        deviceName: 'Zone B Warehouse Node',
        zoneId: zoneBId,
      });
    assert.equal(dev2Res.status, 201);
    device2Id = dev2Res.body.data.device.deviceId;
    device2ApiKey = dev2Res.body.data.deviceApiKey;

    // Non-admin cannot register devices
    const supRegAttempt = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${supervisorAToken}`)
      .send({
        deviceCode: 'ESP32_ROGUE',
        deviceName: 'Rogue Node',
        zoneId: zoneAId,
      });
    assert.equal(supRegAttempt.status, 403);
  });

  test('2. Security Test T03: Reject Unauthenticated, Spoofed, or Maintenance-Mode ESP32 Requests', async () => {
    // Missing X-Device-Key header -> 401
    const noKeyRes = await request(app).post('/api/rfid/scan').send({
      deviceCode: 'ESP32_001',
      rfidUid: 'A1B2C3D4',
    });
    assert.equal(noKeyRes.status, 401);
    assert.equal(noKeyRes.body.error.code, 'DEVICE_AUTH_REQUIRED');

    // Wrong X-Device-Key -> 401
    const wrongKeyRes = await request(app)
      .post('/api/rfid/scan')
      .set('X-Device-Code', 'ESP32_001')
      .set('X-Device-Key', 'esp32_live_wrong_key_value_000000000000')
      .send({
        deviceCode: 'ESP32_001',
        rfidUid: 'A1B2C3D4',
      });
    assert.equal(wrongKeyRes.status, 401);
    assert.equal(wrongKeyRes.body.error.code, 'INVALID_DEVICE_CREDENTIALS');

    // Mismatched X-Device-Code header vs body deviceCode -> 401
    const mismatchRes = await request(app)
      .post('/api/rfid/scan')
      .set('X-Device-Code', 'ESP32_001')
      .set('X-Device-Key', device1ApiKey)
      .send({
        deviceCode: 'ESP32_002',
        rfidUid: 'A1B2C3D4',
      });
    assert.equal(mismatchRes.status, 401);
    assert.equal(mismatchRes.body.error.code, 'DEVICE_CODE_MISMATCH');

    // Put ESP32_001 in MAINTENANCE mode -> must reject scan with 403 DEVICE_IN_MAINTENANCE
    await request(app)
      .patch(`/api/devices/${device1Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'MAINTENANCE' });

    const maintScanRes = await request(app)
      .post('/api/rfid/scan')
      .set('X-Device-Code', 'ESP32_001')
      .set('X-Device-Key', device1ApiKey)
      .send({
        deviceCode: 'ESP32_001',
        rfidUid: 'A1B2C3D4',
      });
    assert.equal(maintScanRes.status, 403);
    assert.equal(maintScanRes.body.error.code, 'DEVICE_IN_MAINTENANCE');

    // Restore ESP32_001 to OFFLINE/ready
    await request(app)
      .patch(`/api/devices/${device1Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'OFFLINE' });
  });

  test('3. Functional Test T01 & T15: Registered RFID Card Scan, Worker Zone Presence & Duplicate Cooldown', async () => {
    // T01: Scan registered card A1B2C3D4 on ESP32_001
    const scan1Res = await request(app)
      .post('/api/rfid/scan')
      .set('X-Device-Code', 'ESP32_001')
      .set('X-Device-Key', device1ApiKey)
      .send({
        deviceCode: 'ESP32_001',
        rfidUid: 'a1b2c3d4',
        firmwareVersion: '1.1.0',
      });

    assert.equal(scan1Res.status, 200);
    assert.equal(scan1Res.body.data.recognized, true);
    assert.equal(scan1Res.body.data.scanStatus, 'SUCCESS');
    assert.equal(scan1Res.body.data.duplicateIgnored, false);
    assert.equal(scan1Res.body.data.worker.employeeCode, 'EMP-001');
    assert.equal(scan1Res.body.data.zoneId, zoneAId);

    // Verify Worker 1's lastSeenZoneId and lastRfidScanAt were updated in MongoDB
    const updatedWorker = await Worker.findById(worker1Id);
    assert.equal(updatedWorker.lastSeenZoneId.toString(), zoneAId);
    assert.ok(updatedWorker.lastRfidScanAt instanceof Date);

    // Verify ESP32_001 automatically transitioned to ONLINE with firmwareVersion 1.1.0
    const updatedDevice = await Device.findById(device1Id);
    assert.equal(updatedDevice.status, 'ONLINE');
    assert.equal(updatedDevice.firmwareVersion, '1.1.0');

    // T15: Scan the exact same card again immediately (within 10s cooldown) -> DUPLICATE_IGNORED
    const scan2Res = await request(app)
      .post('/api/rfid/scan')
      .set('X-Device-Code', 'ESP32_001')
      .set('X-Device-Key', device1ApiKey)
      .send({
        deviceCode: 'ESP32_001',
        rfidUid: 'A1B2C3D4',
      });

    assert.equal(scan2Res.status, 200);
    assert.equal(scan2Res.body.data.recognized, true);
    assert.equal(scan2Res.body.data.scanStatus, 'DUPLICATE_IGNORED');
    assert.equal(scan2Res.body.data.duplicateIgnored, true);
  });

  test('4. Functional Test T02: Unknown RFID Card Handling & Incident Cooldown Deduplication', async () => {
    const totalWorkersBefore = await Worker.countDocuments();

    const unknownRes = await request(app)
      .post('/api/rfid/scan')
      .set('X-Device-Code', 'ESP32_001')
      .set('X-Device-Key', device1ApiKey)
      .send({
        deviceCode: 'ESP32_001',
        rfidUid: 'DEADBEEF01',
      });

    assert.equal(unknownRes.status, 200);
    assert.equal(unknownRes.body.data.recognized, false);
    assert.equal(unknownRes.body.data.scanStatus, 'UNKNOWN_CARD');
    assert.equal(unknownRes.body.data.worker, null);
    assert.equal(unknownRes.body.data.incidentCreated, true);
    assert.ok(unknownRes.body.data.incidentId);

    // Must never auto-create a worker account for an unknown RFID card
    const totalWorkersAfter = await Worker.countDocuments();
    assert.equal(totalWorkersAfter, totalWorkersBefore);

    // Scanning a second unknown card on the same device within INCIDENT_COOLDOWN_SECONDS
    // merges into the existing open UNKNOWN_RFID incident (occurrenceCount = 2)
    const unknown2Res = await request(app)
      .post('/api/rfid/scan')
      .set('X-Device-Code', 'ESP32_001')
      .set('X-Device-Key', device1ApiKey)
      .send({
        deviceCode: 'ESP32_001',
        rfidUid: 'DEADBEEF02',
      });
    assert.equal(unknown2Res.status, 200);
    assert.equal(unknown2Res.body.data.incidentCreated, false);
    assert.equal(unknown2Res.body.data.incidentId, unknownRes.body.data.incidentId);

    const mergedIncident = await Incident.findById(unknownRes.body.data.incidentId);
    assert.equal(mergedIncident.occurrenceCount, 2);
  });

  test('5. Functional Tests T04 & T05: Supplementary Smoke & Flame Sensor Ingestion & Emergency SOS Summary', async () => {
    // 5.1 Normal Smoke Reading -> stored in sensorEvents, no incident created
    const normalSmokeRes = await request(app)
      .post('/api/sensors/events')
      .set('X-Device-Code', 'ESP32_001')
      .set('X-Device-Key', device1ApiKey)
      .send({
        deviceCode: 'ESP32_001',
        sensorType: 'SMOKE',
        sensorValue: 420,
        threshold: 1500,
        alertStatus: 'NORMAL',
      });
    assert.equal(normalSmokeRes.status, 201);
    assert.equal(normalSmokeRes.body.data.incidentCreated, false);
    assert.equal(normalSmokeRes.body.data.incidentId, null);

    // 5.2 T04: Critical Smoke Event -> creates CRITICAL SMOKE_DETECTED incident with Manual SOS summary
    const critSmokeRes = await request(app)
      .post('/api/sensors/events')
      .set('X-Device-Code', 'ESP32_001')
      .set('X-Device-Key', device1ApiKey)
      .send({
        deviceCode: 'ESP32_001',
        sensorType: 'SMOKE',
        sensorValue: 1980,
        threshold: 1500,
        alertStatus: 'CRITICAL',
      });
    assert.equal(critSmokeRes.status, 201);
    assert.equal(critSmokeRes.body.data.incidentCreated, true);
    assert.ok(critSmokeRes.body.data.incidentId);

    const smokeIncident = await Incident.findById(critSmokeRes.body.data.incidentId);
    assert.equal(smokeIncident.incidentType, 'SMOKE_DETECTED');
    assert.equal(smokeIncident.severity, 'CRITICAL');
    assert.equal(smokeIncident.isEmergency, true);
    assert.equal(smokeIncident.status, 'OPEN');
    assert.ok(smokeIncident.manualSosSummary);
    assert.equal(smokeIncident.manualSosSummary.automatedExternalDispatch, false);
    assert.equal(smokeIncident.manualSosSummary.activeWorkersInZone.length, 1);
    assert.equal(smokeIncident.manualSosSummary.activeWorkersInZone[0].employeeCode, 'EMP-001');

    // 5.3 T05: Critical Flame Event on ESP32_002 (Zone B) -> creates CRITICAL FLAME_DETECTED incident
    const flameRes = await request(app)
      .post('/api/sensors/events')
      .set('X-Device-Code', 'ESP32_002')
      .set('X-Device-Key', device2ApiKey)
      .send({
        deviceCode: 'ESP32_002',
        sensorType: 'FLAME',
        sensorValue: 1,
        threshold: 1,
        alertStatus: 'CRITICAL',
      });
    assert.equal(flameRes.status, 201);
    assert.equal(flameRes.body.data.incidentCreated, true);

    const flameIncident = await Incident.findById(flameRes.body.data.incidentId);
    assert.equal(flameIncident.incidentType, 'FLAME_DETECTED');
    assert.equal(flameIncident.severity, 'CRITICAL');
    assert.equal(flameIncident.isEmergency, true);
    assert.equal(flameIncident.zoneId.toString(), zoneBId);
  });

  test('6. Functional Test T12: Device Heartbeat & Automatic 90-Second Offline Timeout Detection', async () => {
    // Send valid heartbeat from ESP32_001
    const hbRes = await request(app)
      .post('/api/devices/heartbeat')
      .set('X-Device-Code', 'ESP32_001')
      .set('X-Device-Key', device1ApiKey)
      .send({
        deviceCode: 'ESP32_001',
        status: 'ONLINE',
        firmwareVersion: '1.1.2',
        uptimeSeconds: 7200,
      });
    assert.equal(hbRes.status, 200);
    assert.equal(hbRes.body.data.status, 'ONLINE');

    // Simulate ESP32_002 losing connectivity by backdating its lastHeartbeat by 120 seconds (> 90s timeout)
    const staleDate = new Date(Date.now() - 120 * 1000);
    await Device.updateOne({ _id: device2Id }, { $set: { status: 'ONLINE', lastHeartbeat: staleDate } });

    // Query GET /api/devices as Administrator -> sweepStaleDevices() must mark ESP32_002 as OFFLINE
    const devicesRes = await request(app)
      .get('/api/devices')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(devicesRes.status, 200);
    assert.equal(devicesRes.body.data.total, 2);

    const dev1 = devicesRes.body.data.devices.find((d) => d.deviceCode === 'ESP32_001');
    const dev2 = devicesRes.body.data.devices.find((d) => d.deviceCode === 'ESP32_002');
    assert.equal(dev1.status, 'ONLINE');
    assert.equal(dev2.status, 'OFFLINE', 'Stale device (>90s without heartbeat) must transition to OFFLINE');
  });

  test('7. Zone Isolation & Key Rotation Security for Devices, RFID Logs & Sensor Status', async () => {
    // Supervisor A (assigned only to Zone A) calls GET /api/devices -> sees only ESP32_001
    const supDevicesRes = await request(app)
      .get('/api/devices')
      .set('Authorization', `Bearer ${supervisorAToken}`);
    assert.equal(supDevicesRes.status, 200);
    assert.equal(supDevicesRes.body.data.total, 1);
    assert.equal(supDevicesRes.body.data.devices[0].deviceCode, 'ESP32_001');

    // Supervisor A requesting Zone B device by ID -> 403 ZONE_ACCESS_DENIED
    const supZoneBDeviceRes = await request(app)
      .get(`/api/devices/${device2Id}`)
      .set('Authorization', `Bearer ${supervisorAToken}`);
    assert.equal(supZoneBDeviceRes.status, 403);
    assert.equal(supZoneBDeviceRes.body.error.code, 'ZONE_ACCESS_DENIED');

    // Supervisor A calls GET /api/sensors/events and GET /api/sensors/status -> sees only Zone A
    const supSensorEvents = await request(app)
      .get('/api/sensors/events')
      .set('Authorization', `Bearer ${supervisorAToken}`);
    assert.equal(supSensorEvents.status, 200);
    assert.ok(supSensorEvents.body.data.events.every((e) => e.deviceCode === 'ESP32_001'));

    const supSensorStatus = await request(app)
      .get('/api/sensors/status')
      .set('Authorization', `Bearer ${supervisorAToken}`);
    assert.equal(supSensorStatus.status, 200);
    assert.equal(supSensorStatus.body.data.total, 1);
    assert.equal(supSensorStatus.body.data.devices[0].sensors.SMOKE.alertStatus, 'CRITICAL');

    // Worker 1 calls GET /api/rfid/logs -> sees ONLY their own RFID scans (no UNKNOWN_CARD logs)
    const workerLogsRes = await request(app)
      .get('/api/rfid/logs')
      .set('Authorization', `Bearer ${worker1Token}`);
    assert.equal(workerLogsRes.status, 200);
    assert.ok(workerLogsRes.body.data.logs.length >= 1);
    assert.ok(
      workerLogsRes.body.data.logs.every((l) => l.rfidUid === 'A1B2C3D4'),
      'Worker must only see their own RFID scans'
    );

    // Worker 1 attempting to view raw sensor events -> 403 FORBIDDEN
    const workerSensorsRes = await request(app)
      .get('/api/sensors/events')
      .set('Authorization', `Bearer ${worker1Token}`);
    assert.equal(workerSensorsRes.status, 403);

    // Admin rotates ESP32_001 API key -> old key is immediately invalidated, new key works
    const rotateRes = await request(app)
      .post(`/api/devices/${device1Id}/rotate-key`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(rotateRes.status, 200);
    const newDevice1Key = rotateRes.body.data.deviceApiKey;
    assert.notEqual(newDevice1Key, device1ApiKey);

    const oldKeyAttempt = await request(app)
      .post('/api/devices/heartbeat')
      .set('X-Device-Code', 'ESP32_001')
      .set('X-Device-Key', device1ApiKey)
      .send({ deviceCode: 'ESP32_001', status: 'ONLINE' });
    assert.equal(oldKeyAttempt.status, 401);

    const newKeyAttempt = await request(app)
      .post('/api/devices/heartbeat')
      .set('X-Device-Code', 'ESP32_001')
      .set('X-Device-Key', newDevice1Key)
      .send({ deviceCode: 'ESP32_001', status: 'ONLINE' });
    assert.equal(newKeyAttempt.status, 200);
  });
});
