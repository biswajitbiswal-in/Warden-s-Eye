# DATABASE SCHEMA
## SmartPPE — Warden's Eye

**Document Type:** Canonical Proposed Logical Database Schema  
**Project:** SmartPPE — AI & IoT-Based Workplace Safety Monitoring System  
**Status:** Proposed Logical Schema (Not Yet Implemented in Repository Code)

---

## 1. Purpose

This document defines the **canonical proposed logical database structure** for **SmartPPE — Warden's Eye**.

The database stores and manages:
- User login accounts and roles (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`).
- Workplace employee/worker profiles and their optional link to login accounts.
- 13.56 MHz RFID card assignments and checkpoint scan records.
- Workplace operational zones and supervisor zone assignments.
- ESP32 IoT devices, hashed authentication credentials (`apiKeyHash`), and heartbeat statuses.
- Camera sources and operational statuses.
- AI-based camera PPE detection records.
- Supplementary smoke and flame sensor events.
- Safety incidents, supervisor verification/resolution records, and SHA-256 tamper-evident hash chains.
- Supporting incident evidence references and file hashes.
- Immutable system audit logs.

> **Important Implementation Note:** No database models or migrations currently exist in the repository codebase. This schema is clearly labeled as a **proposed logical design** that can be implemented in a document database (such as MongoDB/Mongoose using `ObjectId` / UUIDs) or a relational database (such as PostgreSQL using UUID / foreign keys) depending on the team's confirmed backend stack. Do not create duplicate databases.

---

## 2. Database Design Principles

1. **Unique Primary Identifiers:** Every record has a unique primary identifier (`userId`, `workerId`, `zoneId`, etc.).
2. **Unique Hardware & Employee Codes:** Active RFID UIDs (`rfidUid`), employee codes (`employeeCode`), device codes (`deviceCode`), camera codes (`cameraCode`), and zone codes (`zoneCode`) must be uniquely constrained.
3. **Consistent Timestamp Conventions:**
   - `occurredAt`: Physical occurrence timestamp of an RFID scan, camera frame detection, sensor event, or audit action.
   - `createdAt` / `updatedAt`: Database record creation and modification timestamps.
   - `lastHeartbeat`: Most recent heartbeat or event reception timestamp for a device or camera.
4. **No Plaintext Secrets:** User passwords (`passwordHash`) and ESP32 device keys (`apiKeyHash`) must always be stored as cryptographic hashes—never raw plaintext.
5. **Strict Zone Isolation:** Supervisors are mapped to specific zones via `zoneAssignments` and can only query records belonging to their assigned `zoneId`s.
6. **Tamper-Evident Incident History:** Verified, rejected, and resolved incidents preserve their verification metadata (`verifiedBy`, `verifiedAt`, `verificationNotes`, `resolutionNotes`) and cryptographic SHA-256 hash chain (`recordHash`, `previousHash`).
7. **Off-Chain Media Storage:** Snapshot images and video clips are stored in private file/object storage, while only their path (`evidenceUrl`) and SHA-256 integrity digest (`fileHash`) are stored in the database.

---

## 3. Summary of the 12 Canonical Database Entities

| # | Entity Name | Collection / Table Name | Purpose |
|---|---|---|---|
| 1 | **Users** | `users` | Login accounts and system roles (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`) |
| 2 | **Workers** | `workers` | Worker profiles, RFID card mappings, assigned zone, and optional link to `users` |
| 3 | **Zones** | `zones` | Workplace operational zones (e.g., Assembly Zone A, Warehouse Zone B) |
| 4 | **Zone Assignments** | `zoneAssignments` | Maps supervisors to the workplace zones they monitor |
| 5 | **Devices** | `devices` | ESP32 nodes, `deviceCode`, `apiKeyHash`, assigned zone, and heartbeat status |
| 6 | **Cameras** | `cameras` | Camera sources, `cameraCode`, assigned zone, and operational status |
| 7 | **RFID Logs** | `rfidLogs` | Worker RFID scan events and unknown-card events |
| 8 | **PPE Detections** | `ppeDetections` | Camera-based AI PPE detection records |
| 9 | **Sensor Events** | `sensorEvents` | Supplementary smoke and flame sensor events |
| 10 | **Incidents** | `incidents` | Safety incidents, supervisor verification/resolution fields, and SHA-256 hash chain |
| 11 | **Incident Evidence** | `incidentEvidence` | Supporting snapshot/data references and SHA-256 file hashes |
| 12 | **Audit Logs** | `auditLogs` | System-wide audit trail of authentication, verification, and admin actions |

