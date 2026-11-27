# Testing Strategy & Test Plan — SmartPPE

**Status:** Proposed Verification & Test Plan (Actual Test Execution Results Pending Code Integration)

---

## 1. Goals

Verify hardware communication, ML detection ingestion, backend validation, deduplication cooldowns, three-tier RBAC permissions (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`), supervisor zone isolation, SHA-256 tamper-evident incident integrity, and real-time dashboard updates for **SmartPPE — Warden's Eye**.

> **Honest Reporting Rule:** No automated test scripts or test execution logs currently exist in the repository because source code has not yet been integrated. All test cases below currently have an execution status of **`NOT EXECUTED / PENDING IMPLEMENTATION`**. Never record a test as `PASS` until verified against running code.

---

## 2. Test Environments

- **Unit Tests:** Isolated functions (payload validation, SHA-256 canonical hashing, cooldown window evaluator, RBAC helpers).
- **Integration Tests:** Backend REST and WebSocket endpoints tested against a dedicated test database.
- **Hardware Bench Tests:** ESP32, 3.3V SPI MFRC522 reader, 13.56 MHz RFID cards, and supplementary smoke/flame sensor modules on a controlled lab bench.
- **End-to-End (E2E) Demo Environment:** Labelled test users (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`), test workplace zones (`ZONE_A`, `ZONE_B`), registered `ESP32_001` and `CAM_001`, and live browser dashboards.

---

## 3. Canonical Functional & Security Test Cases

