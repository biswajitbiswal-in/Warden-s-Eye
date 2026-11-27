# SmartPPE — Warden's Eye
## Phase-Wise Technical Implementation Plan (`IMPLEMENTATION_PLAN.md`)

**Project Name:** SmartPPE — Warden's Eye  
**Platform Category:** AI & IoT-Based Industrial Workplace Safety Monitoring Platform (Offline-First Edge + Cloud Multi-Tenant SaaS)  
**Document Purpose:** Strictly phase-wise engineering execution plan detailing how to take Warden's Eye from its current repository state through the **First Evaluation**, the **Full Offline + Online Prototype**, and the **Commercial Multi-Organisation SaaS Platform**.  
**Last Updated:** 2026-11-27

---

## 0. Current Repository Baseline (Verified Before Planning)

A full inspection of the repository was completed before creating this phase-wise plan.

### 0.1 What Is Already `COMPLETED` vs. `INCOMPLETE` vs. `PENDING`

| Component | Status | Verified Files in Repository | Summary |
|---|---|---|---|
| **Technical Audit & Canonical Docs** | **`COMPLETED`** | `SMARTPPE_TECHNICAL_AUDIT.md`, `README.md`, `docs/*.md`, `docs/plan.md` | All 11 docs aligned to general workplace safety (no mining terminology, no smart-helmet hardware). |
| **Environment & Git Hygiene** | **`COMPLETED`** | `.gitignore`, `.env.example`, `backend/.gitignore`, `backend/.env.example`, `backend/src/config/env.js` | Secrets excluded; environment variables loaded safely. |
| **Express Server & MongoDB Connection** | **`COMPLETED`** | `backend/src/app.js`, `backend/src/server.js`, `backend/src/config/db.js`, `backend/src/middleware/error.middleware.js`, `validate.middleware.js` | Mongoose connection, `GET /api/health`, Helmet, CORS, rate limiting, Zod validation, and centralized error handling. |
| **Authentication & 3-Tier RBAC Middleware** | **`COMPLETED`** | `backend/src/middleware/auth.middleware.js`, `backend/src/controllers/auth.controller.js`, `backend/src/routes/auth.routes.js`, `user.routes.js` | `POST /api/auth/register` (First-Admin bootstrap + Admin-only restriction), `/login`, `/me`, `/logout`, `GET /api/users/me`, `bcryptjs` hashing, JWT verification. |
| **4 Foundation Models (`User`, `Zone`, `Worker`, `ZoneAssignment`)** | **`COMPLETED`** | `backend/src/models/User.model.js`, `Zone.model.js`, `Worker.model.js`, `ZoneAssignment.model.js` | Implemented with partial unique indexes on `rfidUid` and `userId` and compound unique index on `(userId, zoneId)`. |
| **Role & Zone-Isolated Read Routes** | **`COMPLETED`** | `backend/src/controllers/worker.controller.js`, `zone.controller.js`, `backend/src/routes/worker.routes.js`, `zone.routes.js` | `GET /api/workers`, `GET /api/workers/me`, `GET /api/workers/:id`, `GET /api/zones`, `GET /api/zones/:id` enforcing Supervisor zone isolation and Worker self-only access. |
| **Automated Foundation Test Suite** | **`COMPLETED`** | `backend/tests/foundation.test.js` | `10/10` automated tests passing via `npm --prefix backend test`. |
| **Admin Write CRUD & Audit Logging** | **`COMPLETED`** | `backend/src/controllers/{admin,worker}.controller.js`, `services/audit.service.js`, `models/AuditLog.model.js`, `tests/admin-crud.test.js` | Admin Write CRUD for Zones, Supervisors, ZoneAssignments, Workers, and AuditLog verified with `6/6` tests passing (`16/16` total tests passing). |
| **All 12 Canonical Database Models** | **`COMPLETED`** | `backend/src/models/{User,Zone,Worker,ZoneAssignment,Device,Camera,RfidLog,PpeDetection,SensorEvent,Incident,IncidentEvidence,AuditLog}.model.js` | All 12 core Mongoose models implemented with indexes, enums, virtual IDs, and secret redaction. |
| **IoT Device, RFID & Sensor Ingestion** | **`COMPLETED`** | `backend/src/middleware/deviceAuth.middleware.js`, `services/heartbeatMonitor.service.js`, `controllers/{device,rfid,sensor}.controller.js`, `tests/hardware-ingestion.test.js` | `X-Device-Key` constant-time auth, `/api/devices` (with key rotation & 90s heartbeat timeout), `/api/rfid/scan` (with duplicate cooldown & worker zone presence), and `/api/sensors/events` (smoke/flame with Emergency Manual SOS) verified with `7/7` tests (`24/24` total tests passing). |
| **AI/ML PPE Detection & False-Positive Reduction** | **`PENDING` (Next)** | Specs in `docs/ML_INTEGRATION.md` & `docs/plan.md` | Add `X-ML-Service-Key` auth, `/api/cameras`, `/api/detections`, and Python 6-stage reliability filter (`SAFE`, `VIOLATION`, `UNCERTAIN`) (Phase 4). |
| **120-Second Warning, Speaker & SHA-256 Ledger** | **`PENDING`** | Specs in `docs/plan.md` §4.1 | Add `Incident`, `IncidentEvidence` models, local speaker trigger, persistent 120s grace timer, auto-resolution vs. supervisor escalation, and SHA-256 hash chain (Phase 5). |
| **Zero-Delay Critical Emergency & Manual SOS** | **`PENDING`** | Specs in `docs/plan.md` §4.2 | Immediate escalation for flame, critical smoke/fire, and person-fall + formatted Manual SOS generator (Phase 6). |
| **Real-Time Socket.IO, Web Push & Frontend UI** | **`PENDING`** | Specs in `docs/Architecture.md` & `docs/plan.md` §9 | Socket.IO room server, VAPID Web Push, `/api/dashboard/*`, and Role-Based Frontend Dashboards (`frontend/`) (Phases 8 & 9). |
| **Offline-First & Online Cloud Sync** | **`PENDING`** | Specs in `docs/plan.md` §6 | Startup 120s timer recovery, local LAN autonomy, `SyncOutbox` queue, and idempotent cloud batch replay (Phases 10 & 11). |
| **Multi-Organisation SaaS & Subscription Billing** | **`PENDING` (Future)** | Specs in `docs/plan.md` §7–8 | `Organisation`, `Site`, `Building`, `Floor`, `Subscription`, `Invoice`, `organisationId` isolation, RTSP Edge Agent, and Razorpay billing (Phases 13, 14, 15). |

### 0.2 Milestone Horizon Grouping Across the 15 Sequential Phases

- **HORIZON A — FIRST EVALUATION MILESTONE (`Phases 1 to 9` | Priorities `P0`):**
  Delivers the complete working single-facility AI + IoT prototype required for the First Evaluation (Authenticated Backend, 12 Database Models, RFID Worker Identification, AI PPE Detection with False-Positive Reduction, ESP32 + Smoke/Flame Sensors, Local Speaker + 120-Second Grace Period Workflow, Zero-Delay Critical Emergency & Manual SOS, SHA-256 Tamper-Evident Incident Verification, Real-Time Socket.IO + Web Push, and Role-Based Dashboards).
- **HORIZON B — FULL OFFLINE + ONLINE PROTOTYPE HARDENING (`Phases 10 to 12` | Priorities `P0`–`P1`):**
  Hardens the prototype with 100% offline LAN autonomy, startup 120-second timer recovery across restarts, asynchronous `SyncOutbox` cloud synchronization, and the complete automated E2E + security test suite (`T01`–`T17`).
- **HORIZON C — COMMERCIAL MULTI-ORGANISATION SaaS & BILLING (`Phases 13 to 15` | Priorities `P2`–`P3`):**
  Expands the platform into a multi-tenant B2B SaaS platform with `organisationId` isolation, Sites/Buildings/Floors, 11-step company & RTSP camera onboarding, `Starter`/`Professional`/`Enterprise` subscription plans, quota enforcement, Razorpay billing, and industrial pilot deployment.

---

# HORIZON A: FIRST EVALUATION MILESTONE (PHASES 1 – 9)

---

## PHASE 1: Repository Audit, Canonical Contracts & Backend Foundation

- **Current Status:** **`COMPLETED`**
- **Milestone Category:** First Evaluation & Core Prototype
- **Priority:** **`P0` (Critical Foundation)**
- **Dependencies:** None
- **Responsible Team Member:** Team Lead / Backend & System Integration Engineer

### 1.1 Exact Implementation Tasks (Completed & Verified)
1. **Task 1.1 — Technical Audit & Terminology Correction:** Audited all 11 Markdown files (`SMARTPPE_TECHNICAL_AUDIT.md`), removed all mining-specific terminology and smart-helmet references, and unified the JSON payload contracts (`POST /api/rfid/scan`, `POST /api/detections`, `POST /api/sensors/events`).
2. **Task 1.2 — Repository Hygiene & Environment Configuration:** Created `.gitignore`, `.env.example`, `backend/.gitignore`, `backend/.env.example`, and `backend/src/config/env.js`.
3. **Task 1.3 — Express Application & MongoDB Connection:** Created `backend/src/config/db.js` (Mongoose connection + graceful `SIGINT`/`SIGTERM` shutdown), `backend/src/app.js` (Helmet, CORS, Morgan, global rate limiter, `GET /api/health`), `backend/src/server.js`, `AppError.js`, `apiResponse.js`, `error.middleware.js`, and `validate.middleware.js`.
4. **Task 1.4 — Four Foundation Mongoose Models:**
   - `backend/src/models/User.model.js` (`name`, unique `email`, `passwordHash` hidden via `select: false`, `role`: `WORKER | SUPERVISOR | ADMINISTRATOR`, `status`: `ACTIVE | INACTIVE | SUSPENDED`).
   - `backend/src/models/Zone.model.js` (unique uppercase `zoneCode`, `zoneName`, `description`, `status`).
   - `backend/src/models/Worker.model.js` (optional unique `userId` FK, unique `employeeCode`, `name`, `department`, `designation`, optional unique uppercase hex `rfidUid`, `zoneId` FK, `lastSeenZoneId`, `lastRfidScanAt`, `status`).
   - `backend/src/models/ZoneAssignment.model.js` (`userId` FK, `zoneId` FK, `assignedBy` FK, `status`, `assignedAt`, compound unique index on `(userId, zoneId)`).
5. **Task 1.5 — Authentication & 3-Tier RBAC With Zone Isolation:**
   - Implemented `POST /api/auth/register` (First-Admin bootstrap when 0 users exist; strictly `ADMINISTRATOR`-only thereafter), `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/users/me`, `POST /api/auth/logout`.
   - Implemented `requireAuth`, `optionalAuth`, `requireRole`, and `attachRoleContext` in `backend/src/middleware/auth.middleware.js`.
   - Implemented role- and zone-isolated read routes: `GET /api/workers`, `GET /api/workers/me`, `GET /api/workers/:id`, `GET /api/zones`, `GET /api/zones/:id`.