---

## 4. Entity 1: Users (`users`)

Stores authentication accounts for Administrators, Supervisors, and Workers who log into the web dashboard.

| Field | Type | Required | Constraints / Default | Description |
|---|---|---|---|---|
| `userId` | UUID / ObjectId | **Required** | Primary Key | Unique user account identifier |
| `name` | String | **Required** | Non-empty | Full name of the user |
| `email` | String | **Required** | **Unique**, lowercase | Login email address |
| `passwordHash` | String | **Required** | Non-empty | Bcrypt / Argon2id password hash (never plaintext) |
| `role` | String (Enum) | **Required** | `"WORKER"` \| `"SUPERVISOR"` \| `"ADMINISTRATOR"` | Assigned system authorization role |
| `status` | String (Enum) | **Required** | Default: `"ACTIVE"` (`"ACTIVE"` \| `"INACTIVE"` \| `"SUSPENDED"`) | Account lifecycle status |
| `createdAt` | Timestamp | **Required** | Auto-generated | Account creation timestamp |
| `updatedAt` | Timestamp | **Required** | Auto-updated | Last modification timestamp |

---

## 5. Entity 2: Workers (`workers`)

Stores workplace employee profiles and maps each worker to their 13.56 MHz RFID card, primary workplace zone, and optional `users` account.

| Field | Type | Required | Constraints / Default | Description |
|---|---|---|---|---|
| `workerId` | UUID / ObjectId | **Required** | Primary Key | Unique worker record identifier |
| `userId` | UUID / ObjectId / Null | Optional | Nullable **Unique** FK -> `users.userId` | Links this worker profile to a `WORKER` login account so the worker can access `/api/workers/me` and personal incidents |
| `employeeCode` | String | **Required** | **Unique** (e.g., `"EMP-001"`) | Human-readable employee badge/ID number |
| `name` | String | **Required** | Non-empty | Full name of the worker |
| `department` | String | **Required** | e.g., `"Assembly"`, `"Logistics"` | Worker's operational department |
| `designation` | String | Optional | e.g., `"Technician"`, `"Operator"` | Worker's job title / role description |
| `rfidUid` | String / Null | Optional | **Unique** when non-null (uppercase hex `^[0-9A-F]{8,20}$`) | Assigned 13.56 MHz RFID card UID |
| `zoneId` | UUID / ObjectId | **Required** | FK -> `zones.zoneId` | Worker's primary assigned workplace zone |
| `lastSeenZoneId` | UUID / ObjectId / Null | Optional | FK -> `zones.zoneId` | Most recent workplace zone where the worker scanned their RFID card |
| `lastRfidScanAt` | Timestamp / Null | Optional | Nullable | Timestamp of the worker's most recent valid RFID scan |
| `status` | String (Enum) | **Required** | Default: `"ACTIVE"` (`"ACTIVE"` \| `"INACTIVE"`) | Employment / active monitoring status |
| `createdAt` | Timestamp | **Required** | Auto-generated | Registration timestamp |
| `updatedAt` | Timestamp | **Required** | Auto-updated | Last modification timestamp |

---

## 6. Entity 3: Zones (`zones`)

Stores workplace and industrial zone definitions.

| Field | Type | Required | Constraints / Default | Description |
|---|---|---|---|---|
| `zoneId` | UUID / ObjectId | **Required** | Primary Key | Unique zone identifier |
| `zoneCode` | String | **Required** | **Unique** (e.g., `"ZONE_A"`) | Short unique zone code |
| `zoneName` | String | **Required** | Non-empty | Descriptive name (e.g., `"Assembly Zone A"`, `"Warehouse Zone B"`, `"Restricted Electrical Room C"`) |
| `description` | String | Optional | Nullable | Location and required PPE rules description |
| `status` | String (Enum) | **Required** | Default: `"ACTIVE"` (`"ACTIVE"` \| `"INACTIVE"`) | Operational status of the zone |
| `createdAt` | Timestamp | **Required** | Auto-generated | Creation timestamp |
| `updatedAt` | Timestamp | **Required** | Auto-updated | Last modification timestamp |

