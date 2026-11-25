# SmartPPE — Warden's Eye
## Project Specification (PS)

**Status:** Proposed Specification (Aligned with Canonical Architecture, API, and Database Contracts)

---

### 1. Project Overview

**SmartPPE — Warden's Eye** is an intelligent **workplace and industrial safety monitoring system** designed to improve employee safety through AI-based Personal Protective Equipment (PPE) detection via cameras, RFID-based worker identification, supplementary environmental hazard monitoring (smoke and flame sensors), and centralized incident management.

The system combines computer vision, ESP32 IoT hardware, backend services, a structured database, and role-based monitoring dashboards for Workers, Supervisors, and Administrators.

> **Scope Note:** SmartPPE is designed for general workplace and industrial facilities (manufacturing floors, warehouses, construction zones, laboratories, and restricted utility areas). It is **not** a mining-specific system and does **not** use smart helmets or helmet-mounted sensors.

---

### 2. Project Objectives

- Identify workers at workplace checkpoints and zones using 13.56 MHz RFID cards and ESP32 + RC522 readers.
- Detect missing or properly worn Personal Protective Equipment (PPE) through camera feeds processed by an ML pipeline.
- Monitor supplementary smoke and flame sensor events from ESP32 nodes.
- Generate, deduplicate, and prioritize real-time safety alerts and incidents.
- Maintain structured incident and evidence records.
- Enforce a three-tier role hierarchy (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`) with strict zone-based authorization for supervisors.
- Allow authorized supervisors and administrators to review, verify (`VERIFIED`), reject (`REJECTED`), and resolve (`RESOLVED`) incidents.
- Maintain tamper-evident incident records through canonical SHA-256 cryptographic hashing and hash chaining, with blockchain anchoring planned as a future extension.
- Support multiple cameras and multiple ESP32 devices across workplace zones.

---

### 3. Team Responsibilities

| Role | Responsibility |
|---|---|
| **ML Developer** | Camera-based PPE detection model, frame inference, violation cooldown, and sending structured detections to the backend |
| **Frontend Developer** | Role-based dashboards (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`), real-time alert views, analytics, and API integration |
| **Backend & Integration Developer** | REST & real-time APIs, database schema, authentication/RBAC, ESP32/ML ingestion, incident engine, SHA-256 integrity hashing, and system integration |
| **Hardware / IoT Developer** | ESP32 firmware, RC522 SPI wiring, supplementary smoke/flame sensor integration, and device heartbeat communication |

---

### 4. Technology Stack (Proposed vs. Verified)

Before implementation, inspect the existing repository and confirm any separate team branches. Do not introduce duplicate frameworks or databases.

#### Proposed Reference Stack
- **Microcontroller & IoT:** ESP32 (C++ / Arduino framework), MFRC522 (3.3V SPI), Smoke Sensor, Flame Sensor
- **ML Pipeline:** Python computer-vision inference service (model architecture & class labels `TO BE CONFIRMED` from ML team)
- **Backend Runtime & Framework:** Node.js + Express.js (`PROPOSED` / `TO BE CONFIRMED`)
- **Database:** MongoDB with Mongoose ODM or relational equivalent (`PROPOSED` / `TO BE CONFIRMED` — see [`docs/DataBase.md`](DataBase.md))
- **API Architecture:** REST API + WebSockets (e.g., Socket.IO) for real-time updates
- **Authentication:** JWT (`Authorization: Bearer <JWT_TOKEN>`) for human users; `X-Device-Key` for ESP32 devices; `X-ML-Service-Key` for ML inference service

---

### 5. System Architecture

```text
                        ESP32 NODE(S)
                              |
                 +------------+------------+
                 |                         |
            RFID RC522               Smoke Sensor
           (3.3V SPI Bus)            Flame Sensor
                 |                         |
                 +------------+------------+
                              |  HTTP REST (X-Device-Key)
                              v
                        BACKEND API <---- HTTP REST (X-ML-Service-Key) ---- CAMERA + ML MODEL
                              |                                              (PPE Detection)
                 +------------+------------+
                 |                         |
                 v                         v
             DATABASE               INCIDENT & HASH
         (12 Core Entities)      INTEGRITY ENGINE (SHA-256)
                 |                         |
                 +------------+------------+
                              |  REST + WebSockets (JWT + RBAC)
                              v
                  ROLE-BASED FRONTEND DASHBOARDS
                 +------------+------------+
                 |            |            |
                 v            v            v
              WORKER     SUPERVISOR  ADMINISTRATOR
             (Personal)  (Assigned   (System-Wide /
                          Zones)     Higher Authority)
```