| ID | Category | Test Case Description | Input / Trigger | Expected Result | Current Status |
|---|---|---|---|---|---|
| **T01** | RFID | Scan registered 13.56 MHz RFID card | `POST /api/rfid/scan` with valid `X-Device-Key`, `deviceCode: "ESP32_001"`, registered `rfidUid: "A1B2C3D4"` | `200 OK`, `recognized: true`, `scanStatus: "SUCCESS"`, worker details resolved, `rfidLogs` entry saved, `rfid:scan` emitted | `PASS (Verified in hardware-ingestion.test.js)` |
| **T02** | RFID | Scan unknown RFID card | `POST /api/rfid/scan` with unregistered `rfidUid: "DEADBEEF"` | `200 OK`, `recognized: false`, `scanStatus: "UNKNOWN_CARD"`, no worker auto-created, `"UNKNOWN_RFID"` incident generated per policy | `PASS (Verified in hardware-ingestion.test.js)` |
| **T03** | Security | Submit hardware event from unknown/unauthenticated device | `POST /api/rfid/scan` or `/api/sensors/events` with missing/invalid `X-Device-Key` or unregistered `deviceCode` | Rejected with `401 Unauthorized` or `403 Forbidden`; no event stored | `PASS (Verified in hardware-ingestion.test.js)` |
| **T04** | Sensors | Submit valid supplementary smoke hazard event | `POST /api/sensors/events` with `sensorType: "SMOKE"`, `sensorValue: 1850`, `threshold: 1500`, `alertStatus: "CRITICAL"` | `201 Created`, event stored in `sensorEvents`, `"SMOKE_DETECTED"` incident created (`CRITICAL`/`HIGH`), `sensor:alert` emitted | `PASS (Verified in hardware-ingestion.test.js)` |
| **T05** | Sensors | Submit valid supplementary flame hazard event | `POST /api/sensors/events` with `sensorType: "FLAME"`, `alertStatus: "CRITICAL"` | `201 Created`, event stored in `sensorEvents`, `"FLAME_DETECTED"` incident created (`CRITICAL`), `sensor:alert` emitted | `PASS (Verified in hardware-ingestion.test.js)` |
| **T06** | ML / PPE | Submit valid `"UNSAFE"` PPE detection | `POST /api/detections` with valid `X-ML-Service-Key`, `cameraCode: "CAM_001"`, `missingPPE: ["safety_vest"]`, `safetyStatus: "UNSAFE"`, `workerId: null` | `201 Created`, stored in `ppeDetections` with `workerId: null`, `"MISSING_SAFETY_VEST"` incident created in `CAM_001`'s zone | `PENDING` |
| **T07** | Validation | Submit invalid ML confidence score | `POST /api/detections` with `overallConfidence: 1.35` or `-0.1` | Rejected with `400 Bad Request` (`INVALID_PAYLOAD`) | `PENDING` |
| **T08** | Incident / RBAC | Incident visibility across roles | Create incident in `ZONE_A` (`zone_01`) | Visible to `ADMINISTRATOR` and `SUPERVISOR` assigned to `ZONE_A`; hidden (`403`/filtered out) from `SUPERVISOR` assigned only to `ZONE_B` | `PENDING` |
| **T09** | Verification | Supervisor verifies assigned-zone incident | `POST /api/supervisor/incidents/:id/verify` by `ZONE_A` Supervisor with `verificationStatus: "VERIFIED"` and `verificationNotes` | `200 OK`, status becomes `"VERIFIED"`, `verifiedBy`/`verifiedAt` populated, SHA-256 `recordHash` & `previousHash` computed, `auditLogs` entry written | `PENDING` |
| **T10** | Security / RBAC | Supervisor attempts cross-zone access (IDOR check) | `ZONE_A` Supervisor calls `GET /api/zones/:zoneBId` or `GET /api/workers/:zoneBWorkerId` | Rejected with `403 Forbidden` (`ZONE_ACCESS_DENIED`) | `PASS (Verified in foundation.test.js)` |
| **T11** | Security / RBAC | Administrator views and manages all zones | `ADMINISTRATOR` calls `GET /api/zones` and `GET /api/workers` | `200 OK` with system-wide data across all workplace zones | `PASS (Verified in foundation.test.js)` |
| **T12** | Reliability | ESP32 device heartbeat timeout detection | Stop sending `POST /api/devices/heartbeat` from `ESP32_001` for $> 90\text{ s}$ | Backend transitions `ESP32_001` status from `"ONLINE"` to `"OFFLINE"` and emits `device:status` | `PASS (Verified in hardware-ingestion.test.js)` |
| **T13** | Real-Time | Real-time WebSocket dashboard push | Connected Supervisor dashboard listens while `POST /api/detections` triggers a new incident | Dashboard receives `incident:new` and updates UI in $< 1\text{ s}$ without page reload | `PENDING` |
| **T14** | Security | Unauthorized worker list or cross-worker access | `WORKER` calls `GET /api/workers` or `GET /api/workers/:otherWorkerId` | Rejected with `403 Forbidden` | `PASS (Verified in foundation.test.js)` |
| **T15** | Cooldown | Duplicate RFID scan suppression within cooldown window | Scan `rfidUid: "A1B2C3D4"` twice on `ESP32_001` within 3 seconds | Second scan returns `duplicateIgnored: true` (`scanStatus: "DUPLICATE_IGNORED"`) without creating duplicate check-in notifications | `PASS (Verified in hardware-ingestion.test.js)` |
| **T16** | Cooldown | ML frame-flooding incident deduplication | Send 10 rapid `"UNSAFE"` `MISSING_HELMET` detections from `CAM_001` within 15 seconds | All 10 detections logged in `ppeDetections`, but only **1** open `"MISSING_HELMET"` incident is created with `occurrenceCount: 10` | `PENDING` |
| **T17** | Integrity | SHA-256 tamper-evident incident verification (Capability #6) | Verify an incident (`T09`), call `GET /api/incidents/:id/verify-integrity` (`integrityValid: true`), then directly alter `description` or `status` in the database and call `verify-integrity` again | Second call returns `integrityValid: false` (`storedRecordHash != computedRecordHash`), proving tamper detection | `PENDING` |

---

## 4. Hardware Verification Checklist

1. **3.3 V Power & Wiring Check:** Verify with a multimeter or visual pin trace that RC522 `3.3V` is connected to ESP32 `3V3` (never `5V`/`VIN`) and SPI pins match [`docs/HARDWARE_SETUP.md`](HARDWARE_SETUP.md) (`RST->22`, `SDA/SS->5`, `SCK->18`, `MOSI->23`, `MISO->19`).
2. **Sensor `ADC1` & 3.3 V Limit Check:** Confirm smoke and flame analog outputs are wired to ESP32 `ADC1` pins (`GPIO 32–39`) so Wi-Fi operation does not break `analogRead()`, and confirm input voltage cannot exceed `3.3 V`.
3. **Card Compatibility Check:** Test at least two registered 13.56 MHz tags and one unregistered tag (`T01`, `T02`).
4. **Controlled Sensor Trigger Check:** Safely trigger smoke and flame thresholds under lab safety rules and confirm debounced payload delivery (`T04`, `T05`).
5. **Wi-Fi Drop & Reconnect Check:** Disable and re-enable Wi-Fi hotspot; confirm the ESP32 reconnects automatically and resumes 30-second heartbeats.

---

## 5. ML Verification Checklist

1. Confirm the ML model's supported class labels and normalize them to the canonical payload schema in [`docs/ML_INTEGRATION.md`](ML_INTEGRATION.md).
2. Confirm `workerId` is sent as `null` for camera-only detections.
3. Verify confidence validation (`0.0..1.0`), `idempotencyKey` retry handling, and frame persistence filtering.
4. Record observed false positives and false negatives on test video frames.

---

## 6. Test Evidence Recording Template & Executed Foundation Tests

### 6.1 Executed Backend Foundation Test Suite (`backend/tests/foundation.test.js`)

Command executed: `npm --prefix backend test` (`10 suites/tests, 10 passed, 0 failed`):

| Test # | Date | Build / Phase | Test Description | Actual Result | Status |
|---|---|---|---|---|---|
| `F01` | 2026-11-25 | Backend Foundation | Database Connection & `GET /api/health` verification | Mongoose connected (`readyState: 1`), `/api/health` returned `200 OK` | **PASS** |
| `F02` | 2026-11-25 | Backend Foundation | Registration Zod validation (invalid email, short password, invalid role) | Rejected with `400 Bad Request` (`VALIDATION_ERROR`) | **PASS** |
| `F03` | 2026-11-25 | Backend Foundation | Bootstrap first `ADMINISTRATOR` & verify `bcryptjs` password hashing | `201 Created`, `passwordHash` omitted from JSON, stored as `$2a$` bcrypt hash in DB | **PASS** |
| `F04` | 2026-11-25 | Backend Foundation | Successful login (`POST /api/auth/login`) & invalid credentials rejection | Valid login returned JWT (`200 OK`); invalid password/email returned `401 INVALID_CREDENTIALS` | **PASS** |
| `F05` | 2026-11-25 | Backend Foundation | JWT verification on `GET /api/auth/me` and `GET /api/users/me` | Missing/invalid token rejected with `401`; valid token returned user profile (`200 OK`) | **PASS** |
| `F06` | 2026-11-25 | Backend Foundation | Role-based registration policy (prevent unauthenticated or Supervisor user creation) | Unauthenticated (`401`) and Supervisor (`403 FORBIDDEN`) registration attempts blocked | **PASS** |
| `F07` | 2026-11-25 | Backend Foundation | Foundation models (`Zone`, `ZoneAssignment`, `Worker`) & unique RFID constraint | Models seeded; duplicate `rfidUid` rejected with MongoDB `E11000` unique error | **PASS** |
| `F08` | 2026-11-25 | Backend Foundation | Worker access restrictions (`GET /api/workers`, `/me`, `/:id` IDOR check) | `GET /api/workers` -> `403`; `/me` & `/:ownId` -> `200`; `/:otherWorkerId` -> `403 FORBIDDEN` | **PASS** |
| `F09` | 2026-11-25 | Backend Foundation | Supervisor zone isolation & Administrator system-wide access (`T10`, `T11`) | Zone A Supervisor saw only Zone A & Worker 1 (`403` on Zone B / Worker 2); Admin saw all | **PASS** |
| `F10` | 2026-11-25 | Backend Foundation | Token logout revocation (`POST /api/auth/logout`) & `404` route handler | Revoked token rejected with `401 TOKEN_REVOKED`; unknown route returned `404 ROUTE_NOT_FOUND` | **PASS** |

Do not mark any feature or capability as `IMPLEMENTED AND VERIFIED` based solely on UI mockups or documentation—verify the underlying database records, HTTP responses, and authorization checks.