---

## 7. Entity 4: Zone Assignments (`zoneAssignments`)

Maps Supervisors to the workplace zones they are authorized to monitor and verify incidents within.

| Field | Type | Required | Constraints / Default | Description |
|---|---|---|---|---|
| `assignmentId` | UUID / ObjectId | **Required** | Primary Key | Unique assignment identifier |
| `userId` | UUID / ObjectId | **Required** | FK -> `users.userId` | Assigned Supervisor user account |
| `zoneId` | UUID / ObjectId | **Required** | FK -> `zones.zoneId` | Assigned workplace zone |
| `assignedBy` | UUID / ObjectId | **Required** | FK -> `users.userId` | Administrator who created the assignment |
| `status` | String (Enum) | **Required** | Default: `"ACTIVE"` (`"ACTIVE"` \| `"INACTIVE"`) | Assignment status |
| `assignedAt` | Timestamp | **Required** | Auto-generated | Assignment creation timestamp |

- **Constraint:** Compound unique index on `(userId, zoneId)` for active assignments.

---

## 8. Entity 5: Devices (`devices`)

Stores registered ESP32 hardware nodes, their zone mapping, hashed authentication credentials, and connectivity state.

| Field | Type | Required | Constraints / Default | Description |
|---|---|---|---|---|
| `deviceId` | UUID / ObjectId | **Required** | Primary Key | Unique database identifier |
| `deviceCode` | String | **Required** | **Unique** (e.g., `"ESP32_001"`) | Unique hardware identifier sent in `X-Device-Code` and payloads |
| `deviceName` | String | **Required** | Non-empty | Descriptive label (e.g., `"Assembly Zone A Checkpoint Node"`) |
| `deviceType` | String | **Required** | Default: `"ESP32"` | Hardware node type |
| `zoneId` | UUID / ObjectId | **Required** | FK -> `zones.zoneId` | Workplace zone where the ESP32 is installed |
| `apiKeyHash` | String | **Required** | Non-empty cryptographic hash | Hashed device API secret used to verify `X-Device-Key` (never store raw device secrets) |
| `firmwareVersion` | String / Null | Optional | e.g., `"1.0.0"` | Last reported ESP32 firmware version |
| `status` | String (Enum) | **Required** | Default: `"OFFLINE"` (`"ONLINE"` \| `"OFFLINE"` \| `"MAINTENANCE"`) | Current connectivity / operational state |
| `lastHeartbeat` | Timestamp / Null | Optional | Indexed | Timestamp of last heartbeat or valid event received from the device |
| `createdAt` | Timestamp | **Required** | Auto-generated | Registration timestamp |
| `updatedAt` | Timestamp | **Required** | Auto-updated | Last modification timestamp |

---

## 9. Entity 6: Cameras (`cameras`)

Stores camera metadata for AI-based PPE monitoring across workplace zones.

| Field | Type | Required | Constraints / Default | Description |
|---|---|---|---|---|
| `cameraId` | UUID / ObjectId | **Required** | Primary Key | Unique database identifier |
| `cameraCode` | String | **Required** | **Unique** (e.g., `"CAM_001"`) | Unique camera code sent by the ML service |
| `cameraName` | String | **Required** | Non-empty | Descriptive camera name |
| `zoneId` | UUID / ObjectId | **Required** | FK -> `zones.zoneId` | Workplace zone monitored by this camera |
| `locationDescription` | String | Optional | Nullable | Physical mounting location description |
| `status` | String (Enum) | **Required** | Default: `"OFFLINE"` (`"ONLINE"` \| `"OFFLINE"` \| `"MAINTENANCE"`) | Operational status |
| `lastHeartbeat` | Timestamp / Null | Optional | Nullable | Timestamp of most recent detection or status ping |
| `createdAt` | Timestamp | **Required** | Auto-generated | Registration timestamp |
| `updatedAt` | Timestamp | **Required** | Auto-updated | Last modification timestamp |

---

## 10. Entity 7: RFID Logs (`rfidLogs`)

Stores every RFID scan event transmitted by ESP32 + MFRC522 readers (`POST /api/rfid/scan`).