### 1.2 Expected Deliverables (Verified in Repo)
- `backend/package.json`, `backend/src/config/{env,db}.js`, `backend/src/models/{User,Zone,Worker,ZoneAssignment}.model.js`
- `backend/src/middleware/{auth,error,validate}.middleware.js`
- `backend/src/controllers/{auth,worker,zone}.controller.js`
- `backend/src/routes/{auth,user,worker,zone}.routes.js`
- `backend/tests/foundation.test.js`

### 1.3 Testing Procedures
- Run `npm --prefix backend test` executing all 10 integration & RBAC security test cases (`F01`–`F10`).

### 1.4 Acceptance Criteria
- [x] `10/10` tests pass in `backend/tests/foundation.test.js`.
- [x] Plaintext passwords are never stored; `passwordHash` is never returned in API responses.
- [x] Supervisors receive `403 ZONE_ACCESS_DENIED` when requesting unassigned zones or workers from unassigned zones.
- [x] Workers receive `403 FORBIDDEN` when requesting `GET /api/workers` or another worker's ID (`IDOR` protection).

---

## PHASE 2: Admin Write CRUD, Remaining Operational Models & Audit Logging

- **Current Status:** **`COMPLETED`**
- **Milestone Category:** First Evaluation Requirement
- **Priority:** **`P0` (Critical)**
- **Dependencies:** Phase 1 (`COMPLETED`)
- **Responsible Team Member:** Team Lead / Backend Engineer

### 2.1 Objective
Implement the `AuditLog` model and service, create the remaining 7 core Mongoose models (`Device`, `Camera`, `RfidLog`, `PpeDetection`, `SensorEvent`, `Incident`, `IncidentEvidence`), and build all Administrator write CRUD endpoints for managing workplace zones, supervisors, supervisor-to-zone assignments, and workers/RFID tags.

### 2.2 Exact Implementation Tasks

1. **Task 2.1 — Implement `AuditLog.model.js` & `audit.service.js`:**
   - Create `backend/src/models/AuditLog.model.js` with fields: `actorId` (ObjectId, nullable), `actorRole` (`WORKER | SUPERVISOR | ADMINISTRATOR | DEVICE | ML_SERVICE | SYSTEM`), `action` (String), `entityType` (String), `entityId` (String), `details` (Mixed/Object), `occurredAt` (Date, default `Date.now`, indexed).
   - Create `backend/src/services/audit.service.js` exporting `recordAuditLog({ actorId, actorRole, action, entityType, entityId, details })` that writes append-only audit entries (and strips any accidental secret keys from `details`).

2. **Task 2.2 — Implement the Remaining 7 Core Mongoose Models (`backend/src/models/`):**
   - `Device.model.js`: `deviceCode` (unique uppercase), `deviceName`, `deviceType` (`"ESP32"`), `zoneId` (ref `Zone`, required), `apiKeyHash` (String, required, `select: false`), `firmwareVersion` (String), `status` (`"ONLINE" | "OFFLINE" | "MAINTENANCE"`, default `"OFFLINE"`), `lastHeartbeat` (Date, default `null`).
   - `Camera.model.js`: `cameraCode` (unique uppercase), `cameraName`, `zoneId` (ref `Zone`, required), `locationDescription`, `streamType` (`"LOCAL_USB" | "RTSP" | "IP_HTTP"`, default `"LOCAL_USB"`), `encryptedStreamCredentials` (String, `select: false`, default `null`), `status` (`"ONLINE" | "OFFLINE" | "STREAM_ERROR" | "MAINTENANCE"`, default `"OFFLINE"`), `lastHeartbeat` (Date, default `null`).
   - `RfidLog.model.js`: `rfidUid` (uppercase hex, indexed), `workerId` (ref `Worker`, default `null`), `deviceId` (ref `Device`), `deviceCode`, `zoneId` (ref `Zone`), `scanStatus` (`"SUCCESS" | "UNKNOWN_CARD" | "DUPLICATE_IGNORED" | "REJECTED"`), `occurredAt` (Date, indexed).
   - `PpeDetection.model.js`: `idempotencyKey` (unique sparse String), `cameraId` (ref `Camera`), `cameraCode`, `zoneId` (ref `Zone`), `workerId` (ref `Worker`, default `null`), `trackId` (String, default `null`), `modelVersion` (String), `detections` (Array of `{ classLabel, confidence, bbox }`), `missingPPE` (Array of Strings), `detectionState` (`"SAFE" | "VIOLATION" | "UNCERTAIN"`), `safetyStatus` (`"SAFE" | "UNSAFE" | "REVIEW_REQUIRED"`), `overallConfidence` (Number `0..1`), `headRegionVisible` (Boolean, default `true`), `evidenceUrl` (String, default `null`), `occurredAt` (Date, indexed).
   - `SensorEvent.model.js`: `deviceId` (ref `Device`), `deviceCode`, `zoneId` (ref `Zone`), `sensorType` (`"SMOKE" | "FLAME"`), `sensorValue` (Number), `threshold` (Number), `alertStatus` (`"NORMAL" | "WARNING" | "CRITICAL"`), `occurredAt` (Date, indexed).
   - `Incident.model.js`:
     - `idempotencyKey` (unique sparse String)
     - `incidentType` (`"MISSING_HELMET" | "MISSING_SAFETY_VEST" | "MULTIPLE_PPE_VIOLATION" | "SMOKE_DETECTED" | "FLAME_DETECTED" | "PERSON_FALL_DETECTED" | "UNKNOWN_RFID"`)
     - `isEmergency` (Boolean, default `false`)
     - `severity` (`"LOW" | "MEDIUM" | "HIGH" | "CRITICAL"`)
     - `status` (`"WARNING_GRACE_PERIOD" | "SELF_RESOLVED_IN_GRACE" | "OPEN" | "UNDER_REVIEW" | "VERIFIED" | "RESOLVED" | "REJECTED"`, default `"OPEN"`)
     - `zoneId` (ref `Zone`, required, indexed), `workerId` (ref `Worker`, default `null`), `trackId` (String, default `null`)
     - `sourceType` (`"CAMERA_DETECTION" | "SENSOR_EVENT" | "RFID_SCAN" | "MANUAL"`), `sourceId` (ObjectId, default `null`), `deviceOrCameraCode` (String, default `null`)
     - `description` (String, required), `occurrenceCount` (Number, default `1`)
     - **120-Second Grace Period Fields:** `speakerWarningPlayedAt` (Date), `graceStartedAt` (Date), `graceExpiresAt` (Date, indexed), `selfResolvedAt` (Date), `escalatedToSupervisorAt` (Date)
     - **Emergency SOS Field:** `manualSosSummary` (Object, default `null`)
     - **Verification & Resolution Fields:** `assignedSupervisorId` (ref `User`), `acknowledgedBy` (ref `User`), `acknowledgedAt` (Date), `verifiedBy` (ref `User`), `verifiedAt` (Date), `verificationNotes` (String), `resolvedBy` (ref `User`), `resolvedAt` (Date), `resolutionNotes` (String)
     - **SHA-256 Integrity Fields:** `recordHash` (String, default `null`), `previousHash` (String, default `null`), `blockchainTxHash` (String, default `null`).
   - `IncidentEvidence.model.js`: `incidentId` (ref `Incident`, required, indexed), `evidenceType` (`"IMAGE" | "VIDEO" | "DETECTION_PAYLOAD" | "SENSOR_PAYLOAD"`), `evidenceUrl` (String, required), `fileHash` (String, default `null`), `uploadedBy` (ref `User`, default `null`).

3. **Task 2.3 — Implement Administrator Worker Write CRUD (`backend/src/controllers/worker.controller.js`):**
   - `POST /api/workers` (`ADMINISTRATOR` only): Validate with Zod (`employeeCode`, `name`, `department`, `designation`, `zoneId`, optional `rfidUid` matching `^[0-9A-F]{8,20}$`, optional `userId`), verify `zoneId` exists, create worker, record `"WORKER_CREATED"` in `AuditLog`.
   - `PUT /api/workers/:id` (`ADMINISTRATOR` only): Update worker profile, zone assignment, status, or `rfidUid`; record `"WORKER_UPDATED"` in `AuditLog`.
   - `DELETE /api/workers/:id` (`ADMINISTRATOR` only): Soft-deactivate (`status: "INACTIVE"`) or delete test record; record `"WORKER_DEACTIVATED"` in `AuditLog`.

4. **Task 2.4 — Implement Administrator Zone, Supervisor & Audit Endpoints (`backend/src/controllers/admin.controller.js` & `routes/admin.routes.js`):**
   - Protect all `/api/admin/*` routes with `requireAuth` + `requireRole(['ADMINISTRATOR'])`.
   - `GET /api/admin/overview`: Return system-wide counts (`totalZones`, `totalWorkers`, `activeWorkers`, `totalSupervisors`, `totalDevices`, `onlineDevices`, `totalCameras`, `onlineCameras`, `totalIncidents`, `openIncidents`).
   - `GET /api/admin/zones`, `POST /api/admin/zones`, `PUT /api/admin/zones/:id`, `DELETE /api/admin/zones/:id`.
   - `POST /api/admin/zones/:id/assign-supervisor` & `DELETE /api/admin/zones/:id/assign-supervisor/:supervisorId`: Upsert/deactivate `ZoneAssignment` and log `"SUPERVISOR_ZONE_ASSIGNED"` / `"SUPERVISOR_ZONE_UNASSIGNED"`.
   - `GET /api/admin/supervisors`, `POST /api/admin/supervisors`, `PUT /api/admin/supervisors/:id`, `DELETE /api/admin/supervisors/:id`.
   - `GET /api/admin/audit-logs`: Paginated query (`?page=1&limit=50&action=&actorRole=`).

### 2.3 Expected Deliverables
- `backend/src/models/{AuditLog,Device,Camera,RfidLog,PpeDetection,SensorEvent,Incident,IncidentEvidence}.model.js`
- `backend/src/services/audit.service.js`
- `backend/src/validators/{worker,admin}.validator.js`
- `backend/src/controllers/admin.controller.js` & `backend/src/routes/admin.routes.js`
- Extended `backend/src/controllers/worker.controller.js` & `backend/src/routes/worker.routes.js`
- `backend/tests/admin-crud.test.js`

### 2.4 Testing Procedures
- Run `npm --prefix backend test` to execute `admin-crud.test.js`:
  1. Verify `ADMINISTRATOR` can create zones, create supervisors, assign supervisors to zones, and create/update/deactivate workers with RFID UIDs.
  2. Verify duplicate `zoneCode`, `employeeCode`, or `rfidUid` returns `409 DUPLICATE_RESOURCE`.
  3. Verify `SUPERVISOR` or `WORKER` calling any `POST/PUT/DELETE /api/workers` or `/api/admin/*` route is rejected with `403 FORBIDDEN`.
  4. Verify `GET /api/admin/audit-logs` contains the recorded audit trail entries for all mutations.

