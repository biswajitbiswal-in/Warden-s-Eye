const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Configure test environment variables before loading app modules
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_smartppe_wardens_eye_audit_verification_256bit';
process.env.JWT_EXPIRES_IN = '2h';
process.env.BCRYPT_SALT_ROUNDS = '4'; // Fast bcrypt rounds for unit/integration test speed

const app = require('../src/app');
const { connectDB, disconnectDB, getIsConnected } = require('../src/config/db');
const { User } = require('../src/models/User.model');
const { Zone } = require('../src/models/Zone.model');
const { Worker } = require('../src/models/Worker.model');
const { ZoneAssignment } = require('../src/models/ZoneAssignment.model');

let mongoServer;

// Shared test tokens & fixtures
let adminToken;
let adminUser;
let supervisorAToken;
let supervisorAUser;
let worker1Token;
let worker1User;
let zoneA;
let zoneB;
let worker1Profile;
let worker2Profile;

describe('SmartPPE — Warden\'s Eye: Backend Foundation Test Suite', () => {
  before(async () => {
    // 1. Start in-memory MongoDB or connect to test URI
    const externalTestUri = process.env.TEST_MONGODB_URI;
    if (externalTestUri) {
      await connectDB(externalTestUri);
    } else {
      const path = require('path');
      mongoServer = await MongoMemoryServer.create({
        binary: {
          downloadDir: path.resolve(__dirname, '../.cache/mongodb-binaries'),
        },
      });
      const uri = mongoServer.getUri();
      await connectDB(uri);
    }

    await mongoose.connection.db.dropDatabase();
    await Promise.all([
      User.init(),
      Zone.init(),
      Worker.init(),
      ZoneAssignment.init(),
    ]);
  });

  after(async () => {
    await disconnectDB();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test('1. Database Connection & Health Endpoint Verification', async () => {
    assert.equal(getIsConnected(), true, 'Mongoose should report an active connection');
    assert.equal(mongoose.connection.readyState, 1, 'Mongoose readyState should equal 1 (connected)');

    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'UP');
    assert.equal(res.body.data.databaseConnected, true);
  });

  test('2. Registration Validation (Reject invalid email, short password, and invalid role)', async () => {
    const invalidEmailRes = await request(app).post('/api/auth/register').send({
      name: 'Invalid Email User',
      email: 'not-an-email',
      password: 'ValidPassword123!',
    });
    assert.equal(invalidEmailRes.status, 400);
    assert.equal(invalidEmailRes.body.success, false);
    assert.equal(invalidEmailRes.body.error.code, 'VALIDATION_ERROR');

    const shortPasswordRes = await request(app).post('/api/auth/register').send({
      name: 'Short Password User',
      email: 'short@smartppe.local',
      password: '123',
    });
    assert.equal(shortPasswordRes.status, 400);
    assert.equal(shortPasswordRes.body.success, false);
    assert.equal(shortPasswordRes.body.error.code, 'VALIDATION_ERROR');

    const invalidRoleRes = await request(app).post('/api/auth/register').send({
      name: 'Invalid Role User',
      email: 'role@smartppe.local',
      password: 'ValidPassword123!',
      role: 'MINING_MANAGER',
    });
    assert.equal(invalidRoleRes.status, 400);
    assert.equal(invalidRoleRes.body.success, false);
  });

  test('3. Bootstrap First Administrator Account & Verify Password Hashing Security', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'System Administrator',
      email: 'admin@smartppe.local',
      password: 'AdminPassword123!',
      role: 'ADMINISTRATOR',
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.role, 'ADMINISTRATOR');
    assert.equal(res.body.data.user.email, 'admin@smartppe.local');
    assert.equal(res.body.data.user.passwordHash, undefined, 'passwordHash must NEVER be exposed in API responses');

    adminUser = res.body.data.user;

    // Verify in DB that passwordHash is a bcrypt hash and NOT plaintext
    const dbAdmin = await User.findById(adminUser.userId).select('+passwordHash');
    assert.ok(dbAdmin.passwordHash.startsWith('$2'), 'Stored passwordHash must be a valid bcrypt hash');
    assert.notEqual(dbAdmin.passwordHash, 'AdminPassword123!');
  });

  test('4. Successful Login & Invalid Login Rejection', async () => {
    // Valid login
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@smartppe.local',
      password: 'AdminPassword123!',
    });

    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.success, true);
    assert.ok(loginRes.body.data.token, 'JWT access token must be returned');
    assert.equal(loginRes.body.data.user.role, 'ADMINISTRATOR');
    assert.equal(loginRes.body.data.user.passwordHash, undefined);
    adminToken = loginRes.body.data.token;

    // Wrong password
    const wrongPassRes = await request(app).post('/api/auth/login').send({
      email: 'admin@smartppe.local',
      password: 'WrongPassword999!',
    });
    assert.equal(wrongPassRes.status, 401);
    assert.equal(wrongPassRes.body.success, false);
    assert.equal(wrongPassRes.body.error.code, 'INVALID_CREDENTIALS');

    // Non-existent email
    const unknownEmailRes = await request(app).post('/api/auth/login').send({
      email: 'ghost@smartppe.local',
      password: 'AdminPassword123!',
    });
    assert.equal(unknownEmailRes.status, 401);
    assert.equal(unknownEmailRes.body.success, false);
  });

  test('5. JWT Verification & Unauthorized Access Protection (/api/auth/me and /api/users/me)', async () => {
    // Missing token
    const noTokenRes = await request(app).get('/api/auth/me');
    assert.equal(noTokenRes.status, 401);
    assert.equal(noTokenRes.body.error.code, 'UNAUTHORIZED');

    // Tampered / invalid token
    const badTokenRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.jwt.token');
    assert.equal(badTokenRes.status, 401);
    assert.equal(badTokenRes.body.error.code, 'INVALID_TOKEN');

    // Valid token on /api/auth/me
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.data.user.email, 'admin@smartppe.local');
    assert.equal(meRes.body.data.user.role, 'ADMINISTRATOR');

    // Valid token on /api/users/me alias
    const userMeRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(userMeRes.status, 200);
    assert.equal(userMeRes.body.data.user.userId, adminUser.userId);
  });

  test('6. Role-Based Registration Policy (Prevent unauthenticated or non-admin privilege escalation)', async () => {
    // Unauthenticated registration after bootstrap must fail with 401
    const unauthReg = await request(app).post('/api/auth/register').send({
      name: 'Rogue Admin',
      email: 'rogue@smartppe.local',
      password: 'RoguePassword123!',
      role: 'ADMINISTRATOR',
    });
    assert.equal(unauthReg.status, 401);

    // Admin registers Supervisor A and Worker 1
    const supRes = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Zone A Supervisor',
        email: 'supervisor.a@smartppe.local',
        password: 'SupervisorPassword123!',
        role: 'SUPERVISOR',
      });
    assert.equal(supRes.status, 201);
    supervisorAUser = supRes.body.data.user;

    const wrkRes = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Assembly Worker 1',
        email: 'worker1@smartppe.local',
        password: 'WorkerPassword123!',
        role: 'WORKER',
      });
    assert.equal(wrkRes.status, 201);
    worker1User = wrkRes.body.data.user;

    // Login as Supervisor A and Worker 1
    const supLogin = await request(app).post('/api/auth/login').send({
      email: 'supervisor.a@smartppe.local',
      password: 'SupervisorPassword123!',
    });
    supervisorAToken = supLogin.body.data.token;

    const wrkLogin = await request(app).post('/api/auth/login').send({
      email: 'worker1@smartppe.local',
      password: 'WorkerPassword123!',
    });
    worker1Token = wrkLogin.body.data.token;

    // Supervisor attempting to register a user must be rejected with 403 Forbidden
    const supRegAttempt = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${supervisorAToken}`)
      .send({
        name: 'Unauthorized Account',
        email: 'unauth@smartppe.local',
        password: 'ValidPassword123!',
        role: 'WORKER',
      });
    assert.equal(supRegAttempt.status, 403);
    assert.equal(supRegAttempt.body.error.code, 'FORBIDDEN');
  });

  test('7. Seed Foundation Models (Zones, ZoneAssignments, Workers) & Verify Unique Constraints', async () => {
    zoneA = await Zone.create({
      zoneCode: 'ZONE_A',
      zoneName: 'Assembly Zone A',
      description: 'Main assembly line requiring safety helmet and high-visibility vest',
      status: 'ACTIVE',
    });

    zoneB = await Zone.create({
      zoneCode: 'ZONE_B',
      zoneName: 'Warehouse Zone B',
      description: 'Logistics and forklift handling zone',
      status: 'ACTIVE',
    });

    // Assign Supervisor A ONLY to Zone A
    await ZoneAssignment.create({
      userId: supervisorAUser.userId,
      zoneId: zoneA.zoneId,
      assignedBy: adminUser.userId,
      status: 'ACTIVE',
    });

    // Create Worker 1 in Zone A (linked to worker1User) and Worker 2 in Zone B
    worker1Profile = await Worker.create({
      userId: worker1User.userId,
      employeeCode: 'EMP-001',
      name: 'Assembly Worker 1',
      department: 'Assembly',
      designation: 'Assembly Technician',
      rfidUid: 'A1B2C3D4',
      zoneId: zoneA.zoneId,
      status: 'ACTIVE',
    });

    worker2Profile = await Worker.create({
      employeeCode: 'EMP-002',
      name: 'Warehouse Worker 2',
      department: 'Logistics',
      designation: 'Forklift Operator',
      rfidUid: 'E5F60718',
      zoneId: zoneB.zoneId,
      status: 'ACTIVE',
    });

    // Verify duplicate RFID UID is rejected by unique partial index
    await assert.rejects(
      async () => {
        await Worker.create({
          employeeCode: 'EMP-003',
          name: 'Duplicate Card Worker',
          department: 'Assembly',
          rfidUid: 'A1B2C3D4',
          zoneId: zoneA.zoneId,
        });
      },
      (err) => err.code === 11000
    );
  });

  test('8. Worker Access Restrictions (No worker list browsing, self-only access, IDOR protection)', async () => {
    // Worker calling GET /api/workers must receive 403 Forbidden
    const workerListRes = await request(app)
      .get('/api/workers')
      .set('Authorization', `Bearer ${worker1Token}`);
    assert.equal(workerListRes.status, 403);
    assert.equal(workerListRes.body.error.code, 'FORBIDDEN');

    // Worker calling GET /api/workers/me receives their own profile
    const workerMeRes = await request(app)
      .get('/api/workers/me')
      .set('Authorization', `Bearer ${worker1Token}`);
    assert.equal(workerMeRes.status, 200);
    assert.equal(workerMeRes.body.data.worker.employeeCode, 'EMP-001');

    // Worker calling GET /api/workers/:ownId succeeds
    const workerOwnIdRes = await request(app)
      .get(`/api/workers/${worker1Profile.workerId}`)
      .set('Authorization', `Bearer ${worker1Token}`);
    assert.equal(workerOwnIdRes.status, 200);
    assert.equal(workerOwnIdRes.body.data.worker.workerId, worker1Profile.workerId);

    // Worker calling GET /api/workers/:otherWorkerId must receive 403 Forbidden (IDOR prevention)
    const workerIdorRes = await request(app)
      .get(`/api/workers/${worker2Profile.workerId}`)
      .set('Authorization', `Bearer ${worker1Token}`);
    assert.equal(workerIdorRes.status, 403);
    assert.equal(workerIdorRes.body.error.code, 'FORBIDDEN');
  });

  test('9. Supervisor Zone Isolation & Administrator System-Wide Access (Workers & Zones)', async () => {
    // Supervisor A calling GET /api/zones sees ONLY Zone A
    const supZonesRes = await request(app)
      .get('/api/zones')
      .set('Authorization', `Bearer ${supervisorAToken}`);
    assert.equal(supZonesRes.status, 200);
    assert.equal(supZonesRes.body.data.total, 1);
    assert.equal(supZonesRes.body.data.zones[0].zoneCode, 'ZONE_A');

    // Supervisor A calling GET /api/zones/:zoneBId must receive 403 Forbidden
    const supUnassignedZoneRes = await request(app)
      .get(`/api/zones/${zoneB.zoneId}`)
      .set('Authorization', `Bearer ${supervisorAToken}`);
    assert.equal(supUnassignedZoneRes.status, 403);
    assert.equal(supUnassignedZoneRes.body.error.code, 'ZONE_ACCESS_DENIED');

    // Supervisor A calling GET /api/workers sees ONLY Zone A workers (EMP-001)
    const supWorkersRes = await request(app)
      .get('/api/workers')
      .set('Authorization', `Bearer ${supervisorAToken}`);
    assert.equal(supWorkersRes.status, 200);
    assert.equal(supWorkersRes.body.data.total, 1);
    assert.equal(supWorkersRes.body.data.workers[0].employeeCode, 'EMP-001');

    // Supervisor A calling GET /api/workers/:worker2Id (Zone B worker) must receive 403 Forbidden
    const supCrossZoneWorkerRes = await request(app)
      .get(`/api/workers/${worker2Profile.workerId}`)
      .set('Authorization', `Bearer ${supervisorAToken}`);
    assert.equal(supCrossZoneWorkerRes.status, 403);
    assert.equal(supCrossZoneWorkerRes.body.error.code, 'ZONE_ACCESS_DENIED');

    // Administrator calling GET /api/zones and GET /api/workers sees ALL zones (2) and ALL workers (2)
    const adminZonesRes = await request(app)
      .get('/api/zones')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminZonesRes.status, 200);
    assert.equal(adminZonesRes.body.data.total, 2);

    const adminWorkersRes = await request(app)
      .get('/api/workers')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminWorkersRes.status, 200);
    assert.equal(adminWorkersRes.body.data.total, 2);
  });

  test('10. Token Logout / Revocation & 404 Route Handling', async () => {
    // Unknown route returns 404
    const notFoundRes = await request(app).get('/api/nonexistent-endpoint');
    assert.equal(notFoundRes.status, 404);
    assert.equal(notFoundRes.body.error.code, 'ROUTE_NOT_FOUND');

    // Logout Worker 1 token
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${worker1Token}`);
    assert.equal(logoutRes.status, 200);

    // Using revoked Worker 1 token afterwards returns 401 TOKEN_REVOKED
    const afterLogoutRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${worker1Token}`);
    assert.equal(afterLogoutRes.status, 401);
    assert.equal(afterLogoutRes.body.error.code, 'TOKEN_REVOKED');
  });
});