| Field | Type | Required | Constraints / Default | Description |
|---|---|---|---|---|
| `logId` | UUID / ObjectId | **Required** | Primary Key | Unique RFID scan log identifier |
| `rfidUid` | String | **Required** | Indexed (uppercase hex) | Scanned 13.56 MHz card UID |
| `workerId` | UUID / ObjectId / Null | Optional | FK -> `workers.workerId` (`null` if unknown card) | Matched worker, or `null` if unrecognized |
| `deviceId` | UUID / ObjectId | **Required** | FK -> `devices.deviceId` | Source ESP32 device reference |
| `deviceCode` | String | **Required** | e.g., `"ESP32_001"` | Source ESP32 hardware code |
| `zoneId` | UUID / ObjectId | **Required** | FK -> `zones.zoneId` | Workplace zone where the scan occurred |
| `scanStatus` | String (Enum) | **Required** | `"SUCCESS"` \| `"UNKNOWN_CARD"` \| `"DUPLICATE_IGNORED"` \| `"REJECTED"` | Outcome of the scan validation |
| `occurredAt` | Timestamp | **Required** | Indexed | Timestamp when the scan occurred |
| `createdAt` | Timestamp | **Required** | Auto-generated | Database insertion timestamp |

---

## 11. Entity 8: PPE Detections (`ppeDetections`)

Stores AI-based PPE detection results received from the ML service (`POST /api/detections`).

| Field | Type | Required | Constraints / Default | Description |
|---|---|---|---|---|
| `detectionId` | UUID / ObjectId | **Required** | Primary Key | Unique detection identifier |
| `idempotencyKey` | String / Null | Optional | **Unique** when non-null | Optional frame/event key preventing duplicate retry ingestion |
| `cameraId` | UUID / ObjectId | **Required** | FK -> `cameras.cameraId` | Source camera database reference |
| `cameraCode` | String | **Required** | e.g., `"CAM_001"` | Source camera code |
| `zoneId` | UUID / ObjectId | **Required** | FK -> `zones.zoneId` | Workplace zone resolved from the camera |
| `workerId` | UUID / ObjectId / Null | Optional | FK -> `workers.workerId` (Default: `null`) | Associated worker **only** if reliably identified; otherwise `null` |
| `modelVersion` | String | **Required** | e.g., `"ppe-detector-v1"` | ML model identifier/version for traceability |
| `detections` | JSON Array | **Required** | Array of `{ classLabel, confidence, bbox }` | Detected object classes, confidences (`0.0..1.0`), and bounding boxes |
| `missingPPE` | Array of Strings | **Required** | e.g., `["helmet"]`, `["safety_vest"]`, or `[]` | List of missing required PPE items in the frame |
| `safetyStatus` | String (Enum) | **Required** | `"SAFE"` \| `"UNSAFE"` \| `"REVIEW_REQUIRED"` | Evaluated compliance state of the detection |
| `overallConfidence` | Number | **Required** | Float `0.0` to `1.0` | Overall/triggering detection confidence score |
| `evidenceUrl` | String / Null | Optional | Nullable | Private storage reference to the violation snapshot image |
| `occurredAt` | Timestamp | **Required** | Indexed | Frame capture / detection timestamp |
| `createdAt` | Timestamp | **Required** | Auto-generated | Database insertion timestamp |

---

## 12. Entity 9: Sensor Events (`sensorEvents`)

Stores supplementary smoke and flame sensor events received from ESP32 nodes (`POST /api/sensors/events`).

| Field | Type | Required | Constraints / Default | Description |
|---|---|---|---|---|
| `eventId` | UUID / ObjectId | **Required** | Primary Key | Unique sensor event identifier |
| `deviceId` | UUID / ObjectId | **Required** | FK -> `devices.deviceId` | Source ESP32 database reference |
| `deviceCode` | String | **Required** | e.g., `"ESP32_001"` | Source ESP32 hardware code |
| `zoneId` | UUID / ObjectId | **Required** | FK -> `zones.zoneId` | Workplace zone resolved from the ESP32 device |
| `sensorType` | String (Enum) | **Required** | `"SMOKE"` \| `"FLAME"` | Type of supplementary environmental sensor |
| `sensorValue` | Number | **Required** | Numeric | Measured sensor output value (analog ADC or digital `0`/`1`) |
| `threshold` | Number | **Required** | Numeric | Configured threshold compared against `sensorValue` |
| `alertStatus` | String (Enum) | **Required** | `"NORMAL"` \| `"WARNING"` \| `"CRITICAL"` | Evaluated hazard alert state |
| `occurredAt` | Timestamp | **Required** | Indexed | Sensor reading timestamp |
| `createdAt` | Timestamp | **Required** | Auto-generated | Database insertion timestamp |