---

### 6. Core Backend & System Modules

All payload schemas below follow the **Canonical Proposed API Contract** defined in [`docs/ApiDocumentation.md`](ApiDocumentation.md).

#### 6.1 Worker Management

Manage fictional/test worker profiles for prototype testing and link workers to login accounts where personal dashboard access is enabled.

Canonical Worker fields (aligned with [`docs/DataBase.md`](DataBase.md)):
- `workerId` (Unique database ID)
- `userId` (Optional/nullable reference to `Users` for Worker Dashboard login)
- `employeeCode` (Unique human-readable ID, e.g., `"EMP-001"`)
- `name` (Full name)
- `department` (e.g., `"Assembly"`, `"Logistics"`, `"Maintenance"`)
- `designation` (e.g., `"Technician"`, `"Forklift Operator"`)
- `rfidUid` (Assigned 13.56 MHz card UID in uppercase hex, e.g., `"A1B2C3D4"`)
- `zoneId` (Assigned primary workplace zone reference)
- `status` (`"ACTIVE"` | `"INACTIVE"`)
- `createdAt`, `updatedAt`

#### 6.2 RFID Identification (`POST /api/rfid/scan`)

The ESP32 + RC522 module reads RFID card UIDs and submits them to the backend.

Backend responsibilities:
- Authenticate the ESP32 via `X-Device-Key` and verify `deviceCode` is registered and active.
- Resolve the device's assigned `zoneId`.
- Look up the worker by `rfidUid`.
- Prevent duplicate scan flooding within a configurable cooldown window (`RFID_COOLDOWN_SECONDS`, e.g., 5–60 seconds).
- Record the event in `rfidLogs` with `scanStatus` (`"SUCCESS"`, `"UNKNOWN_CARD"`, `"DUPLICATE_IGNORED"`, or `"REJECTED"`).
- Handle unknown RFID cards safely without auto-creating worker accounts, and generate an `"UNKNOWN_RFID"` incident when configured policy thresholds are met.

Canonical Request (`POST /api/rfid/scan`):
```json
{
  "deviceCode": "ESP32_001",
  "rfidUid": "A1B2C3D4",
  "occurredAt": "2026-11-25T10:30:00Z",
  "firmwareVersion": "1.0.0"
}
```

#### 6.3 PPE Detection Management (`POST /api/detections`)

The ML model is developed separately by the ML team member and submits structured inference results to the backend.

Canonical Request (`POST /api/detections`):
```json
{
  "cameraCode": "CAM_001",
  "occurredAt": "2026-11-25T10:30:00Z",
  "modelVersion": "ppe-detector-v1",
  "idempotencyKey": "CAM_001-1764066600000",
  "workerId": null,
  "detections": [
    {
      "classLabel": "person",
      "confidence": 0.96,
      "bbox": [120, 80, 340, 520]
    },
    {
      "classLabel": "helmet",
      "confidence": 0.94,
      "bbox": [180, 80, 260, 150]
    },
    {
      "classLabel": "no_safety_vest",
      "confidence": 0.89,
      "bbox": [150, 160, 310, 380]
    }
  ],
  "missingPPE": ["safety_vest"],
  "safetyStatus": "UNSAFE",
  "overallConfidence": 0.89,
  "evidenceUrl": null
}
```

Responsibilities:
- Authenticate the ML service via `X-ML-Service-Key`.
- Validate that `cameraCode` is registered and resolve its `zoneId`.
- Store detection history in `ppeDetections`.
- Apply violation confidence thresholds and **deduplication cooldown windows** so consecutive video frames do not create duplicate open incidents.
- **Worker Identification Rule:** Do not assume the camera ML model identifies a specific worker. Keep `workerId` as `null` unless a verified identification mechanism links the detection to a worker.

#### 6.4 Environmental Hazard Monitoring (`POST /api/sensors/events`)

ESP32 nodes send supplementary smoke and flame sensor events to the backend.