### 2.5 Acceptance Criteria
- [x] All 12 canonical database models exist in `backend/src/models/` with proper indexes and validation.
- [x] Admin can manage zones, supervisors, zone assignments, and workers end-to-end via REST APIs.
- [x] Every admin write action generates an `AuditLog` document.

---

## PHASE 3: Device Registry, `X-Device-Key` Auth, RFID Ingestion & Sensor Ingestion APIs

- **Current Status:** **`COMPLETED`**
- **Milestone Category:** First Evaluation Requirement
- **Priority:** **`P0` (Critical)**
- **Dependencies:** Phase 2 (`COMPLETED`)
- **Responsible Team Member:** Team Lead / Backend Engineer

### 3.1 Objective
Implement ESP32 device registration with hashed API credentials (`apiKeyHash`), `X-Device-Key` authentication middleware, 90-second heartbeat timeout tracking, `POST /api/rfid/scan` with duplicate-scan cooldown and worker zone presence tracking, and `POST /api/sensors/events` for supplementary smoke and flame sensors.

### 3.2 Exact Implementation Tasks

1. **Task 3.1 — Implement Device Key Hashing & `requireDeviceAuth` Middleware (`backend/src/middleware/deviceAuth.middleware.js`):**
   - Provide helper `generateDeviceApiKey()` returning a 32-byte hex key (`esp32_live_<randomHex>`) and `hashDeviceApiKey(rawKey)` computing its SHA-256 hex digest.
   - In `requireDeviceAuth`:
     - Read `X-Device-Code` (or `req.body.deviceCode`) and `X-Device-Key` headers.
     - Reject missing headers with `401 UNAUTHORIZED`.
     - Look up `Device.findOne({ deviceCode: deviceCode.toUpperCase() }).select('+apiKeyHash')`.
     - Reject unknown device or device with `status === "MAINTENANCE"` (`401` / `403`).
     - Compare `hashDeviceApiKey(rawKey)` against `device.apiKeyHash` using `crypto.timingSafeEqual`.
     - Attach `req.device = device` (including its trusted `zoneId`) to the request.

2. **Task 3.2 — Implement Device Management & Heartbeat Endpoints (`backend/src/controllers/device.controller.js` & `routes/device.routes.js`):**
   - `POST /api/devices` (`ADMINISTRATOR` only): Register `deviceCode`, `deviceName`, `zoneId`; generate raw `deviceApiKey`, store `apiKeyHash`, record audit log, and return `deviceApiKey` **once** in the `201 Created` response.
   - `GET /api/devices` & `GET /api/devices/:id` (`ADMINISTRATOR` all zones; `SUPERVISOR` assigned zones only): Compute effective status dynamically (if `status === "ONLINE"` but `Date.now() - lastHeartbeat > DEVICE_HEARTBEAT_TIMEOUT_SECONDS * 1000`, report/update status as `"OFFLINE"`).
   - `POST /api/devices/heartbeat` (`requireDeviceAuth`): Update `status = "ONLINE"`, `lastHeartbeat = new Date()`, and `firmwareVersion` if provided.

3. **Task 3.3 — Implement RFID Scan Ingestion & Cooldown (`backend/src/controllers/rfid.controller.js` & `routes/rfid.routes.js`):**
   - `POST /api/rfid/scan` (`requireDeviceAuth` + Zod validation):
     - Normalize `rfidUid` to uppercase hex (`^[0-9A-F]{8,20}$`).
     - Resolve `zoneId` strictly from `req.device.zoneId` and update `req.device.lastHeartbeat = new Date()`, `req.device.status = "ONLINE"`.
     - **Duplicate Cooldown Check:** Query `RfidLog.findOne({ rfidUid, deviceId: req.device._id, scanStatus: "SUCCESS", occurredAt: { $gte: new Date(now - RFID_COOLDOWN_SECONDS * 1000) } })`.
       - If found within the cooldown window: create `RfidLog` with `scanStatus: "DUPLICATE_IGNORED"`, return `200 OK` with `duplicateIgnored: true`.
     - **Worker Lookup:** Query `Worker.findOne({ rfidUid, status: "ACTIVE" })`.
       - **If Recognized:** Update `worker.lastSeenZoneId = req.device.zoneId` and `worker.lastRfidScanAt = occurredAt`; save `RfidLog` with `scanStatus: "SUCCESS"` and `workerId: worker._id`; return `200 OK` with `recognized: true` and worker details.
       - **If Unknown Card:** Save `RfidLog` with `scanStatus: "UNKNOWN_CARD"` and `workerId: null` (never auto-create a worker); create/merge a low/medium severity `"UNKNOWN_RFID"` incident if outside the incident cooldown window; return `200 OK` with `recognized: false, scanStatus: "UNKNOWN_CARD"`.
   - `GET /api/rfid/logs` (`SUPERVISOR` assigned zones; `ADMINISTRATOR` all zones).

4. **Task 3.4 — Implement Supplementary Smoke & Flame Sensor Ingestion (`backend/src/controllers/sensor.controller.js` & `routes/sensor.routes.js`):**
   - `POST /api/sensors/events` (`requireDeviceAuth` + Zod validation):
     - Validate `sensorType` (`"SMOKE" | "FLAME"`), numeric `sensorValue`, numeric `threshold`, `alertStatus` (`"NORMAL" | "WARNING" | "CRITICAL"`).
     - Save `SensorEvent` record with `deviceId: req.device._id`, `deviceCode: req.device.deviceCode`, `zoneId: req.device.zoneId`.
     - Update `req.device.lastHeartbeat = new Date()`, `req.device.status = "ONLINE"`.
     - If `alertStatus === "CRITICAL"` or `"WARNING"`, forward event to the Emergency / Incident Service (implemented in Phases 5 & 6).
   - `GET /api/sensors/events` & `GET /api/sensors/status` (role and zone scoped).

### 3.3 Expected Deliverables
- `backend/src/middleware/deviceAuth.middleware.js`
- `backend/src/validators/{device,rfid,sensor}.validator.js`
- `backend/src/controllers/{device,rfid,sensor}.controller.js`
- `backend/src/routes/{device,rfid,sensor}.routes.js`
- `backend/tests/hardware-ingestion.test.js`

### 3.4 Testing Procedures
- Run automated tests in `hardware-ingestion.test.js` verifying functional test cases:
  - **`T01`:** Scan registered RFID card -> resolves worker, updates `lastSeenZoneId`, records `SUCCESS`.
  - **`T02`:** Scan unknown RFID card -> records `UNKNOWN_CARD`, does not create worker, flags `UNKNOWN_RFID` incident.
  - **`T03`:** Submit scan or sensor event with invalid/missing `X-Device-Key` -> rejected with `401 UNAUTHORIZED`.
  - **`T04` & `T05`:** Submit valid `SMOKE` and `FLAME` events -> stored in `sensorEvents`.
  - **`T12`:** Simulate device heartbeat older than 90 seconds -> `GET /api/devices` transitions device status to `"OFFLINE"`.
  - **`T15`:** Scan same RFID card twice within 10s cooldown -> second scan returns `duplicateIgnored: true` (`DUPLICATE_IGNORED`).

### 3.5 Acceptance Criteria
- [x] Raw ESP32 API keys are never stored in MongoDB (`apiKeyHash` only).
- [x] All 7 hardware ingestion test cases (`T01`, `T02`, `T03`, `T04`, `T05`, `T12`, `T15`) pass.

---

## PHASE 4: Camera Registry, ML Detection Ingestion & False-Detection Reduction Pipeline

- **Current Status:** **`PENDING` (Next Immediate Phase to Execute)**
- **Milestone Category:** First Evaluation Requirement
- **Priority:** **`P0` (Critical)**
- **Dependencies:** Phase 2
- **Responsible Team Member:** AI/ML Engineer (Python pipeline) + Team Lead / Backend Engineer (`/api/cameras` & `/api/detections`)

### 4.1 Objective
Implement camera registration (`/api/cameras`), ML service authentication (`X-ML-Service-Key`), `POST /api/detections` supporting the three detection states (`SAFE`, `VIOLATION`, `UNCERTAIN`), and the 6-stage Python false-detection reduction wrapper (ByteTrack tracking, multi-frame verification, head-region visibility check, and confidence tuning).

### 4.2 Exact Implementation Tasks

1. **Task 4.1 — Implement `requireMlAuth` Middleware & Camera Endpoints (`backend/src/middleware/mlAuth.middleware.js`, `controllers/camera.controller.js`):**
   - Validate `X-ML-Service-Key` header against `process.env.ML_SERVICE_API_KEY` using constant-time comparison.
   - Implement `POST /api/cameras` (`ADMINISTRATOR`), `GET /api/cameras` (`ADMINISTRATOR` all; `SUPERVISOR` assigned zones), and `PATCH /api/cameras/:id/status`.

2. **Task 4.2 — Implement ML PPE Detection Ingestion (`backend/src/controllers/detection.controller.js` & `routes/detection.routes.js`):**
   - `POST /api/detections` (`requireMlAuth` + Zod validation):
     - Validate `cameraCode`, `occurredAt`, `modelVersion`, `detections` array (`classLabel`, `confidence` in `[0.0, 1.0]`, optional `bbox`), `missingPPE` array, `overallConfidence` in `[0.0, 1.0]`, and `detectionState` (`"SAFE" | "VIOLATION" | "UNCERTAIN"`) / `safetyStatus` (`"SAFE" | "UNSAFE" | "REVIEW_REQUIRED"`).
     - Normalize `detectionState` <-> `safetyStatus`:
       - `"SAFE"` <-> `"SAFE"`
       - `"VIOLATION"` <-> `"UNSAFE"`
       - `"UNCERTAIN"` <-> `"REVIEW_REQUIRED"`
     - Check `idempotencyKey`: if already present in `PpeDetection`, return `409 DUPLICATE_RESOURCE` (or idempotent `200`).
     - Resolve `camera` by `cameraCode`; return `404` if unregistered; update `camera.lastHeartbeat = new Date()`, `camera.status = "ONLINE"`.
     - **Strict Worker ID Rule:** Keep `workerId: null` unless explicitly verified via single-worker RFID zone presence correlation.
     - Store record in `PpeDetection`.
     - **Three-State Routing Rule:**
       - If `detectionState === "UNCERTAIN"`: store telemetry only; **do NOT trigger speaker warning or 120-second violation escalation**.
       - If `detectionState === "VIOLATION"`: pass to `warningEscalation.service.js` (Phase 5) or `emergency.service.js` (Phase 6 if `person_fall`).
       - If `detectionState === "SAFE"`: check `warningEscalation.service.js` to auto-resolve any active 120-second grace warning for that `(zoneId, cameraCode, trackId)`.
   - `GET /api/detections` & `GET /api/detections/:id` (role and zone scoped).