---

## 13. Entity 10: Incidents (`incidents`)

Stores safety incidents generated from PPE violations, smoke/flame sensor alerts, unknown RFID scans, or manual supervisor reports, including full verification metadata and SHA-256 tamper-evident hash chaining.

| Field | Type | Required | Constraints / Default | Description |
|---|---|---|---|---|
| `incidentId` | UUID / ObjectId | **Required** | Primary Key | Unique incident identifier |
| `incidentType` | String (Enum) | **Required** | `"MISSING_HELMET"` \| `"MISSING_SAFETY_VEST"` \| `"MULTIPLE_PPE_VIOLATION"` \| `"SMOKE_DETECTED"` \| `"FLAME_DETECTED"` \| `"UNKNOWN_RFID"` | Category of safety incident |
| `severity` | String (Enum) | **Required** | `"LOW"` \| `"MEDIUM"` \| `"HIGH"` \| `"CRITICAL"` | Priority / risk severity level |
| `status` | String (Enum) | **Required** | Default: `"OPEN"` (`"OPEN"` \| `"UNDER_REVIEW"` \| `"VERIFIED"` \| `"RESOLVED"` \| `"REJECTED"`) | Current incident lifecycle state |
| `zoneId` | UUID / ObjectId | **Required** | FK -> `zones.zoneId` | Workplace zone where the incident occurred |
| `workerId` | UUID / ObjectId / Null | Optional | FK -> `workers.workerId` (`null` if unknown) | Associated worker, if reliably known or confirmed during verification |
| `sourceType` | String (Enum) | **Required** | `"CAMERA_DETECTION"` \| `"SENSOR_EVENT"` \| `"RFID_SCAN"` \| `"MANUAL"` | Subsystem that triggered the incident |
| `sourceId` | UUID / ObjectId / Null | Optional | FK to `ppeDetections`, `sensorEvents`, or `rfidLogs` | Primary key of the triggering event record |
| `deviceOrCameraCode` | String / Null | Optional | e.g., `"CAM_001"` or `"ESP32_001"` | Hardware or camera identifier that originated the alert |
| `description` | String | **Required** | Non-empty | Human-readable summary of the violation or hazard |
| `occurrenceCount` | Integer | **Required** | Default: `1` ($\ge 1$) | Count of repeated detections/triggers merged during the cooldown window |
| `assignedSupervisorId` | UUID / ObjectId / Null | Optional | FK -> `users.userId` | Responsible supervisor assigned to the zone/incident |
| `verifiedBy` | UUID / ObjectId / Null | Optional | FK -> `users.userId` | Supervisor or Administrator who verified or rejected the incident |
| `verifiedAt` | Timestamp / Null | Optional | Nullable | Timestamp when the incident was verified or rejected |
| `verificationNotes` | String / Null | Optional | Nullable | Supervisor notes recorded during verification or rejection |
| `resolvedBy` | UUID / ObjectId / Null | Optional | FK -> `users.userId` | Supervisor or Administrator who marked the incident resolved |
| `resolvedAt` | Timestamp / Null | Optional | Nullable | Timestamp when corrective action was completed |
| `resolutionNotes` | String / Null | Optional | Nullable | Notes describing the corrective action taken |
| `recordHash` | String / Null | Optional | 64-char hex SHA-256 digest | Canonical SHA-256 hash computed over the incident and evidence hashes upon verification/resolution |
| `previousHash` | String / Null | Optional | 64-char hex SHA-256 digest | `recordHash` of the preceding verified incident (forms a tamper-evident hash chain) |
| `blockchainTxHash` | String / Null | Optional | Nullable (Future Scope) | Reserved for on-chain transaction hash if future blockchain anchoring is enabled |
| `createdAt` | Timestamp | **Required** | Indexed | Incident creation timestamp |
| `updatedAt` | Timestamp | **Required** | Auto-updated | Last status or cooldown update timestamp |

