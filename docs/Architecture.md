# SmartPPE — Warden's Eye
## System Architecture Documentation

**Status:** Proposed Architecture Specification (Aligned with Canonical API and Database Contracts)

---

## 1. Project Overview

**SmartPPE — Warden's Eye** is an intelligent **workplace and industrial safety monitoring system** designed to improve worker safety through AI-based Personal Protective Equipment (PPE) detection via cameras, RFID-based worker identification, supplementary environmental hazard monitoring, and centralized incident management.

The system integrates ESP32 IoT hardware, computer vision, backend services, database management, and role-based monitoring dashboards. It provides a centralized platform for **Workers**, **Supervisors**, and **Administrators** to monitor workplace safety, identify potential hazards, and manage safety incidents across industrial and workplace zones.

> **Important Scope Rules:**
> - SmartPPE is a general workplace and industrial safety platform (not mining-specific).
> - SmartPPE uses station/checkpoint RFID readers and fixed/zone cameras. It does **not** include smart helmet construction or helmet-mounted sensors.
> - Smoke and flame sensors are **supplementary prototype demonstration components** and must not be treated as certified industrial safety instruments.

---

## 2. System Objectives

- Identify workers at workplace checkpoints and zones using 13.56 MHz RFID technology.
- Detect missing or improperly worn PPE using camera-based computer vision.
- Monitor supplementary environmental hazard triggers (smoke and flame sensors).
- Automatically generate, deduplicate, and prioritize safety alerts and incidents.
- Provide real-time monitoring through a centralized, role-based dashboard.
- Support multiple cameras and multiple ESP32 devices mapped to workplace zones.
- Enable supervisors to review, verify (`VERIFIED`), reject (`REJECTED`), and resolve (`RESOLVED`) safety incidents within their assigned zones.
- Provide administrators (Higher Authority) with system-wide monitoring, configuration, and audit oversight.
- Maintain tamper-evident incident records via SHA-256 cryptographic hashing and hash chaining (with blockchain anchoring as a planned future extension).
- Support scalable deployment across multiple workplace zones.

---

## 3. High-Level System Architecture

SmartPPE consists of seven major architectural layers:

1. **Hardware and IoT Layer** (ESP32, MFRC522 RFID Reader, Smoke & Flame Sensors)
2. **Machine Learning Layer** (Camera Input & PPE Detection Service)
3. **Backend API & Real-Time Layer** (REST API, Deduplication Engine, WebSocket Broadcaster)
4. **Authentication and Role-Based Access Control (RBAC) Layer** (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`, plus Device/ML Auth)
5. **Incident Management, Verification & Tamper-Evident Integrity Layer** (SHA-256 Hash Chain & Audit Logs)
6. **Database Layer** (12 Canonical Logical Entities)
7. **Frontend Dashboard Layer** (Role-Scoped Worker, Supervisor, and Administrator Interfaces)

### Architecture Diagram

```text
                       SMARTPPE — WARDEN'S EYE
                                  |
        +-------------------------+-------------------------+
        |                         |                         |
        v                         v                         v
  HARDWARE LAYER              ML LAYER               FRONTEND LAYER
   ESP32 Node(s)         Camera + PPE Model        Role-Based Web UI
        |                         |                         |
   +----+----+                    |                +--------+--------+
   |         |                    |                |        |        |
  RFID    Sensors                 |             Worker  Supervisor Admin
 RC522  Smoke/Flame               |            (Self)   (Assigned (All Zones)
 (SPI)  (ADC1/GPIO)               |                      Zones)      |
   |         |                    |                |        |        |
   +----+----+                    |                +--------+--------+
        |                         |                         |
        | HTTP POST               | HTTP POST               | REST + WebSockets
        | (X-Device-Key)          | (X-ML-Service-Key)      | (Bearer JWT)
        +------------+------------+                         |
                     |                                      |
                     v                                      |
                BACKEND API <-------------------------------+
                     |
          +----------+----------+
          |                     |
          v                     v
      DATABASE           AUTH & RBAC ENGINE
  (12 Core Entities)   (Zone Scope & Key Auth)
          |                     |
          +----------+----------+
                     |
                     v
       INCIDENT & COOLDOWN ENGINE
                     |
                     v
     SUPERVISOR VERIFICATION & RESOLUTION
                     |
                     v
     ADMINISTRATOR SYSTEM-WIDE OVERSIGHT
                     |
                     v
   TAMPER-EVIDENT SHA-256 HASH & AUDIT LAYER
     (Future Extension: Blockchain Anchor)
```

---

## 4. Hardware and IoT Layer

The hardware layer collects worker identification and supplementary environmental readings from workplace zones (see [`docs/HARDWARE_SETUP.md`](HARDWARE_SETUP.md)).

### 4.1 Hardware Components

| Component | Purpose |
|---|---|
| **ESP32** | Main Wi-Fi-enabled IoT microcontroller node |
| **MFRC522 (RC522) RFID Reader** | Reads 13.56 MHz ISO/IEC 14443A worker RFID cards over 3.3V SPI |
| **RFID Cards / Tags** | Unique 13.56 MHz worker identification tags |
| **Smoke Sensor Module** | Supplementary prototype sensor for demonstrating smoke hazard alerts |
| **Flame Sensor Module** | Supplementary prototype sensor for demonstrating flame/IR hazard alerts |
| **Camera** | Provides video input for the separate computer-vision PPE detection pipeline |

### 4.2 ESP32 Responsibilities
- Read RFID card UIDs over the 3.3V SPI bus and apply a local scan cooldown (debounce) so holding a card against the reader does not flood requests.
- Sample smoke and flame sensor outputs (using ESP32 `ADC1` pins when Wi-Fi is active, respecting 3.3V GPIO limits).
- Apply local filtering/debouncing and warm-up grace periods for analog sensors.
- Transmit authenticated HTTP requests (`X-Device-Key`) to the backend:
  - `POST /api/rfid/scan`
  - `POST /api/sensors/events`
  - `POST /api/devices/heartbeat`
- Support configurable `deviceCode` and `firmwareVersion` across multiple ESP32 units.

### 4.3 RFID Identification Workflow
1. A worker taps their RFID card at a zone checkpoint reader.
2. MFRC522 reads the card UID over SPI.
3. ESP32 formats the UID as an uppercase hexadecimal string (e.g., `"A1B2C3D4"`) and sends `POST /api/rfid/scan` with `deviceCode`, `rfidUid`, `occurredAt`, and `firmwareVersion`.
4. Backend authenticates `X-Device-Key`, resolves the device's assigned `zoneId`, and looks up the registered worker by `rfidUid`.
5. Backend checks the duplicate-scan cooldown window:
   - If scanned again within the cooldown window, logs or flags as `"DUPLICATE_IGNORED"`.
   - If recognized, records `"SUCCESS"` in `rfidLogs` and broadcasts `rfid:scan`.
   - If unrecognized, records `"UNKNOWN_CARD"` in `rfidLogs` (never auto-creates a worker) and generates an `"UNKNOWN_RFID"` incident if policy thresholds are triggered.

### 4.4 Environmental Monitoring Workflow
1. Smoke and flame sensors monitor conditions at the ESP32 node.
2. When a reading crosses a configured `WARNING` or `CRITICAL` threshold (after local filtering/debounce), the ESP32 sends `POST /api/sensors/events` with `deviceCode`, `sensorType` (`"SMOKE"` or `"FLAME"`), `sensorValue`, `threshold`, `alertStatus`, and `occurredAt`.
3. Backend authenticates the device, resolves its `zoneId`, stores the record in `sensorEvents`, and checks the incident deduplication cooldown window.
4. If no active open incident exists for that device and hazard type within the cooldown window, the backend creates a `"SMOKE_DETECTED"` or `"FLAME_DETECTED"` incident and broadcasts `sensor:alert` and `incident:new` to authorized dashboards.

### 4.5 Multiple ESP32 Device Support
The system supports multiple ESP32 devices installed across different workplace zones. Each device has:
- Unique hardware identifier (`deviceCode`, e.g., `"ESP32_001"`).
- Assigned workplace zone (`zoneId`).
- Hashed device credential (`apiKeyHash` — raw secret is never stored in plain text).
- Operational status (`"ONLINE"`, `"OFFLINE"`, `"MAINTENANCE"`).
- Last communication timestamp (`lastHeartbeat`), evaluated automatically by the backend to detect offline devices.

---

## 5. Machine Learning Layer

The ML layer performs camera-based PPE detection independently from the backend (see [`docs/ML_INTEGRATION.md`](ML_INTEGRATION.md)).

### 5.1 Responsibilities
- Capture frames from registered cameras (`cameraCode`).
- Detect persons and required Personal Protective Equipment (e.g., safety helmets, safety vests).
- Identify missing PPE items (`missingPPE`) and compute `safetyStatus` (`"SAFE"`, `"UNSAFE"`, or `"REVIEW_REQUIRED"`).
- Apply a local frame-level cooldown or persistence filter before sending events to the backend.
- Send structured JSON detection payloads to `POST /api/detections` authenticated with `X-ML-Service-Key`.

### 5.2 Canonical Detection Payload (`POST /api/detections`)

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

*(Note: Exact class labels depend on the trained ML model and are marked `TO BE CONFIRMED` with the ML team member before final deployment.)*

### 5.3 Multiple Camera Support & Worker Identity Boundary
- Each camera is registered in the `cameras` table with a unique `cameraCode`, assigned `zoneId`, `locationDescription`, `status` (`"ONLINE"` | `"OFFLINE"`), and `lastHeartbeat`.
- The backend resolves `zoneId` directly from the trusted registered `cameraCode`.
- **Worker Identification Limitation:** Camera-based PPE object detection identifies equipment compliance, **not** personal identity. `workerId` must remain `null` on camera detections unless an explicit, validated worker-association mechanism is active. Supervisors reviewing a zone incident can view which workers recently checked into that zone via RFID without the system falsely guessing facial identity.

---

## 6. Backend Layer

The backend acts as the central enforcement, ingestion, and communication hub.

### 6.1 Main Backend Modules

| Module | Responsibility |
|---|---|
| **Authentication & RBAC** | User login (`JWT`), password hashing, role hierarchy (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`), supervisor zone-scoping, and `X-Device-Key` / `X-ML-Service-Key` verification |
| **Worker Management** | Worker profiles, `userId` account linking, `employeeCode`, `rfidUid` assignment, and `/api/workers/me` self-service access |
| **Zone Management** | Workplace zone CRUD and supervisor-to-zone assignments (`zoneAssignments`) |
| **RFID Management** | Card scan ingestion, worker resolution, duplicate-scan cooldown, and unknown card handling |
| **Device Management** | ESP32 registration, hashed key management, heartbeat ingestion, and offline timeout detection |
| **Camera Management** | Camera registration, zone mapping, and status tracking |
| **PPE Detection Ingestion** | Validation and storage of ML detection payloads and evidence references |
| **Sensor Monitoring** | Ingestion of smoke and flame sensor events and threshold status tracking |
| **Incident & Cooldown Engine** | Rule evaluation, deduplication cooldowns (`occurrenceCount`), severity assignment, and status workflow |
| **Supervisor Verification** | Incident verification (`VERIFIED`), rejection (`REJECTED`), resolution (`RESOLVED`), and notes |
| **Tamper-Evident Integrity** | Canonical SHA-256 `recordHash` generation, `previousHash` chaining, `fileHash` tracking, and `/verify-integrity` verification |
| **Analytics & Audit Logging** | Role-scoped dashboard KPIs, zone compliance statistics, and immutable `auditLogs` |