3. **Task 4.3 — Build the 6-Stage Python False-Detection Reduction Wrapper (`ml-model/src/reliability_pipeline.py`):**
   - **Stage 1 (Model Inference):** Load the ML teammate's existing YOLO/PPE model without altering its trained weights. Normalize raw class names to `"person"`, `"helmet"`, `"no_helmet"`, `"safety_vest"`, `"no_safety_vest"`, `"person_fall"`.
   - **Stage 2 (Person Tracking):** Run **ByteTrack** (or Ultralytics built-in `model.track(persist=True, tracker="bytetrack.yaml")`) to assign a stable `trackId` to each worker across video frames.
   - **Stage 3 (Head-Region & Torso Visibility Check):**
     - For each tracked `person` box `[x1, y1, x2, y2]`, compute the head sub-region (`top 25%` of person box).
     - If `y1 <= 5px` (head clipped by top edge of camera frame) or head box width/height `< 28px` (too distant/occluded), mark `headRegionVisible = False` and force state to **`UNCERTAIN`** rather than falsely reporting `MISSING_HELMET`.
   - **Stage 4 (Dual Confidence Thresholds):**
     - Configure per-class `T_low` (e.g., `0.45`) and `T_high` (e.g., `0.72`) tuned on validation data.
     - Predictions with confidence between `T_low` and `T_high` are classified as **`UNCERTAIN`**.
   - **Stage 5 (Multi-Frame Temporal Verification per `trackId`):**
     - Maintain a `collections.deque(maxlen=7)` per `trackId`.
     - Transition to **`VIOLATION`** only when at least **5 out of 7** consecutive frames confirm the same missing PPE above `T_high` with `headRegionVisible == True`.
     - Transition to **`SAFE`** recovery when **4 consecutive frames** confirm full PPE compliance above `T_high`.
   - **Stage 6 (Snapshot Hashing & Backend Dispatch):**
     - On confirmed `VIOLATION` (or `SAFE` recovery while a warning is active), save annotated JPEG frame to `storage/evidence/`, compute SHA-256 `evidenceFileHash`, and send `POST /api/detections` with `X-ML-Service-Key`.

4. **Task 4.4 — Build Quantitative ML Reliability Benchmark Script (`ml-model/scripts/evaluate_reliability.py`):**
   - Evaluate **Precision**, **Recall**, **False-Positive Rate (FPR)**, and **False-Negative Rate (FNR)** across varied lighting, camera angles, and crowded multi-worker test clips.

### 4.3 Expected Deliverables
- `backend/src/middleware/mlAuth.middleware.js`
- `backend/src/validators/{camera,detection}.validator.js`
- `backend/src/controllers/{camera,detection}.controller.js` & routes
- `ml-model/src/reliability_pipeline.py`, `ml-model/scripts/evaluate_reliability.py`, `ml-model/requirements.txt`
- `backend/tests/ml-detection.test.js`

### 4.4 Testing Procedures
- Run automated backend tests covering:
  - **`T06`:** Submit valid `"VIOLATION"` detection -> stored with `workerId: null` and `zoneId` resolved from `CAM_001`.
  - **`T07`:** Submit detection with `overallConfidence: 1.4` or `-0.1` -> rejected with `400 VALIDATION_ERROR`.
  - **Uncertain Suppression Test:** Submit detection with `detectionState: "UNCERTAIN"` -> stored in `ppeDetections`, `incidentCreated: false`, zero speaker or supervisor alerts triggered.
  - **Unauthenticated ML Rejection:** Missing `X-ML-Service-Key` -> rejected with `401 UNAUTHORIZED`.

### 4.5 Acceptance Criteria
- [ ] `UNCERTAIN` detections never trigger a speaker warning or 120-second violation escalation.
- [ ] Single-frame flickers and edge-cropped heads are filtered out by ByteTrack + multi-frame verification + head visibility checks.
- [ ] `T06` and `T07` pass in automated tests.

---

## PHASE 5: 120-Second Grace Period Engine, Local Speaker Warning & SHA-256 Tamper-Evident Ledger

- **Current Status:** **`PENDING`**
- **Milestone Category:** First Evaluation Requirement (Core Differentiator)
- **Priority:** **`P0` (Critical)**
- **Dependencies:** Phases 3 and 4
- **Responsible Team Member:** Team Lead / Backend Engineer

### 5.1 Objective
Implement the complete **Normal Safety Violation Workflow**: local speaker audio warning, persistent **120-second grace period** countdown, automatic resolution (`SELF_RESOLVED_IN_GRACE`) if the worker puts on their PPE within 120 seconds, automatic escalation (`OPEN`) and supervisor notification if unresolved after 120 seconds, supervisor verification/resolution APIs, and canonical **SHA-256 tamper-evident incident hash chaining**.

### 5.2 Exact Implementation Tasks

1. **Task 5.1 — Implement Local Speaker Audio Service (`backend/src/services/speaker.service.js`):**
   - Implement `playZoneWarningAudio({ zoneCode, zoneName, missingPPE, isEmergency })`:
     - Generates the warning message (e.g., *"Safety Alert in Assembly Zone A: Missing safety helmet detected. You have 120 seconds to wear required PPE."*).
     - Plays audio locally on the edge host (non-blocking child process or audio webhook) and emits a `speaker:play` event so connected LAN audio nodes or browser kiosks can also play the voice alert.
     - Records `speakerWarningPlayedAt = new Date()`.

2. **Task 5.2 — Implement Persistent 120-Second Grace Period State Machine (`backend/src/services/warningEscalation.service.js`):**
   - Read `WARNING_GRACE_SECONDS` from `.env` (defaults to `120` seconds in development/production; configurable e.g. `2` seconds in automated tests).
   - **`handleConfirmedPpeViolation(detectionDoc, cameraDoc)`:**
     - Determine `incidentType` (`MISSING_HELMET`, `MISSING_SAFETY_VEST`, or `MULTIPLE_PPE_VIOLATION`) and default `severity` (`HIGH` or `MEDIUM`).
     - Check if an active `Incident` already exists for `(zoneId, deviceOrCameraCode: cameraCode, incidentType)` with `status IN ["WARNING_GRACE_PERIOD", "OPEN", "UNDER_REVIEW"]`.
       - If found: increment `occurrenceCount += 1`, update `updatedAt`, and return `{ incidentCreated: false, cooldownMerged: true, incident }`.
     - If not found (New Violation):
       - Trigger `playZoneWarningAudio(...)`.
       - Create `Incident` with:
         - `status: "WARNING_GRACE_PERIOD"`
         - `speakerWarningPlayedAt: now`
         - `graceStartedAt: now`
         - `graceExpiresAt: new Date(now.getTime() + WARNING_GRACE_SECONDS * 1000)`
         - `occurrenceCount: 1`
       - If `detectionDoc.evidenceUrl` is present, create `IncidentEvidence` with `fileHash: detectionDoc.evidenceFileHash`.
       - Broadcast `warning:started` via Socket.IO to the zone room.
   - **`handleSafeComplianceRecovery(detectionDoc, cameraDoc)`:**
     - Find any active warning (`status: "WARNING_GRACE_PERIOD"`, `graceExpiresAt > now`) for `(zoneId, deviceOrCameraCode: cameraCode)` (matching `trackId` if provided).
     - If found:
       - Update `status = "SELF_RESOLVED_IN_GRACE"`, `selfResolvedAt = new Date()`.
       - Record `"WARNING_SELF_RESOLVED_IN_GRACE"` in `AuditLog`.
       - Broadcast `warning:resolved` via Socket.IO.
       - **Do not escalate to supervisor.**
   - **`processExpiredGraceWarnings()` (Runs every `2,000 ms` + on server startup):**
     - Find all incidents with `status === "WARNING_GRACE_PERIOD"` and `graceExpiresAt <= new Date()`.
     - For each expired warning:
       - Transition `status = "OPEN"`, `escalatedToSupervisorAt = new Date()`.
       - Record `"WARNING_ESCALATED_AFTER_120S"` in `AuditLog`.
       - Emit `incident:new` via Socket.IO and send Web Push notification to assigned zone supervisors.

3. **Task 5.3 — Implement Canonical SHA-256 Hash Chain Utility (`backend/src/utils/hashChain.util.js`):**
   - `computeCanonicalIncidentHash(incidentDoc, evidenceHashes = [], previousHash = '0'.repeat(64))`:
     - Builds a deterministic JSON string with sorted keys: `{ incidentId, incidentType, severity, zoneId, workerId, sourceType, sourceId, status, verifiedBy, verifiedAt, verificationNotes, resolvedBy, resolvedAt, resolutionNotes, evidenceHashes, previousHash }`.
     - Computes `crypto.createHash('sha256').update(canonicalJson).digest('hex')`.
   - `sealIncidentHash(incidentDoc)`:
     - Finds the most recently sealed incident (`recordHash != null`) to retrieve its `recordHash` as `previousHash` (or `"0".repeat(64)` for the genesis record), computes the new `recordHash`, and saves `recordHash` and `previousHash` on `incidentDoc`.

4. **Task 5.4 — Implement Incident & Supervisor Verification Endpoints (`incident.controller.js`, `supervisor.controller.js`):**
   - `GET /api/incidents` & `GET /api/incidents/:id` (scoped by role: `WORKER` own, `SUPERVISOR` assigned zones, `ADMINISTRATOR` all zones; includes active RFID-checked-in workers in that zone).
   - `GET /api/workers/me/incidents` (`WORKER` self-service incident history).
   - `GET /api/supervisor/zones` (`SUPERVISOR` assigned zones list).
   - `POST /api/supervisor/incidents/:id/acknowledge`: Sets `status = "UNDER_REVIEW"`, `acknowledgedBy`, `acknowledgedAt`.
   - `POST /api/supervisor/incidents/:id/verify`: Validates `verificationStatus` (`"VERIFIED" | "REJECTED"`), mandatory `verificationNotes`, optional `confirmedWorkerId`, sets `verifiedBy`/`verifiedAt`, seals the SHA-256 `recordHash` + `previousHash`, and logs `"INCIDENT_VERIFIED"` / `"INCIDENT_REJECTED"` in `AuditLog`.
   - `POST /api/supervisor/incidents/:id/resolve`: Validates `resolutionNotes`, sets `status = "RESOLVED"`, `resolvedBy`/`resolvedAt`, re-seals `recordHash`, and logs `"INCIDENT_RESOLVED"`.
   - `GET /api/incidents/:id/verify-integrity`: Recomputes the canonical SHA-256 hash from current DB fields and returns `{ integrityValid: storedHash === computedHash, storedRecordHash, computedRecordHash, previousHash }`.

### 5.3 Expected Deliverables
- `backend/src/services/{speaker,warningEscalation}.service.js`
- `backend/src/utils/hashChain.util.js`
- `backend/src/controllers/{incident,supervisor}.controller.js` & routes
- `backend/tests/warning-and-incidents.test.js`