### Purpose of Verification & Tamper-Evident Fields on `incidents`
- **`verifiedBy`, `verifiedAt`, `verificationNotes`:** Establish clear accountability for who reviewed the evidence, when the decision was made, and why an alert was confirmed (`VERIFIED`) or dismissed as a false positive (`REJECTED`).
- **`resolvedBy`, `resolvedAt`, `resolutionNotes`:** Track completion of physical corrective action in the workplace zone.
- **`recordHash` & `previousHash`:** Implement **Capability #6 (Tamper-Evident Incident Records)** using standard SHA-256 cryptography. Once an incident is verified or resolved, any unauthorized direct database edit to its fields or status will break the recomputed SHA-256 `recordHash` (and the chain of `previousHash` links) during `GET /api/incidents/:id/verify-integrity`.
- **`blockchainTxHash`:** Keeps future smart-contract hash anchoring cleanly decoupled as an optional nullable metadata column without claiming blockchain is currently active.

---

## 14. Entity 11: Incident Evidence (`incidentEvidence`)

Stores references and integrity hashes for supporting media or payload snapshots linked to an incident.

| Field | Type | Required | Constraints / Default | Description |
|---|---|---|---|---|
| `evidenceId` | UUID / ObjectId | **Required** | Primary Key | Unique evidence record identifier |
| `incidentId` | UUID / ObjectId | **Required** | FK -> `incidents.incidentId` | Parent incident reference |
| `evidenceType` | String (Enum) | **Required** | `"IMAGE"` \| `"VIDEO"` \| `"DETECTION_PAYLOAD"` \| `"SENSOR_PAYLOAD"` | Format of the supporting evidence |
| `evidenceUrl` | String | **Required** | Non-empty | Private storage key or authenticated access path |
| `fileHash` | String / Null | Optional | 64-char hex SHA-256 digest | SHA-256 hash of the evidence file bytes to detect file tampering |
| `uploadedBy` | UUID / ObjectId / Null | Optional | FK -> `users.userId` (`null` if auto-attached by ML/system) | User or system actor that attached the evidence |
| `createdAt` | Timestamp | **Required** | Auto-generated | Evidence attachment timestamp |

---

## 15. Entity 12: Audit Logs (`auditLogs`)

Tracks security-sensitive and administrative actions across the system. Audit records are append-only and must never be modified or deleted by application endpoints.

| Field | Type | Required | Constraints / Default | Description |
|---|---|---|---|---|
| `auditId` | UUID / ObjectId | **Required** | Primary Key | Unique audit log identifier |
| `actorId` | UUID / ObjectId / Null | Optional | FK -> `users.userId` (`null` for device/system actions) | User who performed the action |
| `actorRole` | String | **Required** | `"WORKER"` \| `"SUPERVISOR"` \| `"ADMINISTRATOR"` \| `"DEVICE"` \| `"ML_SERVICE"` \| `"SYSTEM"` | Role of the actor |
| `action` | String | **Required** | e.g., `"USER_LOGIN"`, `"WORKER_CREATED"`, `"INCIDENT_VERIFIED"`, `"INCIDENT_RESOLVED"`, `"ZONE_ASSIGNED"` | Standardized action code |
| `entityType` | String | **Required** | e.g., `"INCIDENT"`, `"WORKER"`, `"ZONE_ASSIGNMENT"`, `"DEVICE"` | Type of record affected |
| `entityId` | String / UUID | **Required** | Non-empty | Identifier of the affected record |
| `details` | JSON Object | Optional | Default: `{}` | Structured before/after metadata (never include raw passwords or API keys) |
| `occurredAt` | Timestamp | **Required** | Indexed | Timestamp when the action occurred |

---

## 16. Entity Relationship Diagram

```text
USERS (1) <---- (0..1) WORKERS (via workers.userId)
  |
  +---- (1..N) ZONE_ASSIGNMENTS (N..1) ----> ZONES (1)
  |                                            |
  +---- (1..N) AUDIT_LOGS                      +---- (1..N) WORKERS
                                               +---- (1..N) DEVICES
                                               +---- (1..N) CAMERAS
                                               +---- (1..N) RFID_LOGS
                                               +---- (1..N) PPE_DETECTIONS
                                               +---- (1..N) SENSOR_EVENTS
                                               +---- (1..N) INCIDENTS
                                                              |
                                                              +---- (1..N) INCIDENT_EVIDENCE
```

---

## 17. Required Indexes and Constraints