Canonical Request (`POST /api/sensors/events`):
```json
{
  "deviceCode": "ESP32_001",
  "sensorType": "SMOKE",
  "sensorValue": 1850,
  "threshold": 1500,
  "alertStatus": "CRITICAL",
  "occurredAt": "2026-11-25T10:35:00Z",
  "firmwareVersion": "1.0.0"
}
```

Responsibilities:
- Support `sensorType`: `"SMOKE"` | `"FLAME"`.
- Support `alertStatus`: `"NORMAL"` | `"WARNING"` | `"CRITICAL"`.
- Store sensor event history in `sensorEvents`.
- Generate `"SMOKE_DETECTED"` or `"FLAME_DETECTED"` incidents when `alertStatus` is `"WARNING"` or `"CRITICAL"`, applying a cooldown window to prevent continuous loop flooding.
- **Disclaimer:** These sensors are supplementary prototype demonstration components, not certified industrial safety instruments.

#### 6.5 Incident Management

An incident is created whenever a configured safety violation or environmental hazard is detected (and not suppressed by an active cooldown window).

Canonical Incident fields (aligned with [`docs/DataBase.md`](DataBase.md)):
- `incidentId`
- `incidentType`: `"MISSING_HELMET"` | `"MISSING_SAFETY_VEST"` | `"MULTIPLE_PPE_VIOLATION"` | `"SMOKE_DETECTED"` | `"FLAME_DETECTED"` | `"UNKNOWN_RFID"`
- `severity`: `"LOW"` | `"MEDIUM"` | `"HIGH"` | `"CRITICAL"`
- `status`: `"OPEN"` | `"UNDER_REVIEW"` | `"VERIFIED"` | `"RESOLVED"` | `"REJECTED"`
- `zoneId` (Workplace zone where the incident occurred)
- `workerId` (Nullable — populated only if worker identity is reliably known or verified)
- `sourceType`: `"CAMERA_DETECTION"` | `"SENSOR_EVENT"` | `"RFID_SCAN"` | `"MANUAL"`
- `sourceId` (Reference to the triggering detection, sensor event, or RFID log)
- `deviceOrCameraCode` (e.g., `"CAM_001"` or `"ESP32_001"`)
- `description`
- `occurrenceCount` (Number of repeated triggers merged during cooldown window)
- `assignedSupervisorId` (Nullable reference to `Users`)
- `verifiedBy`, `verifiedAt`, `verificationNotes`
- `resolvedBy`, `resolvedAt`, `resolutionNotes`
- `recordHash` (SHA-256 canonical hash generated upon verification/resolution)
- `previousHash` (SHA-256 hash of the preceding verified incident for tamper-evident hash chaining)
- `blockchainTxHash` (Nullable — reserved for future blockchain anchoring)
- `createdAt`, `updatedAt`

#### 6.6 Role-Based Dashboards, Supervisor Verification & Administrator Oversight

- **Worker Dashboard:** View own profile, PPE compliance status, personal alerts, and own incident history (`/api/workers/me`, `/api/workers/me/incidents`).
- **Supervisor Verification:** View assigned zones, view assigned-zone workers (read-only), review incidents and evidence in assigned zones, verify (`VERIFIED`) or reject (`REJECTED`) incidents with notes, and mark incidents resolved (`RESOLVED`).
- **Administrator Oversight (Higher Authority):** System-wide overview, manage workers, manage supervisors, manage workplace zones and zone assignments, register/manage ESP32 devices and cameras, view system-wide analytics and audit logs, and verify incident hash integrity.

---

### 7. Logical Database Entities

As fully specified in [`docs/DataBase.md`](DataBase.md), the system comprises **12 logical database entities**:

1. `users` — Login accounts (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`)
2. `workers` — Worker profiles, `employeeCode`, `rfidUid`, `zoneId`, and optional `userId` link
3. `zones` — Workplace zones (e.g., Assembly Zone A, Warehouse Zone B, Restricted Lab C)
4. `zoneAssignments` — Maps supervisors (and workers where applicable) to workplace zones
5. `devices` — Registered ESP32 nodes, `deviceCode`, `zoneId`, `apiKeyHash`, `status`, `lastHeartbeat`
6. `cameras` — Registered cameras, `cameraCode`, `zoneId`, `status`, `lastHeartbeat`
7. `rfidLogs` — RFID scan history (`scanStatus`, `occurredAt`)
8. `ppeDetections` — Camera PPE detection records (`detections`, `missingPPE`, `safetyStatus`)
9. `sensorEvents` — Smoke and flame sensor records (`sensorType`, `sensorValue`, `alertStatus`)
10. `incidents` — Safety incidents, verification metadata, and SHA-256 `recordHash` / `previousHash`
11. `incidentEvidence` — Evidence metadata and SHA-256 `fileHash` references
12. `auditLogs` — Immutable audit log of authentication, verification, and administrative actions

---

### 8. Canonical API Route Structure

Full endpoint specifications are defined in [`docs/ApiDocumentation.md`](ApiDocumentation.md):

```text
/api/auth          # Login and current authenticated user session
/api/workers       # Worker CRUD (Admin), zone worker list (Supervisor), /me profile (Worker)
/api/rfid          # ESP32 RFID card scan ingestion and RFID scan logs
/api/devices       # ESP32 device registration, status, and heartbeat ingestion
/api/cameras       # Camera registration and operational status
/api/detections    # ML camera PPE detection ingestion and detection history
/api/sensors       # ESP32 smoke/flame sensor event ingestion and latest status
/api/incidents     # Incident listing, details, status update, and SHA-256 integrity check
/api/supervisor    # Assigned zones and supervisor incident verification/rejection/resolution
/api/admin         # System overview, supervisor CRUD, zone CRUD, zone assignments, audit logs
/api/dashboard     # Role-scoped KPI overview, safety analytics, recent activities, zone stats
/api/blockchain    # Future Scope: On-chain hash recording and verification
```

---

### 9. Security Requirements

Detailed in [`docs/SECURITY_AND_ROLES.md`](SECURITY_AND_ROLES.md):
- Store all secrets in environment variables (`.env`, never committed to Git).
- Hash user passwords using strong one-way hashing (`bcrypt` / `argon2id`) and device API keys using SHA-256 / `bcrypt` (`apiKeyHash`).
- Enforce role-based access control (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`) and supervisor zone isolation on every backend endpoint.
- Authenticate ESP32 requests with `X-Device-Key` and ML service requests with `X-ML-Service-Key`.
- Validate all incoming payloads (types, enum values, confidence bounds `0.0..1.0`, timestamps).

---

### 10. Tamper-Evident Incident Records & Future Blockchain Extension

1. **Primary Proposed Mechanism (Off-Chain Cryptographic Hash Chain):**
   - When an incident is verified or resolved, the backend constructs a deterministic canonical JSON representation of the incident (including any evidence `fileHash`) and computes a **SHA-256 `recordHash`** linked to the preceding verified incident's `previousHash`.
   - Authorized users can verify record integrity at any time via `GET /api/incidents/:id/verify-integrity`, which recomputes the SHA-256 hash and detects any unauthorized database modification.
2. **Future Scope (On-Chain Blockchain Anchoring):**
   - Recording the SHA-256 `recordHash` onto a smart contract and storing `blockchainTxHash` is a planned future extension after the core platform is implemented and tested.
   - Never store CCTV images, video clips, or personal worker data on-chain.
   - Never claim blockchain integration is implemented until verified in code and tested.

---

### 11. Development Phases

- **Phase 1:** Repository inspection, technical audit, and documentation alignment.
- **Phase 2:** Backend project setup and environment configuration.
- **Phase 3:** Database connection, 12 canonical models, indexes, and seed data.
- **Phase 4:** Authentication, 3-tier RBAC, and device/ML key middleware.
- **Phase 5:** Zone, Worker, Device, and Camera management APIs.
- **Phase 6:** RFID identification and duplicate-cooldown APIs.
- **Phase 7:** Environmental sensor event ingestion APIs.
- **Phase 8:** ML PPE detection ingestion and incident deduplication engine.
- **Phase 9:** Supervisor verification, resolution, and SHA-256 tamper-evident hashing.
- **Phase 10:** Role-based Frontend dashboard integration and real-time WebSocket updates.
- **Phase 11:** End-to-end functional, hardware, ML, and security testing.
- **Phase 12:** Future blockchain hash anchoring extension.