### 5.4 Testing Procedures
- Run automated tests in `warning-and-incidents.test.js`:
  1. **Grace Period Auto-Resolution Test:** Trigger `MISSING_HELMET` `VIOLATION` -> verify `status === "WARNING_GRACE_PERIOD"` and `speakerWarningPlayedAt` set -> send `SAFE` detection before `graceExpiresAt` -> verify `status === "SELF_RESOLVED_IN_GRACE"` and no supervisor escalation.
  2. **120-Second Escalation Test:** Trigger `MISSING_HELMET` `VIOLATION` -> let grace timer expire -> verify `processExpiredGraceWarnings()` promotes incident to `status === "OPEN"` and sets `escalatedToSupervisorAt`.
  3. **Deduplication Test (`T16`):** Send 5 rapid `MISSING_HELMET` detections from `CAM_001` -> verify only 1 incident record exists with `occurrenceCount: 5`.
  4. **Supervisor Zone Isolation & Verification (`T08`, `T09`, `T10`):** Zone A Supervisor verifies Zone A incident (`200 OK`, `recordHash` generated); Zone A Supervisor attempting to verify Zone B incident receives `403 ZONE_ACCESS_DENIED`.
  5. **SHA-256 Tamper Detection Test (`T17`):** Call `GET /api/incidents/:id/verify-integrity` (`integrityValid: true`), then directly modify `description` in MongoDB via `Incident.updateOne`, and call `verify-integrity` again -> assert `integrityValid: false`.

### 5.5 Acceptance Criteria
- [ ] Normal PPE violations always start with a speaker warning + 120-second grace period.
- [ ] Self-corrected violations within 120 seconds resolve automatically without supervisor spam.
- [ ] Unresolved violations after 120 seconds escalate to `"OPEN"` and alert the assigned supervisor.
- [ ] SHA-256 `recordHash` chaining detects any unauthorized database modification (`T17` passes).

---

## PHASE 6: Zero-Delay Critical Emergency Workflow & Manual SOS Generator

- **Current Status:** **`PENDING`**
- **Milestone Category:** First Evaluation Requirement
- **Priority:** **`P0` (Critical)**
- **Dependencies:** Phase 5
- **Responsible Team Member:** Team Lead / Backend Engineer

### 6.1 Objective
Implement the **Critical Emergency Workflow** (for flame detection, critical smoke/validated fire, and validated person-fall detection) that **skips the 120-second grace period**, immediately creates a `CRITICAL` `"OPEN"` incident, triggers urgent supervisor notifications, and generates a formatted **Manual SOS Message** for manual forwarding to emergency services.

### 6.2 Exact Implementation Tasks

1. **Task 6.1 — Implement Critical Emergency Service (`backend/src/services/emergency.service.js`):**
   - Identify critical emergency triggers:
     - `POST /api/sensors/events` where `sensorType === "FLAME"` and `alertStatus IN ["WARNING", "CRITICAL"]` -> `incidentType = "FLAME_DETECTED"`.
     - `POST /api/sensors/events` where `sensorType === "SMOKE"` and `alertStatus === "CRITICAL"` -> `incidentType = "SMOKE_DETECTED"`.
     - `POST /api/detections` where `detections` contains validated `"person_fall"` -> `incidentType = "PERSON_FALL_DETECTED"`.
   - **Zero-Delay Bypass:** Skip `WARNING_GRACE_PERIOD` (`graceStartedAt: null`, `graceExpiresAt: null`). Create `Incident` immediately with `status: "OPEN"`, `severity: "CRITICAL"`, `isEmergency: true`, `escalatedToSupervisorAt: now`.
   - **Active Zone Worker Lookup:** Query `Worker.find({ lastSeenZoneId: zoneId, status: "ACTIVE" }).select('employeeCode name department lastRfidScanAt')`.
   - **Manual SOS Generator (`buildManualSosSummary`):**
     - Construct and save `manualSosSummary` on the incident:
       - `headline`: `"URGENT INDUSTRIAL EMERGENCY — MANUAL DISPATCH REQUIRED"`
       - `incidentType`, `severity: "CRITICAL"`, `zoneCode`, `zoneName`, `deviceOrCameraCode`, `occurredAt`
       - `activeWorkersInZone`: list of workers recently checked into that zone via RFID
       - `formattedMessage`: copy-ready multi-line dispatch message for calling/messaging Fire or Ambulance services
       - `automatedExternalDispatch`: `false`
       - `disclaimer`: `"Emergency services have NOT been automatically contacted. Forward this SOS summary or dial emergency services immediately."`
   - Trigger emergency audio alarm (`speaker.service.js`), emit `emergency:critical` via Socket.IO, send high-urgency Web Push notification, and write `"CRITICAL_EMERGENCY_CREATED"` to `AuditLog`.

2. **Task 6.2 — Expose Emergency SOS Endpoint (`GET /api/incidents/:id/sos`):**
   - Protected by `requireAuth` (`SUPERVISOR` in assigned zone or `ADMINISTRATOR`).
   - Returns the incident's `manualSosSummary` for one-click copying/forwarding in the dashboard.

### 6.3 Expected Deliverables
- `backend/src/services/emergency.service.js`
- `GET /api/incidents/:id/sos` in `incident.controller.js` & `incident.routes.js`
- Integration wiring in `sensor.controller.js` and `detection.controller.js`
- `backend/tests/emergency-workflow.test.js`

### 6.4 Testing Procedures
- Run `emergency-workflow.test.js`:
  1. Scan Worker `EMP-001` via RFID into `ZONE_A`.
  2. Submit `POST /api/sensors/events` with `sensorType: "FLAME"`, `alertStatus: "CRITICAL"` from `ESP32_001` (`ZONE_A`).
  3. Assert response returns `incidentCreated: true` immediately (`0 ms` grace period) with `status === "OPEN"`, `severity === "CRITICAL"`, `isEmergency === true`.
  4. Call `GET /api/incidents/:id/sos` and verify `manualSosSummary.activeWorkersInZone` includes `EMP-001` and `automatedExternalDispatch === false`.
  5. Repeat for `PERSON_FALL_DETECTED` via `POST /api/detections`.

### 6.5 Acceptance Criteria
- [ ] Critical emergencies never enter the 120-second grace period; they create an immediate `CRITICAL` `"OPEN"` incident.
- [ ] The Manual SOS summary includes zone location, hazard type, timestamp, and RFID-active workers in that zone.
- [ ] The response explicitly states that external fire/ambulance services have not been automatically contacted.

---

## PHASE 7: ESP32 Hardware Firmware (RC522 + Smoke + Flame + Heartbeat) & Demo Simulator

- **Current Status:** **`PENDING`** *(Requires confirming actual smoke & flame `ADC1` GPIO pins with hardware team)*
- **Milestone Category:** First Evaluation Requirement
- **Priority:** **`P0` (Critical)**
- **Dependencies:** Phases 3 and 6
- **Responsible Team Member:** Hardware / IoT Engineer + Team Lead

### 7.1 Objective
Write the production-grade non-blocking ESP32 firmware (`hardware/esp32/smartppe_node/smartppe_node.ino`) matching the verified RC522 3.3V SPI wiring and canonical backend HTTP contracts, plus a Node.js hardware/ML event simulator script for development testing and demo backup.

### 7.2 Exact Implementation Tasks

1. **Task 7.1 — Confirm Sensor `ADC1` GPIO Pins & Create Firmware Configuration Header (`hardware/esp32/smartppe_node/config.example.h`):**
   - Lock in verified RC522 SPI pins: `PIN_RC522_RST = 22`, `PIN_RC522_SS = 5`, `PIN_SPI_SCK = 18`, `PIN_SPI_MOSI = 23`, `PIN_SPI_MISO = 19`.
   - Define configurable `ADC1` pins for supplementary sensors (defaulting to recommended `PIN_SMOKE_AO = 34`, `PIN_FLAME_AO = 35` until hardware team confirms physical breadboard jumpers) with big comment warnings against `ADC2` pins and 5V direct connection.
   - Define `WIFI_SSID`, `WIFI_PASSWORD`, `API_BASE_URL`, `DEVICE_CODE`, `DEVICE_API_KEY`, `FIRMWARE_VERSION = "1.0.0"`.

2. **Task 7.2 — Implement Non-Blocking ESP32 Sketch (`hardware/esp32/smartppe_node/smartppe_node.ino`):**
   - Initialize `SPI.begin(18, 19, 23, 5)` and `mfrc522.PCD_Init()`.
   - **Non-blocking `millis()` Scheduler:**
     - **Loop 1 (`every 50 ms` — RFID Scanner):** Check for card -> read UID bytes -> format as uppercase hex string -> check 4-second local same-UID debounce -> enqueue/send `POST /api/rfid/scan` with `X-Device-Code` and `X-Device-Key`.
     - **Loop 2 (`every 500 ms` — Smoke & Flame Sampler):** Ignore smoke sensor during initial 20-second heater warm-up -> compute 5-sample moving average -> compare against `SMOKE_THRESHOLD` and `FLAME_THRESHOLD` -> if `WARNING` or `CRITICAL` and outside 10-second local event cooldown, enqueue/send `POST /api/sensors/events`.
     - **Loop 3 (`every 30,000 ms` — Device Heartbeat):** Send `POST /api/devices/heartbeat` with `status: "ONLINE"` and `uptimeSeconds`.
     - **Loop 4 (Offline RAM Ring Buffer & Wi-Fi Reconnect):** If Wi-Fi drops, buffer up to 15 events in a circular struct array and flush automatically upon reconnection.

3. **Task 7.3 — Implement Authenticated Demo & Hardware Simulator (`backend/src/scripts/demo-simulator.js`):**
   - A CLI script that connects to the live backend using real `X-Device-Key` and `X-ML-Service-Key` headers to trigger:
     - Scenario 1: Worker RFID check-in (`EMP-001` in `ZONE_A`) + Unknown RFID tap.
     - Scenario 2: Normal PPE violation (`MISSING_HELMET`) -> 120s grace countdown -> self-correction within grace period (`SELF_RESOLVED_IN_GRACE`).
     - Scenario 3: Normal PPE violation (`MISSING_SAFETY_VEST`) -> 120s grace period expires -> supervisor escalation (`OPEN`).
     - Scenario 4: Critical Flame Emergency (`FLAME_DETECTED`) -> immediate `CRITICAL` alert + Manual SOS summary.

### 7.3 Expected Deliverables
- `hardware/esp32/smartppe_node/config.example.h`
- `hardware/esp32/smartppe_node/smartppe_node.ino`
- `backend/src/scripts/demo-simulator.js`

### 7.4 Testing Procedures
- Bench-test ESP32 connected to the local backend over a 2.4 GHz mobile hotspot (`http://<HOST_LAN_IP>:5000/api`), verifying RFID scans, sensor triggers, and 30s heartbeats in MongoDB.
- Run `node backend/src/scripts/demo-simulator.js --check` to verify all 4 end-to-end scenarios against the backend API.

### 7.5 Acceptance Criteria
- [ ] RC522 operates reliably at 3.3V SPI without blocking while HTTP requests are sent.
- [ ] Both physical ESP32 hardware and `demo-simulator.js` authenticate cleanly with `X-Device-Key`.

---

## PHASE 8: Real-Time Socket.IO Server, Dashboard Analytics APIs & Web Push Notifications