---

## 7. Database Layer

As defined in [`docs/DataBase.md`](DataBase.md), the proposed logical database schema contains **12 core entities**:

| # | Entity | Purpose |
|---|---|---|
| 1 | `users` | Login accounts and roles (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`) |
| 2 | `workers` | Employee/worker profiles, `rfidUid` mappings, assigned `zoneId`, and optional `userId` link |
| 3 | `zones` | Workplace operational zones (e.g., Assembly Zone A, Warehouse Zone B, Restricted Zone C) |
| 4 | `zoneAssignments` | Maps supervisors to the workplace zones they are authorized to monitor |
| 5 | `devices` | ESP32 hardware nodes, `deviceCode`, `zoneId`, `apiKeyHash`, `status`, `lastHeartbeat` |
| 6 | `cameras` | Camera sources, `cameraCode`, `zoneId`, `status`, `lastHeartbeat` |
| 7 | `rfidLogs` | RFID card scan history (`scanStatus`, `occurredAt`) |
| 8 | `ppeDetections` | AI PPE detection events (`detections`, `missingPPE`, `safetyStatus`, `occurredAt`) |
| 9 | `sensorEvents` | Supplementary smoke and flame sensor events (`sensorType`, `sensorValue`, `alertStatus`) |
| 10 | `incidents` | Safety incidents, verification/resolution details, and SHA-256 `recordHash` / `previousHash` |
| 11 | `incidentEvidence` | Evidence references (`evidenceUrl`, `evidenceType`, and SHA-256 `fileHash`) |
| 12 | `auditLogs` | System audit trail for authentication, verification, and administrative actions |

---

## 8. Frontend Dashboard Layer

The frontend provides role-based interfaces tailored to each user's authorization level.

### 8.1 Worker Dashboard (`WORKER`)
- View personal worker profile, `employeeCode`, assigned workplace zone, and active RFID status (`/api/workers/me`).
- View personal PPE compliance summary and recent RFID check-ins.
- Receive safety notifications and view personal incident history (`/api/workers/me/incidents`).
- Cannot view other workers, other zones, or administrative/device controls.

### 8.2 Supervisor Dashboard (`SUPERVISOR`)
- Monitor **only assigned workplace zones** (`/api/supervisor/zones`).
- View workers assigned to or checked into those zones (read-only access).
- Receive live PPE violation, smoke, flame, and unknown-RFID alerts for assigned zones.
- Inspect incident details and attached evidence snapshots.
- Verify (`VERIFIED`) or reject (`REJECTED`) incidents with verification notes, and resolve (`RESOLVED`) verified incidents with resolution notes.
- View zone-level safety compliance analytics.

### 8.3 Administrator Dashboard (`ADMINISTRATOR` — Higher Authority)
- System-wide overview across all workplace zones.
- Create, update, and deactivate worker profiles and RFID card assignments.
- Create and manage supervisor and user accounts.
- Create workplace zones and assign/unassign supervisors to zones.
- Register and monitor all ESP32 devices and cameras (including heartbeat online/offline status).
- View all safety incidents across all zones, trigger SHA-256 record integrity verification, access advanced analytics, and inspect system `auditLogs`.

---

## 9. Authentication and Role-Based Access Control (RBAC)

SmartPPE enforces a strict, unified permission policy across all documents (see [`docs/SECURITY_AND_ROLES.md`](SECURITY_AND_ROLES.md)).

### 9.1 Role Hierarchy

```text
               ADMINISTRATOR
             (Higher Authority)
              System-Wide Scope
                     |
          +----------+----------+
          |                     |
     SUPERVISOR 1          SUPERVISOR 2
   (Assigned Zone A)     (Assigned Zone B)
          |                     |
    ZONE A WORKERS        ZONE B WORKERS
    (Personal Scope)      (Personal Scope)
```

### 9.2 Unified Permission Matrix

*(Note: To resolve previous cross-document ambiguities, the canonical proposed policy is that **Supervisors have read-only access to workers in their assigned zones**, while **only Administrators create, edit, or delete worker records and RFID mappings**.)*

| Action / Capability | `WORKER` | `SUPERVISOR` | `ADMINISTRATOR` |
|---|---|---|---|
| View own user/worker profile | Yes | Yes | Yes |
| View personal incidents & notifications | Yes (Own only) | Yes | Yes |
| View workers list | No | Assigned zones (Read-only) | All zones (Full access) |
| Create / update / delete workers & RFID tags | No | No | Yes |
| View workplace zones | Own assigned zone | Assigned zones | All zones |
| Create / update / delete zones | No | No | Yes |
| Manage supervisors & zone assignments | No | No | Yes |
| Register / manage ESP32 devices & cameras | No | View assigned-zone status | Yes (Full CRUD & keys) |
| View safety incidents & evidence | Own incidents only | Assigned zones | All zones |
| Verify / reject / resolve incidents | No | Assigned zones | All zones |
| Verify incident SHA-256 integrity hash | No | Assigned zones | All zones |
| View safety analytics & reports | Personal summary | Assigned-zone analytics | System-wide analytics |
| View system audit logs & change roles | No | No | Yes |

---

## 10. Incident Management & Deduplication Workflow

### 10.1 Canonical Incident Types & Default Severities

| Incident Type (`incidentType`) | Source (`sourceType`) | Default Proposed Severity |
|---|---|---|
| `FLAME_DETECTED` | `SENSOR_EVENT` | `CRITICAL` |
| `SMOKE_DETECTED` | `SENSOR_EVENT` | `HIGH` or `CRITICAL` |
| `MULTIPLE_PPE_VIOLATION` | `CAMERA_DETECTION` | `HIGH` |
| `MISSING_HELMET` | `CAMERA_DETECTION` | `HIGH` |
| `MISSING_SAFETY_VEST` | `CAMERA_DETECTION` | `MEDIUM` |
| `UNKNOWN_RFID` | `RFID_SCAN` | `LOW` or `MEDIUM` |

### 10.2 Canonical Incident Statuses

| Status (`status`) | Meaning |
|---|---|
| `OPEN` | Newly created incident awaiting supervisor attention |
| `UNDER_REVIEW` | Supervisor has opened/acknowledged the incident for investigation |
| `VERIFIED` | Supervisor confirmed the incident is a genuine safety event (triggers SHA-256 `recordHash`) |
| `REJECTED` | Supervisor determined the alert was a false positive (recorded with notes and SHA-256 `recordHash`) |
| `RESOLVED` | Corrective action has been completed and documented with `resolutionNotes` |

### 10.3 Cooldown & Deduplication Strategy
To prevent per-frame camera detections or continuous sensor loops from generating hundreds of duplicate incidents:
1. When a violation event arrives from `cameraCode` or `deviceCode` for a given `incidentType`, the backend checks whether an unresolved incident (`OPEN` or `UNDER_REVIEW`) already exists for the same `(zoneId, deviceOrCameraCode, incidentType)` within the configured cooldown window (`INCIDENT_COOLDOWN_SECONDS`, e.g., 60 seconds).
2. If an active incident exists within the cooldown window, the backend increments `occurrenceCount` and updates `updatedAt` on the existing incident rather than creating a new incident row.

---

## 11. Tamper-Evident Incident Records (Capability #6)

SmartPPE is designed to maintain cryptographically verifiable incident records without requiring an active blockchain node for basic operation.

### 11.1 Proposed Initial Approach: Canonical SHA-256 Hashing & Hash Chaining
1. When a supervisor or administrator verifies (`VERIFIED`), rejects (`REJECTED`), or resolves (`RESOLVED`) an incident, the backend assembles a canonical JSON object with deterministically sorted keys:
   - `incidentId`, `incidentType`, `severity`, `zoneId`, `workerId`, `sourceType`, `sourceId`, `status`, `verifiedBy`, `verifiedAt`, `verificationNotes`, `resolvedBy`, `resolvedAt`, `resolutionNotes`, `evidenceFileHashes`, and `previousHash`.
2. The backend computes `recordHash = SHA256(canonicalPayload)`, where `previousHash` is the `recordHash` of the most recently sealed incident (or a zero genesis hash `"0".repeat(64)` for the first record).
3. If an evidence snapshot file is attached, its SHA-256 `fileHash` is stored in `incidentEvidence` and included in the incident's canonical hash input.
4. **Live Integrity Verification (`GET /api/incidents/:id/verify-integrity`):** Recomputes the SHA-256 hash from current database fields and compares it against the stored `recordHash`. Any unauthorized tampering with a verified incident's fields or status in the database immediately causes a hash mismatch (`integrityValid: false`).

### 11.2 Future Extension: On-Chain Blockchain Anchoring
- Anchoring `recordHash` onto an external smart contract and storing `blockchainTxHash` is planned as a **future extension** (`NOT STARTED`).
- Personal data, images, and full incident text must never be placed on-chain.

---

## 12. Real-Time Updates, Analytics, and Scalability (Capabilities #1, #2, #7)

- **Real-Time Dashboard Updates (Capability #1):** Proposed WebSocket broadcasting (`rfid:scan`, `ppe:detection`, `sensor:alert`, `incident:new`, `incident:updated`, `device:status`, `camera:status`) scoped to authenticated role and zone rooms.
- **Advanced Safety Analytics (Capability #2):** Backend aggregation endpoints providing PPE compliance percentage (`SAFE` detections vs. total detections), active worker count, violation breakdown by type and zone, incident resolution metrics, and device/camera online availability.
- **Scalable Deployment Architecture (Capability #7):** Decoupled HTTP/REST ingestion contracts allow additional ESP32 nodes, additional camera streams, and separate frontend/backend hosting to scale across multiple workplace zones via environment-driven configuration.

---

## 13. Communication Interfaces

| Source | Destination | Protocol / Interface | Authentication |
|---|---|---|---|
| MFRC522 (RC522) | ESP32 | 3.3V SPI Bus | Physical hardware bus |
| Smoke / Flame Sensors | ESP32 | Analog (`ADC1`) / Digital GPIO (3.3V max) | Physical hardware pin |
| ESP32 Nodes | Backend API | HTTP REST (`POST /api/rfid/scan`, `/api/sensors/events`, `/api/devices/heartbeat`) | `X-Device-Key` header |
| ML Inference Service | Backend API | HTTP REST (`POST /api/detections`) | `X-ML-Service-Key` header |
| Frontend Dashboards | Backend API | HTTP REST (`/api/*`) | `Authorization: Bearer <JWT_TOKEN>` |
| Backend API | Frontend Dashboards | WebSocket / Socket.IO rooms | JWT handshake + zone room filtering |
| Backend API | Database | Database Driver / ORM | Environment variable connection string |

---

## 14. Current Implementation Status Summary

All capabilities below are part of the intended SmartPPE project scope. Their current status in this repository is recorded honestly:

| Capability / Component | Current Status in Repository |
|---|---|
| System Architecture & Canonical Contracts | `DOCUMENTED` (Proposed Specification) |
| RC522-to-ESP32 3.3V SPI Wiring Design | `VERIFIED IN DOCS` ([`docs/HARDWARE_SETUP.md`](HARDWARE_SETUP.md)) |
| Smoke & Flame Sensor GPIO Pin Assignments | `TO BE CONFIRMED` (Recommendations provided in [`docs/HARDWARE_SETUP.md`](HARDWARE_SETUP.md)) |
| ESP32 Firmware Source Code | `NOT VERIFIED` / `NOT IMPLEMENTED` in repo |
| Camera PPE Detection ML Model & Class Labels | `TO BE CONFIRMED` with ML team member |
| Backend REST API & Database Models | `PLANNED` / `NOT IMPLEMENTED` in repo |
| Three-Tier RBAC & Zone Isolation Middleware | `PLANNED` / `NOT IMPLEMENTED` in repo |
| Role-Based Frontend Dashboards | `TO BE CONFIRMED` / `NOT IMPLEMENTED` in repo |
| Real-Time Dashboard Updates (Capability #1) | `PLANNED` / `NOT VERIFIED` |
| Advanced Safety Analytics (Capability #2) | `PLANNED` / `NOT VERIFIED` |
| Multi-Camera Support (Capability #3) | `PLANNED` / `NOT VERIFIED` |
| Multiple ESP32 Device Support (Capability #4) | `PLANNED` / `NOT VERIFIED` |
| Advanced Role & Permission Management (Capability #5) | `PLANNED` / `NOT VERIFIED` |
| Tamper-Evident SHA-256 Incident Records (Capability #6) | `PLANNED` / `NOT VERIFIED` |
| On-Chain Blockchain Hash Anchoring | `NOT STARTED` (Future Extension) |
| Scalable Deployment Architecture (Capability #7) | `PLANNED` / `NOT VERIFIED` |

---

**Project:** SmartPPE — Warden's Eye  
**Category:** AI + IoT + Computer Vision + Workplace & Industrial Safety Monitoring  
**Document:** System Architecture (`docs/Architecture.md`)  
**Version:** 1.1 (Audit-Corrected)