| Entity | Field(s) | Index / Constraint Type | Purpose |
|---|---|---|---|
| `users` | `email` | **Unique Index** | Prevent duplicate user accounts and speed up login lookup |
| `workers` | `employeeCode` | **Unique Index** | Enforce unique employee badge codes |
| `workers` | `rfidUid` | **Unique Sparse/Partial Index** | Ensure an active RFID card is assigned to at most one worker |
| `workers` | `userId` | **Unique Sparse/Partial Index** | Ensure a 1:1 link when a worker has a user login account |
| `zones` | `zoneCode` | **Unique Index** | Enforce unique workplace zone codes |
| `zoneAssignments` | `(userId, zoneId)` | **Compound Unique Index** | Prevent duplicate supervisor-to-zone assignments |
| `devices` | `deviceCode` | **Unique Index** | Fast ESP32 authentication & ingestion lookup |
| `cameras` | `cameraCode` | **Unique Index** | Fast ML detection ingestion lookup |
| `rfidLogs` | `(rfidUid, occurredAt DESC)` | **Compound Index** | Fast duplicate-scan cooldown check & card history lookup |
| `rfidLogs` | `(zoneId, occurredAt DESC)` | **Compound Index** | Zone-scoped RFID activity feed |
| `ppeDetections` | `idempotencyKey` | **Unique Sparse/Partial Index** | Prevent duplicate ML frame processing on retry |
| `ppeDetections` | `(cameraId, occurredAt DESC)` | **Compound Index** | Camera detection history & analytics |
| `sensorEvents` | `(deviceId, sensorType, occurredAt DESC)` | **Compound Index** | Latest sensor status & cooldown lookup |
| `incidents` | `(zoneId, status, createdAt DESC)` | **Compound Index** | Supervisor & Admin zone-filtered incident queues |
| `incidents` | `(zoneId, deviceOrCameraCode, incidentType, status)` | **Compound Index** | Fast incident deduplication cooldown check |
| `auditLogs` | `(actorId, occurredAt DESC)` | **Compound Index** | Admin audit trail filtering |

---

## 18. Current Database Implementation Status

| Database Entity | Design Status | Repository Code Status |
|---|---|---|
| 1. `users` (`User.model.js`) | `SPECIFIED` | `IMPLEMENTED & VERIFIED` (`backend/src/models/User.model.js`) |
| 2. `workers` (`Worker.model.js`) | `SPECIFIED` | `IMPLEMENTED & VERIFIED` (`backend/src/models/Worker.model.js`) |
| 3. `zones` (`Zone.model.js`) | `SPECIFIED` | `IMPLEMENTED & VERIFIED` (`backend/src/models/Zone.model.js`) |
| 4. `zoneAssignments` (`ZoneAssignment.model.js`) | `SPECIFIED` | `IMPLEMENTED & VERIFIED` (`backend/src/models/ZoneAssignment.model.js`) |
| 5. `devices` (`Device.model.js`) | `SPECIFIED` | `IMPLEMENTED & VERIFIED` (`backend/src/models/Device.model.js`) |
| 6. `cameras` (`Camera.model.js`) | `SPECIFIED` | `IMPLEMENTED & VERIFIED` (`backend/src/models/Camera.model.js`) |
| 7. `rfidLogs` (`RfidLog.model.js`) | `SPECIFIED` | `IMPLEMENTED & VERIFIED` (`backend/src/models/RfidLog.model.js`) |
| 8. `ppeDetections` (`PpeDetection.model.js`) | `SPECIFIED` | `IMPLEMENTED & VERIFIED` (`backend/src/models/PpeDetection.model.js`) |
| 9. `sensorEvents` (`SensorEvent.model.js`) | `SPECIFIED` | `IMPLEMENTED & VERIFIED` (`backend/src/models/SensorEvent.model.js`) |
| 10. `incidents` (`Incident.model.js`) | `SPECIFIED` | `IMPLEMENTED & VERIFIED` (`backend/src/models/Incident.model.js`) |
| 11. `incidentEvidence` (`IncidentEvidence.model.js`) | `SPECIFIED` | `IMPLEMENTED & VERIFIED` (`backend/src/models/IncidentEvidence.model.js`) |
| 12. `auditLogs` (`AuditLog.model.js`) | `SPECIFIED` | `IMPLEMENTED & VERIFIED` (`backend/src/models/AuditLog.model.js`) |