- **Current Status:** **`PENDING`**
- **Milestone Category:** First Evaluation Requirement
- **Priority:** **`P0` (Critical)**
- **Dependencies:** Phases 5 and 6
- **Responsible Team Member:** Team Lead / Backend Engineer

### 8.1 Objective
Add real-time WebSocket event broadcasting (scoped strictly by user role and supervisor assigned zones), browser Web Push notifications (`web-push` with VAPID), private authenticated evidence serving, and the `/api/dashboard/*` analytics endpoints.

### 8.2 Exact Implementation Tasks

1. **Task 8.1 — Implement Socket.IO Server with JWT & Zone Room Isolation (`backend/src/socket/socket.server.js`):**
   - Attach Socket.IO to the HTTP server in `backend/src/server.js`.
   - Authenticate handshake token (`socket.handshake.auth.token`) using `jwt.verify` and `attachRoleContext`.
   - Join socket rooms:
     - `ADMINISTRATOR` -> joins `admin:all`
     - `SUPERVISOR` -> joins `zone:<zoneId>` for every zone in `assignedZoneIds`
     - `WORKER` -> joins `worker:<workerId>`
   - Export `emitZoneEvent(zoneId, eventName, payload)` which emits to `io.to('zone:' + zoneId).to('admin:all')` for:
     - `warning:started` (120s grace countdown started)
     - `warning:resolved` (worker corrected PPE within 120s)
     - `incident:new` (120s warning expired into an escalated incident)
     - `incident:updated` (acknowledged, verified, rejected, resolved)
     - `emergency:critical` (immediate zero-delay flame/fire/fall emergency)
     - `rfid:scan`, `ppe:detection`, `sensor:alert`, `device:status`, `camera:status`

2. **Task 8.2 — Implement VAPID Web Push Notification Service (`backend/src/services/push.service.js` & `models/PushSubscription.model.js`):**
   - Create `PushSubscription.model.js` storing `{ userId, role, endpoint, keys: { p256dh, auth } }`.
   - Implement `GET /api/notifications/vapid-public-key` and `POST /api/notifications/subscribe` (`requireAuth`).
   - Dispatch Web Push notifications to assigned zone supervisors and administrators **only** when a 120s warning escalates to `"OPEN"` or when a `"CRITICAL"` emergency occurs, preventing duplicate push spam via `incident.lastPushSentAt`.

3. **Task 8.3 — Implement Dashboard & Analytics Aggregations (`backend/src/controllers/dashboard.controller.js` & `routes/dashboard.routes.js`):**
   - Scope all aggregation queries automatically by role (`ADMINISTRATOR`: all zones; `SUPERVISOR`: `zoneId IN assignedZoneIds`; `WORKER`: `workerId === req.user.workerId`).
   - `GET /api/dashboard/overview`: Returns `totalWorkers`, `activeWorkersInZones`, `activeGraceWarnings`, `openIncidents`, `criticalEmergencies`, `verifiedIncidents`, `ppeCompliancePercent`, `onlineDevices`, `onlineCameras`.
   - `GET /api/dashboard/analytics`: Returns PPE compliance percentage formula ($\frac{\text{SAFE detections}}{\text{SAFE} + \text{VIOLATION detections}} \times 100$), incidents by `incidentType`, incidents by `severity`, self-resolved-in-120s rate, and 7-day trend series.
   - `GET /api/dashboard/recent-activities`: Unified chronological feed of recent RFID scans, warnings, incidents, and verifications.
   - `GET /api/dashboard/zones`: Per-zone safety health cards.

4. **Task 8.4 — Implement Private Authenticated Evidence Serving (`GET /api/incidents/:id/evidence/:evidenceId`):**
   - Verify the authenticated user has access to the incident's `zoneId`, verify `IncidentEvidence.fileHash` against the file on disk, and stream the image securely (never exposing evidence in a public unauthenticated static folder).

### 8.3 Expected Deliverables
- `backend/src/socket/socket.server.js`
- `backend/src/models/PushSubscription.model.js` & `backend/src/services/push.service.js`
- `backend/src/controllers/{dashboard,notification}.controller.js` & routes
- `backend/tests/realtime-and-dashboard.test.js`

### 8.4 Testing Procedures
- Run automated tests in `realtime-and-dashboard.test.js`:
  - **`T13`:** Connect two Socket.IO clients (`Supervisor A` assigned to `ZONE_A` and `Supervisor B` assigned to `ZONE_B`); trigger an incident in `ZONE_A`; assert `Supervisor A` receives `incident:new` in `< 200 ms` while `Supervisor B` receives nothing.
  - **`T14`:** Verify `WORKER` or unassigned `SUPERVISOR` requesting `/api/incidents/:id/evidence/:evidenceId` receives `403 FORBIDDEN`.
  - Verify `/api/dashboard/overview` and `/api/dashboard/zones` compute exact compliance percentages and active warning counts.

### 8.5 Acceptance Criteria
- [ ] Real-time Socket.IO events are strictly isolated by zone and role.
- [ ] Dashboard KPIs and compliance analytics match actual database records.

---

## PHASE 9: Role-Based Frontend Dashboards (Admin, Supervisor & Worker Views)

- **Current Status:** **`PENDING`** *(Check if frontend teammate has existing code to import first; otherwise scaffold `frontend/`)*
- **Milestone Category:** First Evaluation Requirement
- **Priority:** **`P0` (Critical)**
- **Dependencies:** Phase 8
- **Responsible Team Member:** Frontend Engineer + Team Lead

### 9.1 Objective
Build and integrate the responsive, high-contrast industrial safety web dashboards for **Organisation Administrators**, **Supervisors**, and **Workers**, wired to the backend REST APIs, real-time Socket.IO events, and Web Push Service Worker.

### 9.2 Exact Implementation Tasks

1. **Task 9.1 — Frontend Foundation, Auth & Socket Providers (`frontend/src/`):**
   - Configure API client (`axios` / `fetch` with `Authorization: Bearer <token>`), `AuthContext` (login, logout, `/api/auth/me` session restore), role-protected routes (`ProtectedRoute`), and `SocketContext`.
   - Register Service Worker (`frontend/public/sw.js`) for browser Web Push notifications.
   - Add top status header displaying: User Role badge, Assigned Zones pill, Online Devices/Cameras count, and **Local LAN / Cloud Sync Status** badge.

2. **Task 9.2 — Build Supervisor Operations Dashboard (`frontend/src/pages/supervisor/`):**
   - **Critical Emergency Alert Banner & Manual SOS Modal:** Immediately surfaces any `isEmergency: true` incident (`FLAME_DETECTED`, `SMOKE_DETECTED`, `PERSON_FALL_DETECTED`) at the top of the screen with an audio chime and a **"Copy Manual SOS for Emergency Services"** button displaying `manualSosSummary` and active RFID workers in that zone.
   - **Live 120-Second Grace Period Monitor:** Real-time countdown cards (`120s -> 0s`) for active `WARNING_GRACE_PERIOD` detections in assigned zones; shows live visual transition to green (`SELF_RESOLVED_IN_GRACE`) when the worker puts on their PPE, or red (`OPEN` incident) if 120 seconds expire.
   - **Assigned Zone Workers & Devices Grid:** Read-only list of workers currently checked into assigned zones via RFID (`lastSeenZoneId`), camera statuses, and ESP32 sensor statuses.
   - **Incident Review, Verification & Resolution Drawer:** Displays violation snapshot evidence, SHA-256 `fileHash`, and action forms for **Acknowledge (`UNDER_REVIEW`)**, **Verify (`VERIFIED`)**, **Reject False Positive (`REJECTED`)**, and **Resolve (`RESOLVED`)** with notes.

3. **Task 9.3 — Build Organisation Administrator Dashboard (`frontend/src/pages/admin/`):**
   - System-wide KPI cards and zone compliance analytics charts (showing 120s self-resolution rate vs. escalated incidents).
   - Interactive management tabs for:
     - **Workplace Zones & Supervisor Assignments**
     - **Workers & 13.56 MHz RFID Card Mapping**
     - **ESP32 IoT Devices** (displays one-time generated `X-Device-Key` on registration + live heartbeat status)
     - **Cameras** (registration + status)
     - **System-Wide Incidents & SHA-256 Tamper Verification** (includes **"Verify Record Integrity"** button calling `GET /api/incidents/:id/verify-integrity` and displaying cryptographic hash comparison)
     - **System Audit Logs**

4. **Task 9.4 — Build Worker Self-Service Portal (`frontend/src/pages/worker/`):**
   - Displays personal worker profile (`GET /api/workers/me`), assigned workplace zone and required PPE checklist, recent RFID check-ins, and personal safety history (`GET /api/workers/me/incidents`).

### 9.3 Expected Deliverables
- Complete `frontend/` application with Login, Admin Dashboard, Supervisor Operations Console, and Worker Portal.

### 9.4 Testing Procedures
- Open 3 browser windows (`Admin`, `Zone A Supervisor`, `Worker 1`), run `node backend/src/scripts/demo-simulator.js`, and verify:
  - Live 120-second grace countdown ticks down on the Supervisor screen and turns green on self-resolution.
  - Unresolved 120s warning escalates to an open incident and triggers a Web Push notification.
  - Critical flame emergency triggers the top emergency banner and opens the formatted Manual SOS modal.
  - Clicking **"Verify Record Integrity"** on a verified incident confirms `integrityValid: true` with matching SHA-256 hashes.

### 9.5 Acceptance Criteria
- [ ] No public registration link exists on the login screen (accounts are provisioned by Administrator).
- [ ] All three role dashboards enforce strict data visibility and update live via WebSockets without page refreshes.

---

# HORIZON B: FULL OFFLINE + ONLINE PROTOTYPE HARDENING (PHASES 10 – 12)

---

## PHASE 10: Offline-First Edge Operation & Startup Timer Recovery

- **Current Status:** **`PENDING`**
- **Milestone Category:** Core Prototype Requirement (Also demonstrable during First Evaluation)
- **Priority:** **`P0` / `P1`**
- **Dependencies:** Phases 5, 6, 8, 9
- **Responsible Team Member:** Team Lead / Backend Engineer + Frontend Engineer

### 10.1 Objective
Guarantee that the entire local safety loop (AI camera detection, RFID identification, sensor processing, local speaker warnings, persistent 120-second grace period timers, and LAN supervisor dashboard) operates with **100% reliability when internet connectivity is completely disconnected**, and recovers pending 120-second timers automatically across server restarts.

### 10.2 Exact Implementation Tasks

1. **Task 10.1 — Startup 120-Second Grace Timer Recovery (`recoverPendingGraceTimers` in `warningEscalation.service.js`):**
   - Invoked automatically on backend boot inside `server.js` right after `connectDB()`.
   - Queries `Incident.find({ status: "WARNING_GRACE_PERIOD" })`:
     - If `graceExpiresAt <= Date.now()`: immediately escalates the incident to `status = "OPEN"`, sets `escalatedToSupervisorAt = new Date()`, logs `"WARNING_RECOVERED_AND_ESCALATED_ON_BOOT"`, and queues supervisor alerts.
     - If `graceExpiresAt > Date.now()`: logs remaining seconds and lets the 2-second sweep timer complete the countdown seamlessly.

2. **Task 10.2 — Offline Asset Bundling & Local LAN Mode Verification:**
   - Ensure `frontend/` bundles all CSS, icons, fonts, and warning audio clips locally (zero external Google Fonts or CDN links that hang when internet is unplugged).
   - Add `/api/health/connectivity` endpoint reporting `{ lanMode: "ACTIVE", databaseConnected: true, onlineDevices, onlineCameras, cloudSyncState: "OFFLINE_LOCAL_ONLY" | "ONLINE_SYNCED" }`.

3. **Task 10.3 — Automated Local Database Backup Utility (`backend/src/scripts/backup-local-db.js`):**
   - Exports timestamped JSON/BSON snapshots of all 12 collections to a local `backups/` directory (`gitignore`d) for data resilience.

### 10.3 Expected Deliverables
- Startup timer reconciliation in `warningEscalation.service.js` & `server.js`
- `GET /api/health/connectivity` & offline-safe frontend bundle
- `backend/src/scripts/backup-local-db.js`
- `backend/tests/offline-recovery.test.js`

### 10.4 Testing Procedures
- **Server Restart Mid-Grace-Period Test:** Start a 120-second warning (`WARNING_GRACE_PERIOD`), stop the Express service / timer loop, advance time past `graceExpiresAt`, invoke `recoverPendingGraceTimers()`, and verify the warning immediately transitions to `"OPEN"` without being lost.
- **LAN Air-Gap Test:** Disconnect internet/WAN while keeping local Wi-Fi hotspot active; verify ESP32 RFID scans, ML detections, speaker audio, 120s timer, and Supervisor LAN dashboard work with zero errors.

### 10.5 Acceptance Criteria
- [ ] Zero active 120-second warning timers are lost if the backend restarts.
- [ ] Local safety monitoring and LAN dashboards have zero external internet dependencies.

---

## PHASE 11: Online Cloud Synchronisation & Idempotent Replay

- **Current Status:** **`PENDING`**
- **Milestone Category:** Prototype Requirement
- **Priority:** **`P1` (High)**
- **Dependencies:** Phase 10
- **Responsible Team Member:** Team Lead / Backend Engineer

### 11.1 Objective
Synchronize locally recorded offline events (incidents, verifications, evidence metadata, RFID logs, audit logs) to a remote cloud instance asynchronously when internet connectivity returns, without delaying local safety alerts or creating duplicate records.

### 11.2 Exact Implementation Tasks

1. **Task 11.1 — Implement Persistent Sync Outbox (`backend/src/models/SyncOutbox.model.js`):**
   - Fields: `idempotencyKey` (unique String), `entityType` (`"INCIDENT" | "INCIDENT_EVIDENCE" | "RFID_LOG" | "SENSOR_EVENT" | "AUDIT_LOG"`), `entityId` (String), `operation` (`"UPSERT"`), `payload` (Object), `syncStatus` (`"PENDING" | "SYNCED" | "FAILED_RETRY"`, default `"PENDING"`, indexed), `retryCount` (Number, default `0`), `nextRetryAt` (Date, default `Date.now`), `lastError` (String).

2. **Task 11.2 — Implement Async Outbox Enqueue & Background Sync Worker (`backend/src/services/cloudSync.service.js`):**
   - `enqueueForCloudSync({ entityType, entityId, payload })`: Non-blocking local insert into `SyncOutbox` with deterministic `idempotencyKey = "${entityType}:${entityId}:${updatedAtMs}"`.
   - `runCloudSyncCycle()`: Runs in the background every `15 seconds` when `CLOUD_SYNC_ENABLED=true`; fetches up to 25 `PENDING` or due `FAILED_RETRY` items and sends them via `POST /api/sync/batch` to `CLOUD_API_BASE_URL` with `X-Edge-Node-Key`.
   - On `200 OK`: marks items `syncStatus = "SYNCED"`. On network failure: increments `retryCount` and schedules exponential backoff (`nextRetryAt = now + min(300s, 2^retryCount * 5s)`).

3. **Task 11.3 — Implement Idempotent Cloud Batch Receiver (`POST /api/sync/batch` & `GET /api/sync/status`):**
   - Authenticates `X-Edge-Node-Key`.
   - Processes each batch item idempotently using `findOneAndUpdate({ idempotencyKey }, { $set: payload }, { upsert: true })` so repeated deliveries after network drops never create duplicate incidents or duplicate Web Push notifications.

### 11.3 Expected Deliverables
- `backend/src/models/SyncOutbox.model.js`
- `backend/src/services/cloudSync.service.js`
- `backend/src/controllers/sync.controller.js` & `backend/src/routes/sync.routes.js`
- `backend/tests/cloud-sync.test.js`

### 11.4 Testing Procedures
- Run `cloud-sync.test.js`:
  1. Generate 3 incidents and 2 RFID scans while cloud sync is paused (`OFFLINE` mode) -> verify 5 `PENDING` items in `SyncOutbox`.
  2. Trigger `runCloudSyncCycle()` against the batch receiver endpoint -> verify all 5 items transition to `SYNCED`.
  3. Replay the exact same batch a second time -> verify `0` duplicate incidents or logs are created in the target database.

### 11.5 Acceptance Criteria
- [ ] Local alert creation latency is unaffected whether cloud sync succeeds or fails.
- [ ] Replaying a sync batch 3 times produces zero duplicate records.

---

## PHASE 12: End-to-End Automated Test Suite (`T01`–`T17`), Security Audit & First Evaluation Package

- **Current Status:** **`IN PROGRESS`** (`F01`–`F10` completed; full `T01`–`T17` E2E suite pending Phases 2–11)
- **Milestone Category:** First Evaluation & Prototype Gate
- **Priority:** **`P0` (Critical)**
- **Dependencies:** Phases 1–11
- **Responsible Team Member:** All Team Members (Led by Team Lead)

### 12.1 Objective
Verify every functional, security, hardware, ML reliability, 120-second timer, emergency SOS, and tamper-detection requirement under automated tests, update `docs/TESTING.md` with actual execution logs, and finalize the First Evaluation live demonstration runbook.

### 12.2 Exact Implementation Tasks
1. **Task 12.1 — Consolidate Full Automated Test Suite (`npm --prefix backend test`):**
   - Ensure `foundation.test.js`, `admin-crud.test.js`, `hardware-ingestion.test.js`, `ml-detection.test.js`, `warning-and-incidents.test.js`, `emergency-workflow.test.js`, `realtime-and-dashboard.test.js`, `offline-recovery.test.js`, and `cloud-sync.test.js` all run cleanly and deterministically.
2. **Task 12.2 — Create Database Demo Seed Script (`backend/src/scripts/seed-demo.js`):**
   - Seeds clean, clearly labeled test accounts (`admin@smartppe.local`, `supervisor.a@smartppe.local`, `supervisor.b@smartppe.local`, `worker1@smartppe.local`), workplace zones (`ZONE_A: Assembly Zone A`, `ZONE_B: Warehouse Zone B`), registered `ESP32_001` & `CAM_001`, and test workers (`EMP-001`, `EMP-002`).
3. **Task 12.3 — Record Actual Test Results in `docs/TESTING.md`:**
   - Update `T01`–`T17` in `docs/TESTING.md` with verified execution dates, inputs, actual outputs, and `PASS` statuses.

### 12.3 Expected Deliverables
- `backend/src/scripts/seed-demo.js`
- Full passing test suite across all 9 test files
- Updated `docs/TESTING.md` with real execution results

### 12.4 Testing Procedures & Acceptance Criteria
- [ ] `npm --prefix backend test` passes 100% of test suites with zero failures.
- [ ] All 11 items in the **First Evaluation Milestone Checklist** (`docs/plan.md` Section 12) are verified live.

---

# HORIZON C: COMMERCIAL MULTI-ORGANISATION SaaS & BILLING (PHASES 13 – 15)

---

## PHASE 13: Multi-Organisation SaaS Architecture, Onboarding Wizard & RTSP Edge Agent

- **Current Status:** **`PENDING` (Future Commercial Phase)**
- **Milestone Category:** Future Commercial SaaS Platform
- **Priority:** **`P2` (Medium — Post-First-Evaluation)**
- **Dependencies:** Phase 12
- **Responsible Team Member:** Team Lead / Backend Engineer + Frontend Engineer + ML Engineer

### 13.1 Objective
Enable multiple industrial companies to use one shared Warden's Eye platform with strict server-side `organisationId` data isolation, hierarchical facility modeling (`Organisation -> Site -> Building -> Floor -> Safety Zone`), encrypted RTSP/IP camera onboarding, and a local Edge Agent connector.

### 13.2 Exact Implementation Tasks

1. **Task 13.1 — Multi-Tenant Hierarchy Models (`backend/src/models/`):**
   - Create `Organisation.model.js` (`name`, `slug`, `industryType`, `contactEmail`, `emergencyPhone`, `address`, `status`), `Site.model.js`, `Building.model.js`, `Floor.model.js`, and `SafetyPolicy.model.js` (per-organisation/zone required PPE, confidence thresholds, and grace period duration).
   - Add indexed `organisationId` (ref `Organisation`) to `User`, `Zone`, `Worker`, `ZoneAssignment`, `Device`, `Camera`, `RfidLog`, `PpeDetection`, `SensorEvent`, `Incident`, `IncidentEvidence`, and `AuditLog`.

2. **Task 13.2 — Server-Side Tenant Isolation Middleware (`backend/src/middleware/tenant.middleware.js`):**
   - Distinguish **Platform Administrator** (`isPlatformAdmin: true`, accesses `/api/platform/*` to manage organisations and subscriptions) from **Organisation Administrator** (`role: "ADMINISTRATOR"`, scoped strictly to their own `req.user.organisationId`).
   - Automatically inject `{ organisationId: req.user.organisationId }` into every query and mutation; reject cross-organisation ID access with `403`/`404`.

3. **Task 13.3 — AES-256-GCM Camera Credential Encryption & Edge Connectivity Testing:**
   - Implement `encryptCameraCredentials` and `decryptCameraCredentials` in `backend/src/utils/crypto.util.js` using `aes-256-gcm`.
   - Implement `POST /api/cameras/:id/test-connection` which asks the local Warden's Eye Edge Agent to probe the RTSP/IP/USB stream, capture a single preview frame, and update `camera.status = "ONLINE" | "STREAM_ERROR"`.

4. **Task 13.4 — Eleven-Step Organisation Onboarding APIs & Frontend Wizard (`/onboarding`):**
   - Implement step-by-step onboarding endpoints and UI guiding a company administrator from Organisation creation -> Facility/Site -> Buildings/Floors -> Safety Zones -> Camera registration & live connectivity preview -> Zone assignment -> ESP32 registration -> Workers & Supervisors -> RFID & Zone responsibilities -> Safety policy config -> Monitoring activation.

### 13.3 Expected Deliverables
- `Organisation`, `Site`, `Building`, `Floor`, `SafetyPolicy` models
- `backend/src/middleware/tenant.middleware.js` & `backend/src/utils/crypto.util.js`
- Onboarding APIs (`/api/organisations/*`, `/api/sites/*`, `/api/platform/*`) & Frontend Onboarding Wizard
- `backend/tests/multi-tenant-isolation.test.js`

### 13.4 Testing Procedures & Acceptance Criteria
- [ ] Automated cross-tenant penetration tests verify that Organisation A's Administrator or Supervisor cannot read, modify, or subscribe to Organisation B's workers, cameras, devices, or incidents (`403`/`404`).
- [ ] RTSP camera passwords are stored encrypted at rest (`AES-256-GCM`) and masked in all API responses.

---

## PHASE 14: Subscription Plans, Usage Quotas, Invoicing & Razorpay Payment Integration

- **Current Status:** **`PENDING` (Future Commercial Phase)**
- **Milestone Category:** Future Commercial SaaS Platform
- **Priority:** **`P3` (Commercial Layer)**
- **Dependencies:** Phase 13
- **Responsible Team Member:** Team Lead / Backend Engineer + Frontend Engineer

### 14.1 Objective
Implement subscription tier management (`Starter`, `Professional`, `Enterprise`), resource usage quota middleware (cameras, workers, sites), payment history, invoice generation, renewal reminders, and optional Razorpay payment gateway integration while strictly enforcing the **Safety Continuity Rule on Expiry**.

### 14.2 Exact Implementation Tasks

1. **Task 14.1 — Subscription, Payment & Invoice Models (`backend/src/models/`):**
   - `Subscription.model.js`: `organisationId`, `planTier` (`"STARTER" | "PROFESSIONAL" | "ENTERPRISE"`), `billingCycle` (`"MONTHLY" | "YEARLY"`), `status` (`"TRIALING" | "ACTIVE" | "PAST_DUE" | "EXPIRED"`), `limits: { maxSites, maxCameras, maxWorkers }`, `currentPeriodStart`, `currentPeriodEnd`.
   - `PaymentTransaction.model.js` & `Invoice.model.js` (`invoiceNumber`, `organisationId`, `amount`, `currency`, `taxAmount`, `billingPeriod`, `paidAt`, `lineItems`).

2. **Task 14.2 — Safety-Preserving Quota Middleware (`backend/src/middleware/subscriptionQuota.middleware.js`):**
   - Apply quota checks **only** on administrative creation endpoints (`POST /api/sites`, `POST /api/cameras`, `POST /api/workers`).
   - **CRITICAL SAFETY RULE ENFORCEMENT:** Never attach subscription blocking middleware to `POST /api/detections`, `POST /api/rfid/scan`, `POST /api/sensors/events`, `POST /api/devices/heartbeat`, the 120-second warning & speaker service, the critical emergency & manual SOS service, or `GET /api/incidents`.

3. **Task 14.3 — Billing, Invoicing & Razorpay Integration (`backend/src/controllers/billing.controller.js`):**
   - `GET /api/subscriptions/plans` & `GET /api/subscriptions/current` (returns active plan, expiry date, and usage counters `camerasUsed / maxCameras`, `workersUsed / maxWorkers`).
   - `POST /api/billing/checkout` & `POST /api/billing/webhooks/razorpay` (verifies `x-razorpay-signature` via `HMAC-SHA256`, activates subscription, records transaction, and generates invoice).
   - `GET /api/billing/invoices` & `GET /api/billing/invoices/:id/download`.
   - Build Frontend Pricing Page and Organisation Billing & Quotas tab.

### 14.3 Expected Deliverables
- `Subscription`, `PaymentTransaction`, `Invoice` models
- `backend/src/middleware/subscriptionQuota.middleware.js`
- `backend/src/controllers/billing.controller.js` & routes
- Frontend Pricing & Billing screens
- `backend/tests/subscription-and-safety-continuity.test.js`

### 14.4 Testing Procedures & Acceptance Criteria
- [ ] **Quota Enforcement Test:** `Starter` organisation attempting to register a 5th camera (above 4-camera quota) receives `403 QUOTA_EXCEEDED`.
- [ ] **Safety Continuity Regression Test:** Set an organisation's subscription to `status: "EXPIRED"`; submit a camera PPE `VIOLATION` and a `FLAME` emergency; verify that the speaker warning, 120-second grace timer, critical emergency alert, Manual SOS summary, and `GET /api/incidents` all succeed (`200`/`201`) without interruption.

---

## PHASE 15: Production Containerization, Optional Blockchain Anchoring & Industrial Pilot

- **Current Status:** **`PENDING` (Future Commercial Phase)**
- **Milestone Category:** Production & Pilot Deployment
- **Priority:** **`P3` (Long-Term)**
- **Dependencies:** Phases 12, 13, 14
- **Responsible Team Member:** All Team Members

### 15.1 Objective
Package the cloud SaaS platform and local Edge Agent for reproducible deployment, conduct multi-shift industrial pilot testing, and optionally connect the off-chain SHA-256 `recordHash` ledger to an on-chain smart contract registry.

### 15.2 Exact Implementation Tasks
1. **Task 15.1 — Containerization & Production Safeguards:** Create `Dockerfile`s and `docker-compose.yml` for the Backend, Frontend, local MongoDB, and Edge Agent with TLS/HTTPS reverse proxy configuration, automated daily DB backup cron, and health check probes.
2. **Task 15.2 — Optional Blockchain Hash Anchoring (`/api/blockchain/record`, `/api/blockchain/verify/:incidentId`):** Anchor already-computed SHA-256 `recordHash` values onto an EVM testnet smart contract and save `blockchainTxHash` (never putting PII or images on-chain).
3. **Task 15.3 — Industrial Pilot Trial:** Execute a multi-hour soak test with live cameras and ESP32 nodes; measure end-to-end latency, false-positive suppression rate, and offline-to-online sync reliability.

### 15.3 Expected Deliverables
- `docker-compose.yml` & deployment runbooks
- Optional `blockchain.service.js` smart contract connector
- Pilot evaluation report

### 15.4 Acceptance Criteria
- [ ] End-to-end local alert latency from critical emergency trigger to supervisor dashboard notification is `< 2 seconds`.
- [ ] Zero data loss across simulated power/internet cycling during pilot testing.

---

## 16. Master Phase Execution Summary Table

| Phase | Phase Title | Horizon | Priority | Status | Primary Owner | Key Verification Gate |
|---|---|---|---|---|---|---|
| **Phase 1** | Audit, Canonical Docs & Backend Foundation (`User`, `Zone`, `Worker`, `ZoneAssignment`, Auth, RBAC) | `[FIRST-EVAL]` | `P0` | **`COMPLETED`** | `[LEAD / BACKEND]` | `foundation.test.js` (`10/10` Pass) |
| **Phase 2** | Remaining 8 DB Models, Admin Write CRUD & `AuditLog` Service | `[FIRST-EVAL]` | `P0` | **`COMPLETED`** | `[LEAD / BACKEND]` | `admin-crud.test.js` (`6/6` Pass) |
| **Phase 3** | Device Registry, `X-Device-Key` Auth, RFID Scan & Sensor Ingestion APIs | `[FIRST-EVAL]` | `P0` | **`COMPLETED`** | `[LEAD / BACKEND]` | `hardware-ingestion.test.js` (`7/7` Pass: `T01`–`T05`, `T12`, `T15`) |
| **Phase 4** | Camera Registry, ML Detection Ingestion & 6-Stage False-Detection Filter (`SAFE`/`VIOLATION`/`UNCERTAIN`) | `[FIRST-EVAL]` | `P0` | **`PENDING` (Next)** | `[ML-ENG]` + `[LEAD]` | `ml-detection.test.js` (`T06`, `T07`) + FPR/FNR Benchmark |
| **Phase 5** | 120-Second Grace Period Engine, Local Speaker Warning, Supervisor Verification & SHA-256 Hash Chain | `[FIRST-EVAL]` | `P0` | **`PENDING`** | `[LEAD / BACKEND]` | `warning-and-incidents.test.js` (`T08`–`T10`, `T16`, `T17`) |
| **Phase 6** | Zero-Delay Critical Emergency Workflow (Flame, Fire, Fall) & Manual SOS Generator | `[FIRST-EVAL]` | `P0` | **`PENDING`** | `[LEAD / BACKEND]` | `emergency-workflow.test.js` (0s delay + SOS payload) |
| **Phase 7** | ESP32 Non-Blocking Firmware (RC522 + Smoke + Flame + Heartbeat) & Demo Simulator | `[FIRST-EVAL]` | `P0` | **`PENDING`** | `[IOT-ENG]` + `[LEAD]` | Hardware Bench Test + `demo-simulator.js` |
| **Phase 8** | Real-Time Socket.IO Server, VAPID Web Push & Dashboard Analytics APIs | `[FIRST-EVAL]` | `P0` | **`PENDING`** | `[LEAD / BACKEND]` | `realtime-and-dashboard.test.js` (`T13`, `T14`) |
| **Phase 9** | Role-Based Frontend Dashboards (Admin, Supervisor 120s/SOS Console & Worker Portal) | `[FIRST-EVAL]` | `P0` | **`PENDING`** | `[FE-ENG]` + `[LEAD]` | 3-Role Live Browser Walkthrough |
| **Phase 10** | Offline-First Edge Operation & Startup 120-Second Timer Recovery | `[PROTOTYPE]` | `P0` / `P1` | **`PENDING`** | `[LEAD / BACKEND]` | `offline-recovery.test.js` + LAN Air-Gap Test |
| **Phase 11** | Online Cloud Synchronisation (`SyncOutbox` & Idempotent Batch Replay) | `[PROTOTYPE]` | `P1` | **`PENDING`** | `[LEAD / BACKEND]` | `cloud-sync.test.js` (0 duplicate records on replay) |
| **Phase 12** | Complete E2E Test Suite (`T01`–`T17`), Demo Seed Script & First Evaluation Package | `[FIRST-EVAL]` | `P0` | **`IN PROGRESS`** | All Team Members | `npm --prefix backend test` (All 9 test suites Pass) |
| **Phase 13** | Multi-Organisation SaaS (`organisationId`), 11-Step Onboarding Wizard & RTSP Edge Agent | `[COMMERCIAL-SAAS]` | `P2` | **`PENDING` (Future)** | `[LEAD]` + `[FE-ENG]` | `multi-tenant-isolation.test.js` |
| **Phase 14** | Subscription Tiers (`Starter`/`Pro`/`Enterprise`), Quotas, Invoicing & Razorpay | `[COMMERCIAL-SAAS]` | `P3` | **`PENDING` (Future)** | `[LEAD]` + `[FE-ENG]` | `subscription-and-safety-continuity.test.js` |
| **Phase 15** | Production Docker Deployment, Optional Blockchain Anchoring & Industrial Pilot | `[COMMERCIAL-SAAS]` | `P3` | **`PENDING` (Future)** | All Team Members | Multi-Shift Pilot Soak Test |
