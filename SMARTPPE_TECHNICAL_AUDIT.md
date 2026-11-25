# SMARTPPE – WARDEN'S EYE
## COMPLETE PROJECT & DOCUMENTATION TECHNICAL AUDIT REPORT

**Project Name:** SmartPPE – Warden's Eye  
**Project Type:** AI & IoT-Based Workplace Safety Monitoring System  
**Audit Date:** 2026-11-25  
**Auditor Role:** Senior Software Architect, Full-Stack Developer, Backend Engineer, IoT Engineer, AI/ML Integration Engineer, Cybersecurity Auditor, and Technical Documentation Reviewer  
**Repository Audited:** `c:/Users/biswa/OneDrive/Documents/GitHub/Warden-s-Eye` (`origin`: `https://github.com/biswajitbiswal-in/Warden-s-Eye.git`, branch: `main`, commit: `4f6ee3c`)

---

## 1. Executive Summary

A full technical inspection of the **SmartPPE – Warden's Eye** repository was conducted across all 14 requested audit phases.

### Critical Audit Finding: Zero Source Code Currently Present in Repository
The repository currently contains **only 11 Markdown documentation files** (`README.md` at the root and 10 files inside `docs/`, which are currently untracked in Git alongside modified `README.md`). There is **zero executable source code, configuration, firmware, database schema code, ML inference script, or frontend/backend application code** in this repository (`backend/`, `frontend/`, `ml-model/`, `hardware/`, `package.json`, `.env.example`, and `.gitignore` do not exist).

### Key Takeaways
1. **Implementation State:** Every software, hardware firmware, database, and ML component is currently **DOCUMENTED ONLY / NOT IMPLEMENTED** (or **NOT VERIFIED** if developed on separate unmerged local machines/repositories by other team members).
2. **Domain Framing Mismatch:** The project objective specifies that SmartPPE is designed for **general workplace and industrial safety monitoring and is NOT a mining-specific project**. However, `README.md`, `docs/ps.md`, `docs/Architecture.md`, `docs/ApiDocumentation.md`, and `docs/DataBase.md` repeatedly frame the project exclusively as an *"AI-Powered Mining Safety Monitoring System"* with mining zones (`MINING_WORKER`, `Mining Zone A`, etc.).
3. **Cross-Document Contract Conflicts:** There are significant schema, endpoint, enum, and payload mismatches across `docs/ps.md`, `docs/Architecture.md`, `docs/ApiDocumentation.md`, `docs/DataBase.md`, and `docs/ML_INTEGRATION.md` (e.g., `POST /api/detections` has three incompatible JSON schemas across three documents; role enums, incident status enums, and sensor payload fields conflict across documents).
4. **File Naming Mismatches:** Several files in `docs/` use PascalCase or abbreviated names (`Architecture.md`, `ApiDocumentation.md`, `DataBase.md`) instead of the standard uppercase names referenced in checklists (`ARCHITECTURE.md`, `API_DOCUMENTATION.md`, `DATABASE_SCHEMA.md`), and `CHANGELOG.md` and `SETUP.md` are completely missing despite being referenced in `README.md`.
5. **Strong Architectural Foundation in Docs:** Despite the absence of code and cross-document discrepancies, the documentation establishes sound security rules (server-side RBAC, supervisor zone isolation, device/ML service authentication, off-chain PII/media rules, non-certified prototype sensor disclaimers, and no automatic camera-to-worker identity assumption).

---

## 2. Project Structure Analysis

### 2.1 Actual Folder Structure (Verified from File System)

```text
Warden-s-Eye/
├── .git/
├── README.md                         (4,829 bytes - modified, unstaged)
└── docs/                             (Untracked directory)
    ├── ApiDocumentation.md           (11,935 bytes)
    ├── Architecture.md               (20,073 bytes)
    ├── DEPLOYMENT.md                 (2,589 bytes)
    ├── DEVELOPMENT_WORKFLOW.md       (2,761 bytes)
    ├── DataBase.md                   (18,540 bytes)
    ├── HARDWARE_SETUP.md             (3,084 bytes)
    ├── ML_INTEGRATION.md             (2,508 bytes)
    ├── SECURITY_AND_ROLES.md         (3,509 bytes)
    ├── TESTING.md                    (3,076 bytes)
    └── ps.md                         (8,348 bytes)
```

### 2.2 Comparison Against Documented Structure (`README.md` Section 5)

| Expected Path in `README.md` | Actual Status in Repository | Audit Finding |
|---|---|---|
| `docs/` | Present (10 `.md` files) | Present, untracked in Git |
| `backend/` | **MISSING** | No backend code, `package.json`, or server entry point exists |
| `frontend/` | **MISSING** | No frontend app, framework config, or UI components exist |
| `ml-model/` | **MISSING** | No model weights, Python scripts, or OpenCV/YOLO files exist |
| `hardware/esp32/` | **MISSING** | No `.ino` or PlatformIO ESP32 firmware files exist |
| `hardware/circuit-diagrams/` | **MISSING** | No wiring diagrams or schematics exist |
| `hardware/sensor-code/` | **MISSING** | No RC522, smoke, or flame test sketches exist |
| `README.md` | Present | Present at root |
| `SETUP.md` | **MISSING** | Referenced in `README.md` tree, does not exist |
| `.env.example` | **MISSING** | Referenced in `README.md` and `DEPLOYMENT.md`, does not exist |
| `.gitignore` | **MISSING** | Referenced in `README.md`, critical omission before adding code |
| `CHANGELOG.md` | **MISSING** | Referenced in `README.md` Section 8, does not exist |

### 2.3 Inspection of All 17 Phase 1 Items

| # | Inspection Area | Verification Result | Status |
|---|---|---|---|
| 1 | Complete folder structure | Only `.git/`, `README.md`, and `docs/` exist | **VERIFIED (Docs Only)** |
| 2 | Frontend implementation | No frontend directory or source files exist | **NOT IMPLEMENTED / NOT VERIFIED** |
| 3 | Backend implementation | No backend directory or source files exist | **NOT IMPLEMENTED / NOT VERIFIED** |
| 4 | Database configuration | No DB connection code, ORM models, or migration files exist | **NOT IMPLEMENTED / NOT VERIFIED** |
| 5 | Authentication system | No auth middleware, password hashing, or JWT code exists | **NOT IMPLEMENTED / NOT VERIFIED** |
| 6 | API endpoints | No Express/HTTP routes or controllers exist | **NOT IMPLEMENTED / NOT VERIFIED** |
| 7 | ESP32 firmware | No `.ino` / C++ firmware exists in the repository | **NOT IMPLEMENTED / NOT VERIFIED** |
| 8 | RFID implementation | No firmware or backend `/api/rfid` handler exists | **NOT IMPLEMENTED / NOT VERIFIED** |
| 9 | RC522 integration | Wiring table documented in `HARDWARE_SETUP.md`; no code exists | **DOCUMENTED ONLY** |
| 10 | Smoke sensor implementation | General notes in `HARDWARE_SETUP.md`; no code or pinout exists | **DOCUMENTED ONLY** |
| 11 | Flame sensor implementation | General notes in `HARDWARE_SETUP.md`; no code or pinout exists | **DOCUMENTED ONLY** |
| 12 | ML model and inference code | No model weights or inference script in repo | **NOT IMPLEMENTED / NOT VERIFIED** |
| 13 | Camera integration | No camera capture or streaming code in repo | **NOT IMPLEMENTED / NOT VERIFIED** |
| 14 | Frontend-backend communication | No HTTP client or WebSocket client/server exists | **NOT IMPLEMENTED / NOT VERIFIED** |
| 15 | Environment configuration | No `.env` or `.env.example` exists (no secrets exposed) | **NOT IMPLEMENTED** |
| 16 | Deployment configuration | No Dockerfile, `vercel.json`, PM2, or CI workflow exists | **NOT IMPLEMENTED** |
| 17 | Existing documentation | 11 Markdown files present and audited in full below | **VERIFIED** |

---

## 3. Actual Technology Stack

Because no source code or package manifests (`package.json`, `requirements.txt`, `platformio.ini`) exist in the workspace, **no technology stack is verified in code**.

| Layer | Proposed in `docs/ps.md` | Mentioned in Other Docs | Actual Verified in Codebase | Verification Status |
|---|---|---|---|---|
| **Microcontroller** | ESP32 | ESP32 (`HARDWARE_SETUP.md`) | None | **NOT VERIFIED** |
| **RFID Reader** | RC522 (13.56 MHz) | MFRC522 over SPI (`HARDWARE_SETUP.md`) | None | **NOT VERIFIED** |
| **Sensors** | Smoke Sensor, Flame Sensor | Analog/GPIO Smoke & Flame modules | None | **NOT VERIFIED** |
| **ML / CV Pipeline** | Separate PPE Detection Model | Camera-based PPE model (`ML_INTEGRATION.md`) | None | **NOT VERIFIED** |
| **Backend Runtime** | Node.js + Express.js (JavaScript) | "To be confirmed from codebase" (`README.md`) | None | **NOT VERIFIED** |
| **Database** | MongoDB + Mongoose ODM | UUID / ObjectId (`DataBase.md`), mentions Supabase Realtime as example | None | **NOT VERIFIED** |
| **Authentication** | JWT (JSON Web Tokens) | Bearer `<JWT_TOKEN>` or session (`SECURITY_AND_ROLES.md`) | None | **NOT VERIFIED** |
| **Real-Time Transport** | Socket.IO ("if required") | WebSockets / Supabase Realtime (`Architecture.md`, `DataBase.md`) | None | **NOT VERIFIED** |
| **Frontend** | Not specified in `ps.md` | "Existing Dashboard Framework" (`README.md`) | None | **NOT VERIFIED** |
| **Blockchain** | Future Scope (SHA-256 + Smart Contract) | Planned / Future Scope | None | **NOT IMPLEMENTED** |
| **Version Control** | Git & GitHub | Git (`DEVELOPMENT_WORKFLOW.md`) | Git + GitHub verified | **VERIFIED** |

---

## 4. Documentation Audit (Phase 2)

Every Markdown file in the project was inspected line-by-line and compared against the project requirements and actual repository state.

### 4.1 `README.md`
- **File Path:** `README.md`
- **Document Purpose:** High-level project overview, key features, module summary, technology stack placeholders, workflow, expected folder tree, hardware list, and development status table.
- **Technical Correctness:** Conceptually clear, well-structured overview.
- **Matches Actual Implementation?** **No.** Lists a full folder tree (`backend/`, `frontend/`, `ml-model/`, `hardware/`, `SETUP.md`, `.env.example`, `.gitignore`) and marks `Frontend Dashboard`, `PPE Detection Model`, and `Backend APIs` as "In Development", whereas no code folders exist in Git yet.
- **Missing Information:**
  - Does not mention the 3-tier role hierarchy (Worker, Supervisor, Administrator) in Key Features or System Modules.
  - Does not state that smoke and flame sensors are supplementary prototype demonstration components rather than certified industrial instruments.
  - Missing exact links to the files inside `docs/`.
- **Incorrect Information:**
  - Line 3, 5, 7, 152, 157: Frames the project as an **"AI-Powered Mining Safety Monitoring System"** and **"Mining Safety"**, contradicting the requirement that SmartPPE is a **general workplace and industrial safety monitoring system and NOT mining-specific**.
- **Outdated Information:**
  - Technology stack table (Lines 49–51) still says *"To be confirmed from the project codebase"* and *"Existing Dashboard Framework"*.
- **Conflicting Information:**
  - References `SETUP.md`, `.env.example`, `.gitignore`, and `Changelog` (`CHANGELOG.md`), none of which exist.
- **Recommended Improvements:**
  - Replace all "mining safety" framing with "workplace and industrial safety monitoring".
  - Add the three user roles (Worker, Supervisor, Administrator) to the overview.
  - Add the prototype disclaimer for smoke and flame sensors.
  - Link directly to the actual filenames in `docs/`.
- **Final Audit Status:** **NEEDS IMPROVEMENT**

---

### 4.2 `docs/ps.md`
- **File Path:** `docs/ps.md`
- **Document Purpose:** Project Specification defining objectives, team responsibilities, proposed Node.js/Express/MongoDB stack, backend module specifications, example API payloads, collections, security rules, future blockchain scope, and 12 development phases.
- **Technical Correctness:** Solid specification for a Node.js + Express + MongoDB REST architecture, with appropriate notes not to assume ML identifies workers and that sensors are prototype components.
- **Matches Actual Implementation?** **No.** Defines proposed backend modules and collections that have not yet been coded.
- **Missing Information:**
  - Does not define `zones`, `zoneAssignments`, `devices`, `cameras`, `incidentEvidence`, or `auditLogs` in Section 7 (Database Collections only lists 6 collections: `workers`, `users`, `rfidLogs`, `detections`, `sensorEvents`, `incidents`).
  - Missing `/api/devices`, `/api/cameras`, and `/api/admin` in Section 8 (API Structure).
  - Missing the **Administrator** and **Worker** dashboard roles in the architecture diagram and module breakdown (focuses only on Supervisor review).
- **Incorrect Information:**
  - Line 6, 191: Describes SmartPPE as a *"mining safety monitoring system"* and *"certified mine-safety instruments"*, rather than general workplace/industrial safety.
- **Outdated Information:** None, though hardcoded example timestamps use `2026-11-25`.
- **Conflicting Information:**
  - Section 6.3 (`POST /api/detections`) uses `detectedObjects: ["person", "helmet", "safety_vest"]` and `missingPPE: []`, which conflicts with `docs/DataBase.md` and `docs/ML_INTEGRATION.md`.
  - Section 7 lists 6 collections, whereas `Architecture.md` lists 10 and `DataBase.md` lists 12 entities.
  - Section 6.5 lists 4 incident statuses (`OPEN`, `UNDER_REVIEW`, `VERIFIED`, `RESOLVED`), whereas `DataBase.md` includes `rejected`.
- **Recommended Improvements:**
  - Generalize "mining" terminology to "workplace / industrial safety".
  - Synchronize the collection list (12 entities) and route prefixes (`/api/devices`, `/api/cameras`, `/api/admin`) with `ApiDocumentation.md` and `DataBase.md`.
  - Unify the `POST /api/detections` payload contract with `ML_INTEGRATION.md`.
- **Final Audit Status:** **NEEDS IMPROVEMENT**

---

### 4.3 `docs/Architecture.md` (Requested as `ARCHITECTURE.md`)
- **File Path:** `docs/Architecture.md` (Note filename casing difference from `ARCHITECTURE.md`)
- **Document Purpose:** End-to-end system architecture covering the 7 layers (Hardware/IoT, ML, Backend, Database, Frontend Dashboards, RBAC, Incident Management & Verification), real-time updates, analytics, multi-camera/multi-device support, tamper-evident records, and scalability.
- **Technical Correctness:** High architectural clarity. Correctly separates Worker, Supervisor, and Administrator responsibilities, notes camera worker-ID limitations, and keeps PII/images off-chain.
- **Matches Actual Implementation?** **No** (no codebase exists yet).
- **Missing Information:**
  - Missing `zoneAssignments` and `incidentEvidence` in Section 7.1 (lists 10 collections instead of the 12 in `DataBase.md`).
  - Does not specify how ESP32 device heartbeats timeout to mark a device `OFFLINE`.
- **Incorrect Information:**
  - Lines 8, 27, 89, 135, 139, 144, 199, 263, 275–277, 288, 306, 324, 329, 330, 500, 519, 528, 575, 661, 664, 671, 673, 675, 680: Repeatedly uses **"mining safety"** and **"mining zones"** instead of general workplace/industrial safety zones.
- **Outdated Information:** None.
- **Conflicting Information:**
  - Section 5.3 detection payload uses `detectedObjects: ["person", "helmet", "safety_vest"]` + `missingPPE: []`, conflicting with `ML_INTEGRATION.md` (`detections: [{"class": "helmet", "confidence": 0.94}]`).
  - Permission Matrix (Section 9.2) says Supervisor can "Manage workers: Limited", whereas `SECURITY_AND_ROLES.md` does not grant Supervisors worker management permissions.
- **Recommended Improvements:**
  - Rename file to `ARCHITECTURE.md` (or standardize file naming across the repo).
  - Replace all "mining" references with "workplace / industrial".
  - Align collection list (12 entities) and ML detection JSON schema with `DataBase.md` and `ML_INTEGRATION.md`.
- **Final Audit Status:** **NEEDS IMPROVEMENT**

---

### 4.4 `docs/ApiDocumentation.md` (Requested as `API_DOCUMENTATION.md`)
- **File Path:** `docs/ApiDocumentation.md` (Note filename difference from `API_DOCUMENTATION.md`)
- **Document Purpose:** Defines REST API endpoints, request/response JSON schemas, WebSocket event names, HTTP status codes, and security rules across 13 route groups.
- **Technical Correctness:** Comprehensive REST contract covering `/api/auth`, `/api/workers`, `/api/rfid`, `/api/devices`, `/api/cameras`, `/api/detections`, `/api/sensors`, `/api/incidents`, `/api/supervisor`, `/api/admin`, `/api/dashboard`, and `/api/blockchain`.
- **Matches Actual Implementation?** **No** (no backend code exists yet).
- **Missing Information:**
  - Missing **Worker Dashboard self-service endpoints** (e.g., `GET /api/workers/me` or `GET /api/incidents/my` for a logged-in Worker to view their own profile, PPE status, notifications, and personal incident history without having access to `GET /api/workers`).
  - Missing incident rejection endpoint or payload option in Supervisor APIs (`POST /api/supervisor/incidents/:id/verify` only shows `VERIFIED`, whereas `DataBase.md` includes `rejected`).
  - Missing device authentication header specification (e.g., `X-Device-Id` / `X-Device-Key` or `X-Service-Key` for ESP32 and ML requests; Section 2 only mentions `Authorization: Bearer <JWT_TOKEN>`).
  - Missing pagination/filtering query parameters (`?zoneId=`, `?status=`, `?page=`, `?limit=`) on list endpoints (`/api/incidents`, `/api/rfid/logs`, `/api/detections`, `/api/sensors/events`, `/api/admin/audit-logs`).
- **Incorrect Information:**
  - Line 118, 119, 536: Uses `"role": "MINING_WORKER"`, `"department": "Mining"`, and `"Manage Mining Zones"`.
- **Outdated Information:** None.
- **Conflicting Information:**
  - **User Role Enums:** Section 3.1 returns `"role": "ADMIN"`, while `DataBase.md` Section 4 specifies `worker, supervisor, administrator` (lowercase, full word).
  - **Worker Fields:** Section 4.1 uses `workerId`, `role`, `department`, `assignedZone`, `rfidUid`, whereas `DataBase.md` Section 5 uses `workerId`, `employeeCode`, `name`, `rfidUid`, `zoneId`, `status` (no `role` or `department`, and `zoneId` instead of `assignedZone`).
  - **RFID Scan Endpoint:** Section 5.1 returns `200 OK` with `"success": true, "recognized": false` for unknown cards, without specifying whether an `UNKNOWN_RFID` incident is automatically created as required by `ps.md` Section 6.5.
  - **Sensor Event Fields:** Section 9.1 uses `value: 1` and `status: "DANGER"` (`SMOKE`/`FLAME` uppercase), whereas `DataBase.md` Section 12 uses `sensorValue: 1`, `threshold`, and `alertStatus: "critical"` (`smoke`/`flame` lowercase).
- **Recommended Improvements:**
  - Rename file to `API_DOCUMENTATION.md`.
  - Define explicit headers for ESP32 device auth (`X-Device-Key`) and ML service auth (`X-ML-Api-Key`).
  - Add Worker self-service endpoints (`/api/workers/me`, `/api/workers/me/incidents`).
  - Standardize all field names and enum values with `DataBase.md` and `ML_INTEGRATION.md`.
- **Final Audit Status:** **NEEDS IMPROVEMENT**

---

### 4.5 `docs/DataBase.md` (Requested as `DATABASE_SCHEMA.md`)
- **File Path:** `docs/DataBase.md` (Note filename difference from `DATABASE_SCHEMA.md`)
- **Document Purpose:** Defines the logical database schema across 12 entities, field types, relationships, indexes/constraints, RBAC data access matrix, real-time retrieval requirements, and SHA-256 tamper-evident hashing rules.
- **Technical Correctness:** Very well-designed relational/document logical model covering all 12 required entities (`Users`, `Workers`, `Zones`, `Zone Assignments`, `Devices`, `Cameras`, `RFID Logs`, `PPE Detections`, `Sensor Events`, `Incidents`, `Incident Evidence`, `Audit Logs`).
- **Matches Actual Implementation?** **No** (no database or ORM/ODM models exist yet).
- **Missing Information:**
  - **Missing Worker-to-User Link:** `Users` (Section 4) and `Workers` (Section 5) have no linking foreign key (`userId` on `Workers` or `workerId` on `Users`). Without this link, when a user with `role: "worker"` logs in, the backend cannot determine which `Workers` record, RFID logs, or personal incidents belong to that logged-in user!
  - **Missing Device & ML Credentials Storage:** `Devices` (Section 8) has no `apiKeyHash` or `deviceSecretHash` field to support the per-device authentication required by `SECURITY_AND_ROLES.md` Section 5.
  - **Missing Duplicate Scan Window / Cooldown Config:** No field or configuration table for RFID deduplication window or ML incident cooldown.
  - **Missing Tamper-Evident Hash Fields on Incidents:** Section 13 (`Incidents`) lacks `recordHash` (SHA-256), `verifiedBy`, `verifiedAt`, `verificationNotes`, `resolutionNotes`, and `blockchainTxHash` fields needed by Section 20 and `ApiDocumentation.md` Section 11.2/11.3.
- **Incorrect Information:**
  - Lines 5, 17, 19, 102, 114, 130, 146–148, 156, 346: Uses *"AI-Based Mining Safety Monitoring System"*, *"Mining worker"*, and *"Mining Zone A/B"*.
- **Outdated Information:** None.
- **Conflicting Information:**
  - Field names (`employeeCode`, `zoneId`, `sensorValue`, `alertStatus`, `safetyStatus`, `detectedAt`, `eventTime`, `scanTime`) differ from the payload keys in `ps.md` and `ApiDocumentation.md`.
- **Recommended Improvements:**
  - Rename file to `DATABASE_SCHEMA.md`.
  - Add `userId` (nullable FK to `Users`) in `Workers` so Worker dashboard logins map to their worker profile.
  - Add `deviceKeyHash` to `Devices` for hardware authentication.
  - Add `verifiedBy`, `verifiedAt`, `verificationNotes`, `resolutionNotes`, `recordHash` (SHA-256) to `Incidents`.
  - Remove mining-specific wording.
- **Final Audit Status:** **NEEDS IMPROVEMENT**

---

### 4.6 `docs/SECURITY_AND_ROLES.md`
- **File Path:** `docs/SECURITY_AND_ROLES.md`
- **Document Purpose:** Defines the 3-tier role hierarchy (Worker, Supervisor, Administrator), authorization matrix, human authentication, separate ESP32/ML device authentication, server-side authorization rules, data/evidence protection, audit logging, and security testing.
- **Technical Correctness:** Excellent security architecture principles. Does not contain mining-specific terminology and enforces strict least-privilege and server-side validation rules.
- **Matches Actual Implementation?** **No** (no code exists yet).
- **Missing Information:**
  - Does not specify the exact token lifetimes (e.g., JWT access token expiry vs. refresh token), password hashing algorithm (e.g., `bcrypt` with cost factor $\ge 10$ or `argon2id`), or exact header names for ESP32/ML authentication.
- **Incorrect Information:** None.
- **Outdated Information:** None.
- **Conflicting Information:**
  - Minor matrix difference with `Architecture.md` Section 9.2 regarding whether Supervisors have "Limited" worker management rights (`SECURITY_AND_ROLES.md` omits "Manage workers" from the table, while `DataBase.md` Section 18 says "Limited").
- **Recommended Improvements:**
  - Specify concrete algorithm standards (`bcrypt` / `argon2`, JWT expiry, `X-Device-Key` / `X-Service-Key` headers) once the backend is built.
  - Clarify explicitly whether Supervisors have read-only access to workers in their assigned zones or can edit worker zone assignments.
- **Final Audit Status:** **PARTIALLY VERIFIED (Specification Sound; Code Not Implemented)**

---

### 4.7 `docs/HARDWARE_SETUP.md`
- **File Path:** `docs/HARDWARE_SETUP.md`
- **Document Purpose:** Documents the prototype hardware scope (ESP32, MFRC522 13.56 MHz reader, smoke sensor, flame sensor), 3.3V warning, ESP32-to-RC522 SPI pin mapping, Arduino IDE setup, sensor guidelines, payload fields, troubleshooting, and demo safety.
- **Technical Correctness:** Accurate ESP32 VSPI wiring for MFRC522 (`SDA/SS -> GPIO 5`, `SCK -> GPIO 18`, `MOSI -> GPIO 23`, `MISO -> GPIO 19`, `RST -> GPIO 22`, `3.3V -> 3V3`, `GND -> GND`). Explicitly notes no smart helmet or helmet-mounted sensors are used, and warns against 5V on RC522 and uncalibrated sensor claims.
- **Matches Actual Implementation?** **No** (no ESP32 `.ino` firmware exists in the repository to verify pin definitions in code).
- **Missing Information:**
  - **Missing Explicit GPIO Pin Assignments for Smoke and Flame Sensors:** Section 3 gives exact pins for RC522, but Section 5 does not specify which ESP32 GPIO pins are used for the Smoke Sensor (e.g., `GPIO 34` ADC1) and Flame Sensor (e.g., `GPIO 35` or `GPIO 27`). Note that on ESP32, `ADC2` pins cannot be used while Wi-Fi is active—this critical hardware constraint is not documented!
  - **Missing Voltage Divider / Level Shifting Note:** Many 5V smoke/flame modules (such as MQ-2) output up to 5V on their analog/digital pins, which can damage ESP32 3.3V GPIOs unless a voltage divider or 3.3V-compatible tap is used (Section 5 mentions "Ensure analog input voltage never exceeds ESP32 pin limits" but does not provide the circuit or pinout).
  - **Missing Heartbeat Interval & Local Debounce Timing:** Does not specify heartbeat frequency (e.g., every 30s) or RFID scan cooldown (e.g., 5s local debounce).
- **Incorrect Information:** None.
- **Outdated Information:** None.
- **Conflicting Information:**
  - Section 7 lists generic payload fields (`device identity`, `event type`, `sensor/UID payload`, `event timestamp`, `firmware version`), whereas `ApiDocumentation.md` uses separate `/api/rfid/scan` and `/api/sensors/events` endpoints without a `firmwareVersion` field.
- **Recommended Improvements:**
  - Add an explicit ESP32 GPIO pinout table for the Smoke and Flame sensors (specifying `ADC1` pins such as `GPIO 32–39` so Wi-Fi does not conflict with `ADC2`).
  - Document the exact JSON payloads sent by the ESP32 firmware to `/api/rfid/scan`, `/api/sensors/events`, and `/api/devices/heartbeat`.
- **Final Audit Status:** **NEEDS IMPROVEMENT**

---

### 4.8 `docs/ML_INTEGRATION.md`
- **File Path:** `docs/ML_INTEGRATION.md`
- **Document Purpose:** Defines the boundary and JSON payload contract between the camera-based PPE detection ML service and the SmartPPE backend, including validation, worker identity limitations, incident deduplication rules, evidence handling, and testing.
- **Technical Correctness:** Strong engineering practices (idempotency keys, confidence bounds `0..1`, model version traceability, persistence/cooldown windows to prevent per-frame incident flooding, and keeping `workerId` null unless reliably identified).
- **Matches Actual Implementation?** **No** (no ML code or backend endpoint exists yet).
- **Missing Information:**
  - Does not list the exact canonical class label enum supported by the trained model (e.g., whether the model outputs `helmet`, `no_helmet`, `safety_vest`, `no_safety_vest`, `person` or `Hardhat`, `NO-Hardhat`, `Safety Vest`, `NO-Safety Vest`).
  - Does not define how evidence snapshots are uploaded (e.g., multipart upload to `/api/evidence`, presigned URL, or base64/local path in prototype).
- **Incorrect Information:** None.
- **Outdated Information:** None.
- **Conflicting Information:**
  - **Payload Mismatch:** Section 3 uses:
    ```json
    {
      "cameraCode": "CAM-001",
      "occurredAt": "2026-11-25T10:30:00Z",
      "modelVersion": "prototype-v1",
      "detections": [
        {"class": "helmet", "confidence": 0.94},
        {"class": "no_safety_vest", "confidence": 0.89}
      ]
    }
    ```
    Whereas `ApiDocumentation.md` Section 8.1 uses `cameraId`, `zoneId`, `workerId`, `detectedObjects: ["person", "helmet", "safety_vest"]`, `missingPPE: []`, `confidence: 0.94`, `timestamp`.
- **Recommended Improvements:**
  - Unify the detection request payload across `ML_INTEGRATION.md`, `ApiDocumentation.md`, `DataBase.md`, `Architecture.md`, and `ps.md`.
  - Document the exact YOLO/CV model class labels and evidence snapshot upload flow.
- **Final Audit Status:** **NEEDS IMPROVEMENT**

---

### 4.9 `docs/TESTING.md`
- **File Path:** `docs/TESTING.md`
- **Document Purpose:** Outlines the testing strategy, 14 functional test cases (`T01`–`T14`), security tests, hardware tests, ML tests, reliability tests, and test evidence recording format.
- **Technical Correctness:** Well-chosen test cases covering happy paths, unknown RFID cards, unknown devices, invalid confidence, cross-zone supervisor denial, heartbeat offline timeout, and evidence protection.
- **Matches Actual Implementation?** **No.** Contains only a test plan template; **zero actual test execution results, automated test scripts, or test logs exist**.
- **Missing Information:**
  - No actual test execution results table (all test cases lack actual result, pass/fail status, date, and build version).
  - Missing test cases for **duplicate RFID scan suppression** (within configurable time window) and **ML frame-flooding incident cooldown**.
  - Missing test cases for **tamper-evident SHA-256 hash verification** (detecting a modified incident record).
- **Incorrect Information:** None.
- **Outdated Information:** None.
- **Conflicting Information:** None.
- **Recommended Improvements:**
  - Add functional test cases `T15` (Duplicate RFID scan within cooldown window), `T16` (Repeated ML violation frames within cooldown window do not create duplicate open incidents), and `T17` (Tamper-evident hash integrity check fails if incident record is altered in DB).
  - Populate actual test results once modules are implemented.
- **Final Audit Status:** **NEEDS IMPROVEMENT**

---

### 4.10 `docs/DEPLOYMENT.md`
- **File Path:** `docs/DEPLOYMENT.md`
- **Document Purpose:** Generic pre-deployment checklist, environment variable categories, component list, hardware connectivity notes, production safeguards, demo checklist, and rollback advice.
- **Technical Correctness:** Sound general guidelines.
- **Matches Actual Implementation?** **No.** It is a generic template and does not list actual environment variable names (e.g., `PORT`, `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`), commands (`npm run build`, `npm start`), or ports.
- **Missing Information:**
  - Concrete environment variable names matching `.env.example`.
  - Exact local and production startup commands for backend, frontend, and ML service.
  - Network configuration instructions for connecting ESP32 to a local laptop/server over Wi-Fi hotspot during a hackathon demo (e.g., finding local IPv4 address, firewall rules for port 5000).
- **Incorrect Information:** None.
- **Outdated Information:** None.
- **Conflicting Information:** References `.env.example`, which does not exist in the repository.
- **Recommended Improvements:**
  - Add concrete `.env.example` variable names, startup commands, and a dedicated "Hackathon Local LAN / Hotspot Demo Setup" section for ESP32 + Laptop + Camera connectivity.
- **Final Audit Status:** **NEEDS IMPROVEMENT**

---

### 4.11 `docs/DEVELOPMENT_WORKFLOW.md`
- **File Path:** `docs/DEVELOPMENT_WORKFLOW.md`
- **Document Purpose:** Defines team work areas, integration contracts, Git feature-branch workflow, 12-step development sequence, AI coding assistant instructions, and definition of done.
- **Technical Correctness:** Clear, practical engineering workflow.
- **Matches Actual Implementation?** Partially—describes the intended workflow, though currently all 10 `docs/` files are untracked on `main` and no feature branches exist yet.
- **Missing Information:**
  - Does not specify exact repository folder paths and ownership conventions (e.g., `/backend`, `/frontend`, `/ml`, `/firmware`) or code linting/formatting commands.
- **Incorrect Information:** None.
- **Outdated Information:** None.
- **Conflicting Information:** None.
- **Recommended Improvements:**
  - Add the canonical folder layout and exact data contract reference link once agreed.
- **Final Audit Status:** **PARTIALLY VERIFIED**

---

### 4.12 `CHANGELOG.md` (Requested in Phase 2 Checklist & Referenced in `README.md`)
- **File Path:** `CHANGELOG.md` or `docs/CHANGELOG.md` — **FILE DOES NOT EXIST**
- **Document Purpose:** Track version history, added modules, schema changes, and bug fixes.
- **Audit Finding:** Referenced in `README.md` Section 8 ("Changelog"), but missing from both the root directory and `docs/`.
- **Final Audit Status:** **NOT VERIFIED (MISSING FILE)**

---

## 5. Cross-Document Consistency Report (Phase 3)

A systematic comparison of all 11 existing Markdown documents revealed **8 major cross-document contradictions and inconsistencies** across the 19 evaluated categories.

### 5.1 Summary of All 19 Cross-Document Categories

| # | Category | Consistency Across Docs | Key Discrepancy Found |
|---|---|---|---|
| 1 | **Project Objectives** | **INCONSISTENT** | `README.md`, `ps.md`, `Architecture.md`, `ApiDocumentation.md`, `DataBase.md` say **Mining Safety**; project specification and remaining 5 docs target **General Workplace / Industrial Safety**. |
| 2 | **Technology Stack** | **INCONSISTENT** | `ps.md` specifies Node.js + Express + MongoDB + Mongoose + JWT + Socket.IO; `README.md` says "To be confirmed"; `DataBase.md` mentions UUID/ObjectId and "WebSockets or Supabase Realtime". |
| 3 | **System Architecture** | **CONSISTENT** | All docs agree on ESP32 (RC522 + Smoke + Flame) + Camera/ML -> Backend API -> Database -> Role-Based Frontend Dashboards. |
| 4 | **Backend Architecture** | **INCONSISTENT** | `ps.md` lists 8 route groups; `Architecture.md` lists 12 modules; `ApiDocumentation.md` defines 13 route groups (adding `/api/devices`, `/api/cameras`, `/api/admin`, `/api/blockchain`). |
| 5 | **Database Design** | **INCONSISTENT** | `ps.md` lists 6 collections; `Architecture.md` lists 10 collections; `DataBase.md` defines 12 entities (adding `zones`, `zoneAssignments`, `devices`, `cameras`, `incidentEvidence`, `auditLogs`). |
| 6 | **API Routes** | **INCONSISTENT** | Missing Worker self-service endpoints in `ApiDocumentation.md`; route groups differ between `ps.md` and `ApiDocumentation.md`. |
| 7 | **Authentication** | **CONSISTENT** | JWT / Bearer token for human users; separate device/service credentials for ESP32 and ML. |
| 8 | **User Roles** | **INCONSISTENT** | Role names vary: `ADMIN` (`ApiDocumentation.md`) vs. `administrator` (`DataBase.md`); `ps.md` omits Worker and Administrator dashboard flows. |
| 9 | **Worker Management** | **INCONSISTENT** | `ps.md` & `ApiDocumentation.md` use `workerId`, `role`, `department`, `assignedZone`, `rfidUid`; `DataBase.md` uses `workerId`, `employeeCode`, `name`, `rfidUid`, `zoneId`, `status` and lacks a link to `Users`. |
| 10 | **RFID Workflow** | **INCONSISTENT** | `ps.md` lists `UNKNOWN_RFID` as an incident type and requires duplicate scan prevention within a time window; `ApiDocumentation.md` & `DataBase.md` log `unknown_card` in `rfidLogs` without clarifying when an incident is triggered. |
| 11 | **Hardware Communication** | **INCONSISTENT** | `HARDWARE_SETUP.md` requires `firmwareVersion` and generic event payload; `ApiDocumentation.md` splits into `/api/rfid/scan`, `/api/sensors/events`, and `/api/devices/heartbeat` with different field names. |
| 12 | **ML Integration** | **INCONSISTENT** | 3 different JSON schemas for `POST /api/detections` across `ps.md`/`ApiDocumentation.md`, `DataBase.md`, and `ML_INTEGRATION.md`. |
| 13 | **Incident Management** | **INCONSISTENT** | Status enums differ: `OPEN, UNDER_REVIEW, VERIFIED, RESOLVED` (`ps.md`, `Architecture.md`) vs. `open, under_review, verified, resolved, rejected` (`DataBase.md`). Source reference field is named `source` (`ps.md`, `ApiDocumentation.md`) vs. `sourceId` (`DataBase.md`). |
| 14 | **Supervisor Verification** | **INCONSISTENT** | `ApiDocumentation.md` uses `POST /api/supervisor/incidents/:id/verify` and `/resolve`, but `DataBase.md` `Incidents` table lacks `verifiedBy`, `verifiedAt`, `verificationNotes`, and `resolutionNotes` columns! |
| 15 | **Administrator Permissions** | **INCONSISTENT** | Supervisor ability to manage workers is marked "Limited" in `Architecture.md` and `DataBase.md`, but omitted in `SECURITY_AND_ROLES.md` and `ApiDocumentation.md`. |
| 16 | **Real-Time Communication** | **CONSISTENT** | Event names defined in `ApiDocumentation.md` Section 14 (`rfid:scan`, `ppe:detection`, `sensor:alert`, `incident:new`, `incident:updated`, `device:status`, `camera:status`). |
| 17 | **Deployment Process** | **CONSISTENT** | All docs treat deployment as environment-driven with separate service secrets. |
| 18 | **Security Architecture** | **CONSISTENT** | All docs agree on backend-enforced RBAC, zone scoping for supervisors, device auth, and off-chain PII/media. |
| 19 | **Future Scope** | **INCONSISTENT** | Blockchain is listed under "Future Scope" in `README.md`, `ps.md`, `ApiDocumentation.md`, whereas **Tamper-Evident Incident Records** (via SHA-256 hashing + audit trail, with optional/planned blockchain anchoring) is one of the **7 main project capabilities**. |

### 5.2 Exact Corrections Needed for Cross-Document Consistency

1. **Unify Domain Terminology:** Replace all occurrences of *"Mining Safety"*, *"mining environment"*, *"mining zones"*, and *"MINING_WORKER"* in `README.md`, `docs/ps.md`, `docs/Architecture.md`, `docs/ApiDocumentation.md`, and `docs/DataBase.md` with **"Workplace & Industrial Safety"**, **"workplace zones"**, and **"INDUSTRIAL_WORKER"** (or job titles like `"Technician"`, `"Operator"`).
2. **Unify the `POST /api/detections` Payload:** Adopt a single schema supporting per-object confidence and missing PPE inference:
   ```json
   {
     "cameraCode": "CAM_001",
     "workerId": null,
     "modelVersion": "yolov8-ppe-v1",
     "detections": [
       { "class": "person", "confidence": 0.96 },
       { "class": "helmet", "confidence": 0.94 },
       { "class": "no_safety_vest", "confidence": 0.89 }
     ],
     "missingPPE": ["safety_vest"],
     "safetyStatus": "UNSAFE",
     "evidenceUrl": null,
     "timestamp": "2026-11-25T10:30:00Z"
   }
   ```
3. **Unify Sensor Event Payload (`POST /api/sensors/events`):** Standardize on `deviceCode`, `sensorType` (`SMOKE` | `FLAME`), `sensorValue` (number), `threshold` (number), `alertStatus` (`NORMAL` | `WARNING` | `CRITICAL`), `timestamp`.
4. **Unify Role & Status Enums (Uppercase Constants):**
   - Roles: `WORKER`, `SUPERVISOR`, `ADMIN`
   - Incident Statuses: `OPEN`, `UNDER_REVIEW`, `VERIFIED`, `RESOLVED`, `REJECTED`
   - Severity: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
5. **Complete the `Incidents` and `Workers` Schema in `DataBase.md`:**
   - Add `userId` (optional FK to `Users`) and `department` to `Workers`.
   - Add `verifiedBy`, `verifiedAt`, `verificationNotes`, `resolutionNotes`, `recordHash` (SHA-256), and `previousHash` to `Incidents`.

---

## 6. Hardware and IoT Audit & 7. RFID Integration Audit (Phase 4)

### 6.1 Hardware Scope Verification
- **Components Included:** ESP32 microcontroller, MFRC522 (13.56 MHz) RFID reader, 13.56 MHz RFID cards/tags, Smoke sensor module, Flame sensor module.
- **Smart Helmet Exclusion Verified:** Confirmed that **no smart helmet construction or helmet-mounted sensors** are included in the architecture or hardware documentation.
- **Supplementary Sensor Disclaimer Verified:** Smoke and flame sensors are properly classified as supplementary prototype demonstration components, not certified industrial safety instruments.

### 6.2 RFID System Audit Matrix

| RFID Requirement | Audit Status | Verification & Findings |
|---|---|---|
| **RC522 Wiring** | **DOCUMENTED ONLY** | `HARDWARE_SETUP.md` correctly maps RC522 to ESP32 VSPI (`3.3V->3V3`, `GND->GND`, `RST->GPIO 22`, `SDA/SS->GPIO 5`, `SCK->GPIO 18`, `MOSI->GPIO 23`, `MISO->GPIO 19`). |
| **ESP32 Communication** | **NOT IMPLEMENTED** | SPI to RC522 and Wi-Fi HTTP POST to `/api/rfid/scan` are documented, but no `.ino` / C++ firmware exists in the repo. |
| **RFID UID Reading** | **NOT IMPLEMENTED** | Needs `MFRC522` library UID byte-to-hex string conversion (e.g., uppercase 8/14-char hex without spaces). |
| **Worker Identification** | **DOCUMENTED ONLY** | Backend lookup by `rfidUid` in `Workers` collection is specified in `ApiDocumentation.md` and `DataBase.md`. |
| **Unknown-Card Handling** | **DOCUMENTED ONLY** | Documented to log `scanStatus: "unknown_card"` and return `recognized: false` without auto-creating a worker. Needs clear rule on whether repeated unknown scans create an `UNKNOWN_RFID` incident. |
| **Duplicate RFID Prevention** | **DOCUMENTED ONLY** | Mentioned in `ps.md` Section 6.2 ("within a configurable time window"), but missing from `DataBase.md` and `ApiDocumentation.md`. Needs both ESP32 local debounce (e.g., 3–5 seconds) and backend time-window deduplication (e.g., 60 seconds). |
| **Worker Registration & Zone Assignment** | **DOCUMENTED ONLY** | `POST /api/workers` maps `rfidUid` and `zoneId` to a worker profile. |
| **RFID Event Storage** | **DOCUMENTED ONLY** | `rfidLogs` entity specified with `workerId`, `rfidUid`, `deviceId`, `zoneId`, `scanTime`, `scanStatus`. |
| **Multiple ESP32 Device Support** | **DOCUMENTED ONLY** | Payloads include `deviceId` / `deviceCode`, allowing multiple ESP32 readers across different zones. |

### 6.3 Environmental Monitoring Audit Matrix (Smoke & Flame Sensors)

| Environmental Requirement | Audit Status | Verification & Findings |
|---|---|---|
| **Smoke Sensor Integration** | **DOCUMENTED ONLY** | Missing exact ESP32 GPIO pin assignment in `HARDWARE_SETUP.md` (must use `ADC1` e.g., `GPIO 34` + 3.3V voltage divider if using a 5V MQ-series sensor). |
| **Flame Sensor Integration** | **DOCUMENTED ONLY** | Missing exact ESP32 GPIO pin assignment in `HARDWARE_SETUP.md` (e.g., `GPIO 35` analog / `GPIO 27` digital). Note: common IR flame sensors are active-LOW digitally or drop voltage when flame is detected. |
| **Sensor Readings & Thresholds** | **NOT IMPLEMENTED** | Needs configurable thresholds in ESP32 firmware and backend validation. |
| **Alert & Incident Generation** | **DOCUMENTED ONLY** | `POST /api/sensors/events` -> creates `SMOKE_DETECTED` / `FLAME_DETECTED` incident when status is `CRITICAL`/`DANGER`. |
| **Device Identification & Event Storage** | **DOCUMENTED ONLY** | `sensorEvents` entity stores `deviceId`, `zoneId`, `sensorType`, `sensorValue`, `threshold`, `alertStatus`, `eventTime`. |
| **Dashboard Notification** | **NOT IMPLEMENTED** | Planned via `sensor:alert` and `incident:new` WebSocket events. |
| **Sensor Failure Handling** | **NOT IMPLEMENTED** | Missing detection for stuck/floating ADC pins (e.g., reading `0` or `4095` continuously or MQ heater warm-up period). |

### 6.4 Device Management Audit Matrix

| Device Management Requirement | Audit Status | Verification & Findings |
|---|---|---|
| **Device Registration & ID** | **DOCUMENTED ONLY** | `POST /api/devices` registers `deviceCode`, `deviceName`, `zoneId`. |
| **Device Heartbeat & Online/Offline Status** | **DOCUMENTED ONLY** | `POST /api/devices/heartbeat` updates `lastHeartbeat` and `status`. Backend needs a periodic check (or computed status) marking devices `OFFLINE` if `now - lastHeartbeat > 90s`. |
| **Multiple ESP32 Support** | **DOCUMENTED ONLY** | Supported by `deviceCode` and zone mapping in schema. |
| **Communication Failure Handling** | **DOCUMENTED ONLY** | Mentioned in `DEPLOYMENT.md` Section 5; ESP32 firmware needs Wi-Fi auto-reconnect and local ring-buffer/retry for failed HTTP POSTs. |
| **Device Authentication** | **DOCUMENTED ONLY** | Required by `SECURITY_AND_ROLES.md` Section 5, but `ApiDocumentation.md` and `DataBase.md` omit the `X-Device-Key` header and `deviceKeyHash` database field. |

---

## 8. AI/ML Integration Audit & 9. Camera Integration Audit (Phase 5)

### 8.1 AI/ML & Camera Audit Matrix

| # | Verification Item | Audit Status | Technical Finding |
|---|---|---|---|
| 1 | **ML Model Structure** | **NOT VERIFIED** | No model weights (`.pt`, `.onnx`) or Python scripts exist in the repository yet (developed by ML team member). |
| 2 | **Model Loading** | **NOT VERIFIED** | No inference script exists in `ml-model/`. |
| 3 | **Camera Input** | **NOT VERIFIED** | No OpenCV / RTSP / webcam capture script exists in the repository. |
| 4 | **Helmet Detection** | **DOCUMENTED ONLY** | Documented as `helmet` / `no_helmet` (or `MISSING_HELMET`). |
| 5 | **Safety Vest Detection** | **DOCUMENTED ONLY** | Documented as `safety_vest` / `no_safety_vest` (or `MISSING_SAFETY_VEST`). |
| 6 | **Missing PPE Detection** | **DOCUMENTED ONLY** | Documented in `ML_INTEGRATION.md` and `ApiDocumentation.md`. |
| 7 | **Confidence Scores** | **DOCUMENTED ONLY** | Float range `0.0` to `1.0` validated by backend (`ML_INTEGRATION.md`). |
| 8 | **Detection Output Format** | **INCONSISTENT IN DOCS** | Conflicts across `ML_INTEGRATION.md`, `ApiDocumentation.md`, and `DataBase.md` (see Section 5.2). |
| 9 | **Backend Integration** | **DOCUMENTED ONLY** | Via HTTP `POST /api/detections` authenticated with a service API key. |
| 10 | **Detection Storage** | **DOCUMENTED ONLY** | `PPE Detections` entity in `DataBase.md`. |
| 11 | **Incident Generation** | **DOCUMENTED ONLY** | `ML_INTEGRATION.md` specifies confidence threshold, persistence duration, and cooldown window to prevent per-frame incident spam. |
| 12 | **Camera Identification** | **DOCUMENTED ONLY** | `cameraCode` (e.g., `CAM_001`) resolved to registered `Cameras` record and `zoneId`. |
| 13 | **Multiple Camera Support** | **DOCUMENTED ONLY** | `Cameras` table and `/api/cameras` endpoints support multiple cameras mapped to zones. |
| 14 | **Model Inference Performance** | **NOT VERIFIED** | Cannot be benchmarked until ML inference code and model weights are committed. |
| 15 | **Error Handling** | **DOCUMENTED ONLY** | `ML_INTEGRATION.md` specifies idempotency keys, retry handling, and inactive-camera rejection. |

### 8.2 Worker Identification Constraint in Camera Detections
- **Audit Verification:** Both `Architecture.md` (Section 5.4), `DataBase.md` (Section 11), and `ML_INTEGRATION.md` (Section 5) explicitly enforce the rule that **camera-based PPE detection does NOT automatically identify a particular worker**, keeping `workerId: null` unless a reliable correlation mechanism (such as an active zone RFID check-in correlation window or explicit identification) is validated.

---

## 10. Backend Audit (Phase 6)

### 10.1 Backend Implementation Status
No backend code currently exists in the repository (`backend/` is missing). All backend modules—Authentication, Worker Management, Device Management, Camera Management, Incident Management, System Administration, Input Validation, Logging, and Database Integration—are currently **NOT IMPLEMENTED**.

### 10.2 Design & Contract Audit of Documented Backend (`ApiDocumentation.md` vs. Requirements)

Even before code is written, auditing `ApiDocumentation.md` against the Phase 6 requirements reveals several contract gaps that must be addressed when building the backend:

| Backend Module | Documented Endpoints | Design Gaps Identified in `ApiDocumentation.md` |
|---|---|---|
| **Authentication** | `POST /api/auth/login`, `GET /api/auth/me` | Missing `POST /api/auth/logout` or password change endpoint; role enum in login response (`ADMIN`) conflicts with `DataBase.md` (`administrator`). |
| **Worker Management** | `POST /api/workers`, `GET /api/workers`, `GET /api/workers/:id`, `PUT /api/workers/:id`, `DELETE /api/workers/:id` | Missing `GET /api/workers/me` for a logged-in Worker to view their own profile and safety compliance status. |
| **RFID Management** | `POST /api/rfid/scan`, `GET /api/rfid/logs` | Missing specification of the duplicate-scan cooldown response (e.g., `"duplicate": true, "cooldownRemainingSec": 45`) and automatic `UNKNOWN_RFID` incident creation rule. |
| **Device Management** | `POST /api/devices`, `GET /api/devices`, `POST /api/devices/heartbeat`, `GET /api/devices/:id` | Missing `PATCH /api/devices/:id` or `DELETE /api/devices/:id` for updating device zone or rotating device keys. |
| **Camera Management** | `POST /api/cameras`, `GET /api/cameras`, `PATCH /api/cameras/:id/status` | Missing camera heartbeat or automatic status update when `POST /api/detections` is received from an active camera. |
| **PPE Detections** | `POST /api/detections`, `GET /api/detections`, `GET /api/detections/:id` | Request payload conflicts with `ML_INTEGRATION.md`. Missing incident-cooldown linkage in response (e.g., returning `incidentCreated: true/false`, `incidentId`). |
| **Sensor Monitoring** | `POST /api/sensors/events`, `GET /api/sensors/events`, `GET /api/sensors/status` | Field names (`value`, `status`) conflict with `DataBase.md` (`sensorValue`, `threshold`, `alertStatus`). |
| **Incident Management** | `POST /api/incidents`, `GET /api/incidents`, `GET /api/incidents/:id`, `PATCH /api/incidents/:id/status` | Missing evidence upload/attachment endpoint (`POST /api/incidents/:id/evidence` or `GET /api/incidents/:id/evidence`) and tamper-evident hash verification endpoint (`GET /api/incidents/:id/verify-integrity`). |
| **Supervisor APIs** | `GET /api/supervisor/zones`, `POST /api/supervisor/incidents/:id/verify`, `POST /api/supervisor/incidents/:id/resolve` | `verify` endpoint should explicitly allow `VERIFIED` or `REJECTED` with mandatory `notes`, and compute the SHA-256 tamper-evident `recordHash` upon verification/resolution. |
| **Administrator APIs** | `GET /api/admin/overview`, `/api/admin/supervisors` (CRUD), `/api/admin/zones` (CRUD), `POST /api/admin/zones/:id/assign-supervisor`, `GET /api/admin/audit-logs` | Missing endpoint to unassign a supervisor from a zone or manage user roles/permissions (`GET/PATCH /api/admin/users`). |

---

## 11. Frontend Audit (Phase 7)

### 11.1 Frontend Implementation Status
No frontend directory or source code currently exists in the repository (`frontend/` is missing). Therefore, all frontend components are **NOT IMPLEMENTED / NOT VERIFIED**.

### 11.2 Audit of Required Frontend Views Against Backend API Contract

To ensure the three role-based dashboards work seamlessly once implemented (or integrated from the frontend developer's branch), the following backend-to-frontend requirements were audited:

1. **Worker Dashboard Requirements:**
   - Needs personal worker profile, personal PPE safety compliance status, personal notifications/alerts, personal incident history, and assigned zone safety rules.
   - **Audit Finding:** `ApiDocumentation.md` currently lacks dedicated worker-scoped endpoints (or explicit documentation that `GET /api/dashboard/overview` and `GET /api/incidents` filter automatically to `workerId == currentUser.workerId` when `role === 'WORKER'`).
2. **Supervisor Dashboard Requirements:**
   - Needs assigned zones list, assigned-zone workers, live safety alerts (PPE + Smoke + Flame), incident review queue with evidence viewer, incident verification/rejection modal with notes, incident resolution action, and zone-wise compliance reports.
   - **Audit Finding:** Supported by `/api/supervisor/*`, `/api/incidents`, and `/api/dashboard/*`, provided every endpoint filters by the supervisor's `Zone Assignments`.
3. **Administrator Dashboard (Higher Authority) Requirements:**
   - Needs system-wide overview KPIs, worker CRUD + RFID assignment, supervisor CRUD + zone assignment, zone CRUD, ESP32 device management (with online/offline heartbeat status), camera management, system-wide incidents + tamper-evident integrity badge, advanced analytics charts, audit log viewer, and role/permission management.

---

## 12. Database Audit (Phase 8)

### 12.1 Actual Database Implementation Status
No database instance, connection file, Mongoose schema, Prisma schema, or SQL migration exists in the repository. All database components are **DOCUMENTED ONLY / NOT IMPLEMENTED**.

### 12.2 Logical Schema Audit of `docs/DataBase.md`

Auditing the 12 entities in `docs/DataBase.md` against all system requirements reveals a strong foundation with **5 critical schema deficiencies** that must be corrected before coding the models:

| # | Entity in `DataBase.md` | Logical Audit Finding | Required Schema Fix |
|---|---|---|---|
| 1 | **Users** & **Workers** | No foreign key links a `Worker` login account in `Users` to their physical worker profile in `Workers`. | Add `userId` (nullable unique FK -> `Users.userId`) and `department` to `Workers`. |
| 2 | **Devices** | No credential field exists to authenticate ESP32 requests (`SECURITY_AND_ROLES.md` Section 5). | Add `apiKeyHash` (String) and `firmwareVersion` (String) to `Devices`. |
| 3 | **Cameras** | No credential or stream/source metadata field for ML service validation. | Add `streamUrl` / `sourceIdentifier` (optional) and `lastDetectionAt` to `Cameras`. |
| 4 | **Incidents** | Missing verification metadata and tamper-evident hash columns required by `ps.md`, `ApiDocumentation.md`, and Capability #6. | Add `verifiedBy` (FK -> `Users`), `verifiedAt` (Timestamp), `verificationNotes` (String), `resolvedBy` (FK -> `Users`), `resolutionNotes` (String), `recordHash` (SHA-256 String), and `previousHash` (SHA-256 String for hash-chaining). |
| 5 | **Audit Logs** | Good structure (`actorId`, `actorRole`, `action`, `entityType`, `entityId`, `details`, `timestamp`), but lacks tamper-evidence. | Add `ipAddress` (optional) and `logHash` / `previousLogHash` (optional SHA-256 chain) to make audit logs verifiable and immutable. |

### 12.3 Indexing & Constraint Verification
The index recommendations in `DataBase.md` Section 17 (`Users.email` unique, `Workers.employeeCode` unique, `Workers.rfidUid` unique sparse/partial when assigned, `Devices.deviceCode` unique, `Cameras.cameraCode` unique, `Zones.zoneCode` unique, plus compound timestamp indexes on `RFID Logs`, `PPE Detections`, `Sensor Events`, `Incidents`, and `Audit Logs`) are **technically sound** and must be enforced via database schema indexes (`unique: true`, compound `.index()` definitions).

---

## 13. Security Audit (Phase 9)

### 13.1 Repository Secret Inspection
- **Verified Clean:** No `.env` files, hardcoded passwords, API keys, JWT secrets, or database connection strings exist anywhere in the repository or Git commit history (`4f6ee3c`).
- **Missing Safeguard:** `.gitignore` is currently **missing** from the repository root. If a developer creates a `.env` file or `node_modules/` right now and runs `git add .`, secrets and dependencies could be accidentally committed. Creating `.gitignore` and `.env.example` is an immediate Prerequisite Priority-1 action.

### 13.2 Security Controls Audit Matrix

| Security Control | Current Status | Audit Assessment & Requirement for Implementation |
|---|---|---|
| **Password Hashing** | **DOCUMENTED ONLY** | Must use `bcryptjs` / `bcrypt` (cost factor $\ge 10$) or `argon2id`. Never store or log plaintext passwords. |
| **JWT Security** | **DOCUMENTED ONLY** | Must sign with strong `JWT_SECRET` ($\ge 256$-bit entropy), set expiration (e.g., `8h`), and verify signature and active user status in auth middleware. |
| **Role Hierarchy Enforcement** | **DOCUMENTED ONLY** | Must enforce `WORKER` < `SUPERVISOR` < `ADMIN` on every route via middleware (`requireAuth`, `requireRole(['SUPERVISOR', 'ADMIN'])`). |
| **Supervisor Zone Isolation** | **DOCUMENTED ONLY** | Must query `Zone Assignments` for the authenticated supervisor and filter all queries (`workers`, `incidents`, `rfidLogs`, `detections`, `sensorEvents`, `devices`, `cameras`) by `zoneId IN assignedZoneIds`. Reject cross-zone ID access (`IDOR`) with `403 Forbidden`. |
| **Worker Data Protection** | **DOCUMENTED ONLY** | A `WORKER` token must only access their own linked `workerId` record and their own incidents/alerts. |
| **Administrator Permissions** | **DOCUMENTED ONLY** | Only `ADMIN` can create/modify supervisors, manage zones, assign supervisors to zones, register devices/cameras, or view system-wide audit logs. |
| **Device & ML Authentication** | **DOCUMENTED ONLY** | ESP32 endpoints (`/api/rfid/scan`, `/api/sensors/events`, `/api/devices/heartbeat`) must require a valid `X-Device-Key` matching the registered device's hashed key. ML endpoint (`POST /api/detections`) must require a valid `X-ML-Service-Key`. |
| **API Input Validation** | **DOCUMENTED ONLY** | Every POST/PUT/PATCH endpoint must validate schema types, enum values, confidence bounds (`0 <= confidence <= 1`), and string lengths using a validation library (e.g., `zod`, `joi`, or `express-validator`). |
| **Evidence Access Control** | **DOCUMENTED ONLY** | Evidence images/files must not be served from a public static folder without auth; serve through an authenticated route that checks role and zone permissions. |
| **Audit Logging & Error Leakage** | **DOCUMENTED ONLY** | Log all state-mutating security actions to `Audit Logs`. Production error handler must return sanitized messages without stack traces or DB internals. |

---

## 14. Seven Main Project Capabilities Verification (Phase 10)

All seven core capabilities are evaluated below as active project scope (with blockchain anchoring properly separated from local SHA-256 tamper-evident records).

| # | Core Project Capability | Implementation Status | Relevant Files | Evidence & Missing Components | Testing & Demo Approach |
|---|---|---|---|---|---|
| **1** | **Real-Time Dashboard Updates** | **DOCUMENTED ONLY** | `docs/Architecture.md` (§11), `docs/ApiDocumentation.md` (§14) | **Evidence:** 7 WebSocket event names documented (`rfid:scan`, `ppe:detection`, `sensor:alert`, `incident:new`, `incident:updated`, `device:status`, `camera:status`).<br>**Missing:** Socket.IO / WebSocket server integration, JWT handshake auth, zone-based room broadcasting, and frontend event listeners. | **Test:** Trigger an RFID scan or sensor POST and verify connected Supervisor/Admin dashboards update in $< 1\text{ s}$ without page refresh.<br>**Demo:** Side-by-side live view of ESP32/ML trigger and instant dashboard alert card + toast notification. |
| **2** | **Advanced Safety Analytics** | **DOCUMENTED ONLY** | `docs/Architecture.md` (§12), `docs/ApiDocumentation.md` (§13) | **Evidence:** Planned KPIs and `/api/dashboard/analytics` & `/api/dashboard/zones` documented.<br>**Missing:** Aggregation queries for PPE compliance %, violation breakdown by type/zone, time-series incident trends, worker compliance history, and device/camera uptime stats. | **Test:** Seed known detections/incidents and assert exact compliance % and zone counts from `/api/dashboard/analytics`.<br>**Demo:** Show interactive charts comparing zone risk, compliance trends, and violation types. |
| **3** | **Multi-Camera Support** | **DOCUMENTED ONLY** | `docs/Architecture.md` (§5.4, §13.1), `docs/ApiDocumentation.md` (§7), `docs/DataBase.md` (§9) | **Evidence:** `Cameras` schema (`cameraCode`, `zoneId`, `status`, `lastHeartbeat`) and `/api/cameras` endpoints defined.<br>**Missing:** Backend camera registry CRUD, zone auto-resolution on `POST /api/detections`, and ML script ability to tag detections with `cameraCode`. | **Test:** Register `CAM_001` (Zone A) and `CAM_002` (Zone B); submit detections from both; verify Zone A Supervisor only sees `CAM_001`.<br>**Demo:** Show camera status grid and zone-attributed detections from multiple camera feeds/sources. |
| **4** | **Multiple ESP32 Device Support** | **DOCUMENTED ONLY** | `docs/Architecture.md` (§4.5, §13.2), `docs/ApiDocumentation.md` (§6), `docs/DataBase.md` (§8) | **Evidence:** `Devices` schema (`deviceCode`, `zoneId`, `status`, `lastHeartbeat`) and `/api/devices` + `/api/devices/heartbeat` defined.<br>**Missing:** Backend device registry, per-device authentication key, heartbeat timeout evaluator, and firmware configurable `DEVICE_CODE`. | **Test:** Register `ESP32_001` and `ESP32_002`; test heartbeat online status and automatic offline transition after timeout.<br>**Demo:** Live ESP32 hardware unit as `ESP32_001` alongside a second unit or simulator as `ESP32_002` in another zone. |
| **5** | **Advanced Role and Permission Management** | **DOCUMENTED ONLY** | `docs/Architecture.md` (§9), `docs/SECURITY_AND_ROLES.md`, `docs/DataBase.md` (§4, §7, §18) | **Evidence:** 3-tier hierarchy (`WORKER`, `SUPERVISOR`, `ADMIN`) and `Zone Assignments` table documented.<br>**Missing:** JWT auth middleware, RBAC middleware, zone-scope query filter middleware, and Admin endpoints for managing supervisor zone assignments. | **Test:** Run test cases `T09`, `T10`, `T11`, `T14` verifying `403 Forbidden` on cross-zone supervisor requests and worker admin requests.<br>**Demo:** Switch between Worker, Supervisor (Zone A), and Admin views to demonstrate strict data isolation. |
| **6** | **Tamper-Evident Incident Records** | **DOCUMENTED ONLY** | `docs/Architecture.md` (§14), `docs/DataBase.md` (§14, §15, §20) | **Evidence:** Canonical incident SHA-256 hashing and evidence file hashing documented; blockchain explicitly marked as future scope.<br>**Missing:** Practical off-chain cryptographic implementation: canonical JSON serializer + **SHA-256 record hashing**, **hash-chaining (`previousHash`)**, evidence file SHA-256 hashing, immutable audit log entries, and a **Live Integrity Verification API (`GET /api/incidents/:id/verify-integrity`)** that recomputes the SHA-256 hash and detects any database tampering immediately (without requiring blockchain deployment). | **Test:** Verify an incident (generating its SHA-256 hash), call `verify-integrity` (`valid: true`), manually alter the incident description in DB, and re-run `verify-integrity` (`valid: false, tampered: true`).<br>**Demo:** Click "Verify Record Integrity" badge on an incident in the Admin/Supervisor UI to prove cryptographic tamper detection live. |
| **7** | **Scalable Deployment Architecture** | **DOCUMENTED ONLY** | `docs/Architecture.md` (§15), `docs/DEPLOYMENT.md` | **Evidence:** Modular separation of ESP32, ML service, REST/WS Backend, Database, and Frontend documented.<br>**Missing:** Environment configuration (`.env.example`), decoupled service contracts, health-check endpoints (`GET /api/health`), and deployment scripts. | **Test:** Start backend, frontend, and ML service via environment variables without hardcoded localhost URLs.<br>**Demo:** Show clean modular architecture, health status endpoint, and multi-device ingestion. |

---

## 15. Missing Features & 16. Recommended Improvements (Phase 11)

Thinking as a Senior Software Architect and Hackathon Judge, below are the highest-value, practical improvements organized across the four evaluation pillars. None of these add bloat; every recommendation directly strengthens prototype reliability, judge impact, and safety realism.

### 15.1 Safety Improvements

#### S1. Temporal Debouncing & Cooldown Engine for ML PPE Violations and Sensor Alerts
1. **What problem does it solve?** A camera running at 15–30 FPS or a triggered smoke sensor loop can send dozens of identical violation payloads per second, flooding the database with hundreds of duplicate `OPEN` incidents for a single event.
2. **Why is it important?** Without deduplication, the Supervisor dashboard becomes unusable within seconds during a live demo.
3. **How can we implement it?** In the backend incident service, before creating an incident for `(zoneId, cameraId/deviceId, incidentType)`, check if an active (`OPEN` or `UNDER_REVIEW`) incident of the same type from the same source was created within the last `COOLDOWN_SECONDS` (e.g., 60s). If so, increment an `occurrenceCount` and update `lastDetectedAt` on the existing incident rather than creating a duplicate row.
4. **Which module will be affected?** Backend (`detections` controller, `sensors` controller, `incidents` service, `Incidents` model).
5. **Essential or Optional?** **Essential**
6. **Implementation Difficulty:** Easy
7. **How should we test it?** Send 10 rapid `POST /api/detections` requests with `missingPPE: ["helmet"]` from `CAM_001` within 5 seconds; verify all 10 detections are logged, only **1** incident is created, and its `occurrenceCount` equals `10`.

#### S2. Temporal RFID-to-Zone Active Presence Tracking (Context-Aware Safety)
1. **What problem does it solve?** While camera PPE detection cannot directly recognize a worker's face/identity, supervisors still need to know *which workers are currently checked into the zone* where a PPE violation or smoke/flame hazard just occurred.
2. **Why is it important?** Bridges the RFID system and the Camera/Sensor system ethically and accurately without falsely claiming facial recognition: when an incident occurs in Zone A, the incident detail view can list *"Workers Currently Checked Into Zone A (via RFID)"* while keeping `workerId` null on the unverified camera detection unless only a single worker is present or confirmed by the supervisor.
3. **How can we implement it?** Track `currentZoneId` and `lastRfidScanAt` on the `Workers` record whenever `/api/rfid/scan` succeeds, and display active workers in that zone alongside any zone incident.
4. **Which module will be affected?** Backend (`rfid` service, `workers` model, `incidents` details API) and Frontend (Supervisor Incident Review modal).
5. **Essential or Optional?** **Essential**
6. **Implementation Difficulty:** Easy
7. **How should we test it?** Scan Worker `W001` via RFID in Zone 1, then trigger a `MISSING_HELMET` camera detection in Zone 1; verify the incident shows `workerId: null` (unconfirmed) alongside `activeZoneWorkers: [W001]` so the supervisor can confirm and assign if appropriate.

#### S3. Automatic Severity & Alert Escalation Rules
1. **What problem does it solve?** Smoke and flame hazards require immediate critical priority compared to an unknown RFID scan, and unacknowledged `CRITICAL` incidents shouldn't sit unnoticed.
2. **Why is it important?** Demonstrates real industrial safety logic during judging.
3. **How can we implement it?** Map incident types to deterministic default severities (`FLAME_DETECTED` -> `CRITICAL`, `SMOKE_DETECTED` -> `HIGH`/`CRITICAL`, `MISSING_HELMET` -> `HIGH`, `MISSING_SAFETY_VEST` -> `MEDIUM`, `UNKNOWN_RFID` -> `LOW`/`MEDIUM`) and flag any `CRITICAL` incident unverified for $> 5$ minutes as `ESCALATED` on the Admin dashboard.
4. **Which module will be affected?** Backend (`incidents` service) and Frontend (Alert banners).
5. **Essential or Optional?** **Important**
6. **Implementation Difficulty:** Easy
7. **How should we test it?** Submit a flame event and verify it automatically receives `severity: "CRITICAL"` and triggers a top-priority alert event.

---

### 15.2 Reliability Improvements

#### R1. Automated Heartbeat Timeout Monitor for ESP32 Devices & Cameras
1. **What problem does it solve?** If an ESP32 loses power or Wi-Fi disconnects, its database status remains `ONLINE` forever unless the backend actively checks `lastHeartbeat`.
2. **Why is it important?** Test case `T12` in `TESTING.md` explicitly requires devices to transition to `OFFLINE` when heartbeats stop.
3. **How can we implement it?** Compute effective device/camera status dynamically on read (or via a lightweight 30-second background `setInterval` job in Node.js) that marks any device/camera with `Date.now() - lastHeartbeat > 90000` (90 seconds) as `OFFLINE` and emits a `device:status` WebSocket event.
4. **Which module will be affected?** Backend (`devices` and `cameras` service).
5. **Essential or Optional?** **Essential**
6. **Implementation Difficulty:** Easy
7. **How should we test it?** Send a heartbeat from `ESP32_001`, wait past the configured timeout threshold (e.g., 10s in test mode), and verify `GET /api/devices` returns `status: "OFFLINE"`.

#### R2. ESP32 Non-Blocking Firmware Loop with Local Ring Buffer & Sensor Warm-Up Filtering
1. **What problem does it solve?** Blocking `delay()` calls in ESP32 Arduino sketches freeze RFID scanning while sending HTTP requests, and cold-boot MQ smoke sensors produce false triggers during their initial heater warm-up.
2. **Why is it important?** Prevents missed RFID card taps and false smoke alarms during live hardware demonstrations.
3. **How can we implement it?** Use `millis()` non-blocking timers in the ESP32 sketch: poll RC522 every `50ms`, sample smoke/flame sensors every `500ms` with a 5-sample moving average, send heartbeats every `30000ms`, enforce a `15000ms` boot warm-up grace period for the smoke sensor, and queue up to 10 events in a struct array if Wi-Fi temporarily drops.
4. **Which module will be affected?** Hardware (`hardware/esp32/` firmware).
5. **Essential or Optional?** **Essential**
6. **Implementation Difficulty:** Medium
7. **How should we test it?** Scan an RFID card while a sensor heartbeat is due; verify the card reads smoothly without freezing and noisy single-spike ADC readings are filtered out.

---

### 15.3 Analytics Improvements

#### A1. Real-Time Zone Risk Score & PPE Compliance Calculator
1. **What problem does it solve?** Raw counts of detections and incidents are hard for supervisors and judges to interpret at a glance.
2. **Why is it important?** Gives the Supervisor and Administrator dashboards meaningful, formula-driven metrics backed by real database queries:
   $$\text{PPE Compliance \%} = \left( \frac{\text{Safe Detections}}{\text{Total Detections}} \right) \times 100$$
3. **How can we implement it?** Aggregate `PPE Detections` (`safetyStatus === 'SAFE'` vs. total) and active `Incidents` weighted by severity per zone in `GET /api/dashboard/analytics` and `GET /api/dashboard/zones`.
4. **Which module will be affected?** Backend (`dashboard` controller) and Frontend (Supervisor/Admin analytics cards).
5. **Essential or Optional?** **Essential**
6. **Implementation Difficulty:** Easy
7. **How should we test it?** Insert 8 `SAFE` detections and 2 `UNSAFE` detections in Zone A; verify `/api/dashboard/zones` reports `80.0%` compliance for Zone A.

---

### 15.4 Security & Tamper-Evidence Improvements

#### SEC1. Off-Chain Cryptographic SHA-256 Hash Chaining & Live Integrity Verifier (Capability #6)
1. **What problem does it solve?** Blockchain is planned for future scope, but Capability #6 (**Tamper-Evident Incident Records**) is one of the 7 main project capabilities required for the prototype.
2. **Why is it important?** We can deliver **100% real, working, verifiable tamper-evident incident records right now** in Node.js using Python/Node stdlib `crypto.createHash('sha256')` without needing an external blockchain node! Every verified incident generates a deterministic SHA-256 hash over its canonical fields (`incidentId`, `incidentType`, `zoneId`, `sourceId`, `status`, `verifiedBy`, `verifiedAt`, `evidenceFileHash`, `previousIncidentHash`), creating an immutable cryptographic hash chain. It is also 100% ready to anchor its root hash onto a smart contract later.
3. **How can we implement it?**
   - On incident verification/resolution, compute `recordHash = SHA256(canonicalJson(incident) + previousHash)`.
   - Provide `GET /api/incidents/:id/verify-integrity` (and `GET /api/admin/verify-chain`) which recomputes the SHA-256 hash from current DB fields and returns `{ verified: true/false, storedHash, computedHash, chainIntact: true/false }`.
4. **Which module will be affected?** Backend (`incidents` service, `cryptoHash` utility) and Frontend (Incident integrity verification badge/button).
5. **Essential or Optional?** **Essential (Fulfills Capability #6 genuinely)**
6. **Implementation Difficulty:** Easy
7. **How should we test it?** Verify an incident, check `/verify-integrity` returns `verified: true`, modify a field directly in the database, and confirm `/verify-integrity` immediately flags `verified: false` (tamper detected).

---

## 17. Prioritized Development Roadmap (Phase 12)

Because the repository currently has documentation only, the roadmap is ordered sequentially so each module builds cleanly on the last without rework.

### PRIORITY 1 – CRITICAL (Must Be Completed for Core Prototype Operation)

| Order | Task Name | Problem | Recommended Solution | Files / Modules Affected | Dependencies | Difficulty | Testing Requirements | Expected Outcome |
|---|---|---|---|---|---|---|---|---|
| **1.1** | **Repository Hygiene & Canonical Data Contract Alignment** | `.gitignore` and `.env.example` are missing; documentation has mining references and conflicting JSON schemas. | Create `.gitignore` and `.env.example`; align canonical enums and JSON contracts across docs (once approved). | `.gitignore`, `.env.example`, `docs/*`, `README.md` | None | Easy | Verify `git status` ignores `.env` and `node_modules/`. | Clean repo foundation ready for code without secret leakage. |
| **1.2** | **Backend Foundation & Database Schema Models** | No backend server or database models exist. | Initialize Node.js + Express backend in `backend/` with Mongoose/MongoDB connection and all 12 canonical models (`User`, `Worker`, `Zone`, `ZoneAssignment`, `Device`, `Camera`, `RfidLog`, `PpeDetection`, `SensorEvent`, `Incident`, `IncidentEvidence`, `AuditLog`) plus seed script for demo accounts/zones. | `backend/package.json`, `backend/src/config/db.js`, `backend/src/models/*`, `backend/src/seed/*` | Task 1.1 | Medium | Connect to MongoDB, run seed script, verify unique indexes and seeded Admin/Supervisor/Worker accounts. | Working database layer with all 12 entities and demo seed data. |
| **1.3** | **Authentication, RBAC & Zone-Scope Middleware** | Protected routes and role hierarchy (`WORKER`, `SUPERVISOR`, `ADMIN`) plus device/ML API key checks are not implemented. | Implement `bcrypt` password hashing, JWT login (`/api/auth/login`, `/api/auth/me`), `requireAuth`, `requireRole`, supervisor zone-scoping helper, `requireDeviceAuth` (`X-Device-Key`), and `requireMlAuth` (`X-ML-Service-Key`). | `backend/src/middleware/auth.js`, `backend/src/routes/auth.routes.js`, `backend/src/controllers/auth.controller.js` | Task 1.2 | Medium | Test cases `T03`, `T10`, `T11`: verify JWT login, role denial (`403`), and device API key validation. | End-to-end backend security enforcing Worker, Supervisor, Admin, Device, and ML boundaries. |
| **1.4** | **Zones, Workers, Devices & Cameras CRUD APIs** | Hardware and ML ingestion require registered zones, workers (with RFID UIDs), ESP32 devices, and cameras. | Implement `/api/admin/zones`, `/api/workers` (including `/api/workers/me`), `/api/devices` (with `/heartbeat`), and `/api/cameras` with audit logging. | `backend/src/routes/*`, `backend/src/controllers/*` | Task 1.3 | Medium | Register test zone, worker with RFID UID, ESP32 device, and camera; verify heartbeat updates device status. | Complete registry of workers, zones, ESP32 units, and cameras. |
| **1.5** | **RFID, Sensor & ML Detection Ingestion + Incident Engine** | Core safety events from ESP32 and ML service need ingestion, deduplication, and automatic incident creation. | Implement `POST /api/rfid/scan` (with duplicate cooldown & unknown card handling), `POST /api/sensors/events` (smoke/flame threshold & alert status), `POST /api/detections` (PPE violation check + cooldown), and `/api/incidents` + `/api/supervisor/incidents/:id/verify` & `/resolve`. | `backend/src/controllers/rfid.controller.js`, `sensor.controller.js`, `detection.controller.js`, `incident.controller.js`, `services/incident.service.js` | Task 1.4 | Medium | Test cases `T01`–`T09`: verify RFID scan, unknown card, smoke/flame alert, PPE violation incident creation, deduplication cooldown, and supervisor verification. | Complete backend event-to-incident pipeline. |
| **1.6** | **Frontend Role-Based Dashboards Integration** | Worker, Supervisor, and Administrator dashboards need to be built/connected to the backend REST & WebSocket APIs. | Implement/integrate the Frontend in `frontend/` with Login, Worker Dashboard, Supervisor Dashboard (zone alerts, incident review/verify/resolve), and Admin Dashboard (system overview, CRUD management, analytics, audit logs). | `frontend/src/*` | Task 1.5 | Medium–Hard | Verify login and role-based routing for Worker, Supervisor (assigned zone only), and Admin (all zones). | Working role-based UI for all three user tiers. |
| **1.7** | **ESP32 Firmware (RC522 + Smoke + Flame + Heartbeat)** | No ESP32 firmware exists in the repository. | Create `hardware/esp32/smartppe_node/smartppe_node.ino` with non-blocking SPI RC522 UID scanning, ADC1 smoke/flame reading with warm-up & moving-average filter, HTTP POST client with `X-Device-Key`, and 30s heartbeat. | `hardware/esp32/smartppe_node/smartppe_node.ino` | Task 1.5 | Medium | Upload to ESP32 or test against local backend; verify card scans and sensor triggers appear in DB. | Ready-to-flash ESP32 firmware supporting multiple device IDs. |
| **1.8** | **ML Camera Inference Bridge & Evidence Snapshot Integration** | ML PPE detection output must send structured JSON and optional evidence snapshots to `POST /api/detections`. | Integrate or create the Python ML inference bridge in `ml-model/` that captures camera frames, runs the PPE model, applies frame cooldown, saves violation snapshots, and POSTs to `/api/detections` with `X-ML-Service-Key`. | `ml-model/*` | Task 1.5 | Medium | Run inference on test video/webcam; verify PPE violations and snapshots arrive in backend and trigger incidents. | Live camera-to-dashboard PPE detection pipeline. |

### PRIORITY 2 – IMPORTANT (Reliability, Tamper-Evidence, Real-Time & Analytics)

| Order | Task Name | Problem | Recommended Solution | Files / Modules Affected | Dependencies | Difficulty | Testing Requirements | Expected Outcome |
|---|---|---|---|---|---|---|---|---|
| **2.1** | **WebSocket (Socket.IO) Real-Time Event Broadcasting** | Dashboards shouldn't require manual refresh to see live RFID scans, sensor alerts, or PPE incidents. | Integrate Socket.IO on backend and frontend; authenticate sockets with JWT; join zone-specific rooms; emit `rfid:scan`, `ppe:detection`, `sensor:alert`, `incident:new`, `incident:updated`, `device:status`, `camera:status`. | `backend/src/socket.js`, `frontend/src/services/socket.js` | Task 1.5, 1.6 | Easy–Medium | Test case `T13`: trigger API event and assert instant UI update in connected browser tab. | True real-time dashboard updates (Capability #1). |
| **2.2** | **Cryptographic SHA-256 Tamper-Evident Incident Ledger** | Capability #6 requires tamper-evident incident records without relying on unimplemented blockchain claims. | Compute canonical SHA-256 `recordHash` + `previousHash` chain + evidence file SHA-256 hash when incidents are verified/resolved; expose `GET /api/incidents/:id/verify-integrity` and UI verification badge. | `backend/src/utils/hash.js`, `backend/src/controllers/incident.controller.js`, `frontend/*` | Task 1.5 | Easy | Modify an incident field in MongoDB and verify `/verify-integrity` immediately reports `tampered: true`. | Working, demonstrable tamper-evident incident records (Capability #6). |
| **2.3** | **Automated Device & Camera Heartbeat Offline Detector** | Disconnected ESP32s or cameras stay `ONLINE` indefinitely. | Add a background timer checking `lastHeartbeat` every 30s; mark stale devices/cameras (`>90s`) `OFFLINE` and emit status events. | `backend/src/services/heartbeat.service.js` | Task 1.4, 2.1 | Easy | Test case `T12`: stop heartbeats and confirm status changes to `OFFLINE` automatically. | Reliable device & camera health monitoring. |
| **2.4** | **Advanced Safety Analytics & Zone Risk Aggregations** | Supervisors and Admins need compliance %, trend charts, and zone risk breakdowns. | Implement `/api/dashboard/overview`, `/api/dashboard/analytics`, `/api/dashboard/zones`, and `/api/dashboard/recent-activities` using MongoDB aggregation pipelines. | `backend/src/controllers/dashboard.controller.js`, `frontend/*` | Task 1.5, 1.6 | Medium | Verify compliance % and incident trend counts match seeded database records. | Complete Advanced Safety Analytics (Capability #2). |

### PRIORITY 3 – ADVANCED (Hackathon Competitiveness & Demo Polish)

| Order | Task Name | Problem | Recommended Solution | Files / Modules Affected | Dependencies | Difficulty | Testing Requirements | Expected Outcome |
|---|---|---|---|---|---|---|---|---|
| **3.1** | **Hardware & ML Demo Simulator Script (Fallback Mode)** | Live hardware or Wi-Fi can fail at a hackathon venue (`DEPLOYMENT.md` §7 requires fallback recorded events). | Build a clearly labeled CLI simulator (`backend/src/scripts/demo-simulator.js`) that sends realistic RFID scans, multi-camera PPE detections, and smoke/flame events through the real authenticated REST endpoints. | `backend/src/scripts/demo-simulator.js` | Task 1.5 | Easy | Run simulator against backend and verify full real-time dashboard workflow. | Fail-safe hackathon demonstration capability. |
| **3.2** | **Automated Integration & Security Test Suite** | `TESTING.md` defines `T01`–`T14`, but no automated test script exists. | Create an automated API integration test script running `T01`–`T17` and outputting a verification report. | `backend/tests/integration.test.js`, `docs/TESTING.md` | Task 1.5, 2.2 | Medium | Run `npm test` and confirm all 17 functional & security test cases pass. | Verified test evidence documented in `TESTING.md`. |

### PRIORITY 4 – FUTURE SCOPE (Post-Prototype Enhancements)

| Order | Task Name | Problem | Recommended Solution | Files / Modules Affected | Dependencies | Difficulty | Testing Requirements | Expected Outcome |
|---|---|---|---|---|---|---|---|---|
| **4.1** | **On-Chain Blockchain Hash Anchoring** | Anchoring SHA-256 incident hashes to an external EVM testnet smart contract. | Deploy a minimal Solidity `IncidentRegistry` contract (`recordHash(bytes32 incidentId, bytes32 hash)`) on Sepolia/Polygon Amoy or local Hardhat node and connect `/api/blockchain/record` & `/verify/:incidentId`. | `backend/src/services/blockchain.service.js`, `contracts/*` | Task 2.2 | Medium | Anchor a verified incident's SHA-256 hash and verify transaction receipt on-chain. | Optional blockchain extension built cleanly on top of Task 2.2's SHA-256 ledger. |

---

## 18. Documentation Correction Checklist (Phase 13)

| Document | Actual Path in Repo | Current Status | Required Improvements | Priority |
|---|---|---|---|---|
| `README.md` | `README.md` | **NEEDS IMPROVEMENT** | Remove all "Mining Safety" framing -> replace with "Workplace & Industrial Safety Monitoring"; add 3 user roles (Worker, Supervisor, Admin); add prototype disclaimer for smoke/flame sensors; update tech stack and links to `docs/`. | **High** |
| `ps.md` | `docs/ps.md` | **NEEDS IMPROVEMENT** | Replace "mining" references with general workplace/industrial safety; expand Section 7 from 6 to 12 collections; add `/api/devices`, `/api/cameras`, `/api/admin` to Section 8; align `POST /api/detections` payload with `ML_INTEGRATION.md`. | **High** |
| `ARCHITECTURE.md` | `docs/Architecture.md` | **NEEDS IMPROVEMENT** | Standardize filename casing; replace ~25 "mining" references with workplace/industrial safety; add `zoneAssignments` and `incidentEvidence` to Section 7.1; unify ML payload in Section 5.3; clarify SHA-256 off-chain tamper-evidence vs. optional blockchain anchoring. | **High** |
| `API_DOCUMENTATION.md` | `docs/ApiDocumentation.md` | **NEEDS IMPROVEMENT** | Standardize filename; add `X-Device-Key` and `X-ML-Service-Key` headers; add Worker self-service endpoints (`/api/workers/me`, `/api/workers/me/incidents`); add `/api/incidents/:id/verify-integrity`; unify role/status/sensor/detection schemas with `DataBase.md` and `ML_INTEGRATION.md`. | **High** |
| `DATABASE_SCHEMA.md` | `docs/DataBase.md` | **NEEDS IMPROVEMENT** | Standardize filename; replace "mining" references; add `userId` (FK to `Users`) and `department` to `Workers`; add `apiKeyHash` to `Devices`; add `verifiedBy`, `verifiedAt`, `verificationNotes`, `resolutionNotes`, `recordHash`, `previousHash` to `Incidents`. | **High** |
| `SECURITY_AND_ROLES.md` | `docs/SECURITY_AND_ROLES.md` | **PARTIALLY VERIFIED** | Add explicit password hashing standard (`bcrypt`), JWT expiry rules, and exact device/ML header names (`X-Device-Key`, `X-ML-Service-Key`); align Supervisor worker-access wording with `Architecture.md`. | **High** |
| `HARDWARE_SETUP.md` | `docs/HARDWARE_SETUP.md` | **NEEDS IMPROVEMENT** | Add explicit ESP32 GPIO pinout table for Smoke Sensor and Flame Sensor (using `ADC1` pins to avoid ESP32 Wi-Fi `ADC2` conflict); add 3.3V voltage-divider note for 5V sensor outputs; document exact JSON payloads sent to backend. | **High** |
| `ML_INTEGRATION.md` | `docs/ML_INTEGRATION.md` | **NEEDS IMPROVEMENT** | Unify detection JSON schema with `ApiDocumentation.md` and `DataBase.md`; document exact supported PPE class labels and evidence snapshot storage flow. | **High** |
| `TESTING.md` | `docs/TESTING.md` | **NEEDS IMPROVEMENT** | Add test cases `T15` (duplicate RFID cooldown), `T16` (ML violation frame cooldown), and `T17` (SHA-256 tamper detection); populate actual test execution results once code is implemented. | **Medium** |
| `DEPLOYMENT.md` | `docs/DEPLOYMENT.md` | **NEEDS IMPROVEMENT** | Add exact `.env.example` variable names, startup commands, ports, and a "Hackathon Local LAN / Hotspot Demo Setup" guide for ESP32 + Laptop + Camera connectivity. | **Medium** |
| `DEVELOPMENT_WORKFLOW.md` | `docs/DEVELOPMENT_WORKFLOW.md` | **PARTIALLY VERIFIED** | Add canonical folder ownership (`/backend`, `/frontend`, `/ml-model`, `/hardware`) and link to the unified data contract. | **Medium** |
| `CHANGELOG.md` | *(Missing)* | **NOT VERIFIED (MISSING)** | Create `CHANGELOG.md` (referenced in `README.md` §8) to record project milestones and schema/API changes. | **Medium** |
| `.env.example` & `.gitignore` | *(Missing)* | **NOT VERIFIED (MISSING)** | Create `.gitignore` (to prevent committing `.env`, `node_modules/`, Python `.venv/`, model weights) and `.env.example` (referenced in `README.md` and `DEPLOYMENT.md`). | **High** |

---

## 19. Project Risks and Limitations

1. **Zero Code Currently Committed in Repository (Critical Schedule Risk):**
   - If frontend, ML, or hardware code exists on team members' individual laptops or separate repositories, integrating them without first locking down the unified API/JSON contract (`ApiDocumentation.md` + `DataBase.md` + `ML_INTEGRATION.md`) will cause integration failures.
2. **Domain Misalignment in Documentation ("Mining" vs. "General Workplace/Industrial Safety"):**
   - Having half the documents call the project a "Mining Safety System" while the project is presented as a "General Workplace & Industrial Safety System" will confuse judges or reviewers unless corrected across all 5 affected files.
3. **ESP32 ADC2 + Wi-Fi Hardware Conflict:**
   - On ESP32 boards, `ADC2` pins (`GPIO 0, 2, 4, 12–15, 25–27`) **cannot read analog values while Wi-Fi is active**. If the smoke or flame sensor analog output is wired to an `ADC2` pin instead of an `ADC1` pin (`GPIO 32–39`), `analogRead()` will fail as soon as Wi-Fi connects.
4. **Camera-to-Worker Identity Limitation:**
   - Standard PPE object detection models (e.g., YOLO) detect `person`, `helmet`, `no_helmet`, `safety_vest`, `no_safety_vest`—they do not identify *which* worker is in the frame. Attempting to hardcode a fake `workerId` in the ML script would violate engineering integrity. Keeping `workerId: null` on camera detections and showing *RFID-active workers currently in that zone* for Supervisor verification is the honest, technically sound design.
5. **Per-Frame Incident Flooding from Camera & Continuous Sensor Loops:**
   - Without a server-side deduplication/cooldown window (e.g., 60 seconds per source + violation type), a single missing helmet in front of a 30 FPS camera will generate 1,800 incidents per minute.
6. **Prototype Sensor Limitations:**
   - Low-cost smoke (MQ-series) and IR flame sensor modules are uncalibrated, sensitive to ambient IR light or warm-up drift, and are strictly for supplementary prototype demonstration—never certified industrial life-safety instruments.

---

## 20. Final Project Readiness Assessment

### 20.1 Audit Scores (Strict, Uninflated Assessment Based on Actual Repository State)

| Category | Score | Detailed Reasoning |
|---|---|---|
| **Technical Quality** | **2.0 / 10** | The architectural design and security principles in `docs/` are well thought out (earning 2 points), but there is **zero executable source code** in the repository today. |
| **Documentation Quality** | **6.5 / 10** | 11 thorough Markdown files exist covering architecture, APIs, database schema, RBAC, hardware, ML, testing, deployment, and workflow. However, points are deducted for: (1) mining-specific framing in 5 files contradicting the general workplace safety objective, (2) conflicting JSON schemas across `ApiDocumentation.md`, `DataBase.md`, and `ML_INTEGRATION.md`, (3) missing `userId` link on `Workers` and verification/hash fields on `Incidents`, and (4) missing `CHANGELOG.md`, `SETUP.md`, `.gitignore`, and `.env.example`. |
| **Backend Readiness** | **0.0 / 10** | `backend/` does not exist in the repository. No Node.js/Express server, routes, controllers, or middleware have been committed yet. |
| **Frontend Readiness** | **0.0 / 10** | `frontend/` does not exist in the repository. No dashboard UI or role views have been committed yet. |
| **Hardware Integration** | **1.5 / 10** | RC522-to-ESP32 SPI wiring and 3.3V safety rules are accurately documented in `HARDWARE_SETUP.md`, but smoke/flame GPIO pins and ESP32 `.ino` firmware code are not yet in the repository. |
| **ML Integration** | **1.5 / 10** | Responsibility boundaries, worker-ID constraints, and cooldown concepts are well documented in `ML_INTEGRATION.md`, but no ML inference script, camera bridge, or unified payload contract exists in code yet. |
| **Security Readiness** | **2.0 / 10** | No secrets are leaked in Git and `SECURITY_AND_ROLES.md` defines strong RBAC and device-auth rules, but `.gitignore` is missing and no authentication/authorization middleware is implemented in code yet. |
| **Prototype Readiness** | **1.0 / 10** | The project currently exists only as specification and design documentation; no working end-to-end prototype loop can be executed from this repository yet. |
| **Hackathon Demonstration Readiness** | **1.5 / 10** | Clear problem statement, 7 compelling capabilities, and well-structured documentation provide a strong blueprint, but the codebase, firmware, ML bridge, and demo simulator must be built/integrated before a live demonstration is possible. |

---

### 20.2 Post-Audit Summary & Next-Step Recommendation

#### 1. Summary of the Most Serious Problems
1. **Complete Absence of Source Code in Repository:** Only `README.md` and `docs/*.md` exist in the repository (`backend/`, `frontend/`, `ml-model/`, `hardware/`, `.gitignore`, and `.env.example` are all missing).
2. **Domain Framing Contradiction ("Mining" vs. "General Workplace Safety"):** Five core documents (`README.md`, `ps.md`, `Architecture.md`, `ApiDocumentation.md`, `DataBase.md`) frame the project as a *Mining Safety System*, directly contradicting the requirement that SmartPPE is a general workplace and industrial safety system.
3. **Incompatible API & Database Contracts Across Docs:** `POST /api/detections` and `POST /api/sensors/events` have conflicting field names and structures across `ps.md`, `ApiDocumentation.md`, `DataBase.md`, and `ML_INTEGRATION.md`.
4. **Critical Schema Gaps in `DataBase.md`:**
   - `Workers` has no link (`userId`) to `Users`, making it impossible for a logged-in Worker to view their own profile or incident history.
   - `Devices` has no `apiKeyHash` field for ESP32 device authentication.
   - `Incidents` lacks `verifiedBy`, `verifiedAt`, `verificationNotes`, `resolutionNotes`, and `recordHash` / `previousHash` (SHA-256) fields.
5. **Missing ESP32 Sensor Pinouts & `.gitignore`:** `HARDWARE_SETUP.md` omits specific `ADC1` GPIO pins for the smoke and flame sensors (risking an ESP32 Wi-Fi + `ADC2` conflict), and the repository lacks a `.gitignore` to protect `.env` secrets.

#### 2. The Five Most Important Improvements
1. **Unify the Data & API Contracts + Fix Schema Gaps:** Lock down one canonical schema for all 12 database entities (adding `Workers.userId`, `Devices.apiKeyHash`, and `Incidents` verification + SHA-256 hash fields) and unify the JSON payloads for `/api/detections`, `/api/sensors/events`, and `/api/rfid/scan`.
2. **Build the Core Backend & Database Layer (`backend/`):** Implement the Node.js + Express + MongoDB backend with JWT auth, 3-tier RBAC (`WORKER`, `SUPERVISOR` with strict zone isolation, `ADMIN`), and device/ML API key authentication (`X-Device-Key`, `X-ML-Service-Key`).
3. **Implement Deduplication / Cooldown Engine for RFID, Sensors & ML Detections:** Prevent per-frame camera violations, noisy sensor spikes, and repeated RFID taps from spamming duplicate incidents in the database.
4. **Implement Off-Chain SHA-256 Cryptographic Hash Chaining & Live Integrity Verification (`/api/incidents/:id/verify-integrity`):** Fulfill Capability #6 (Tamper-Evident Incident Records) with real, verifiable cryptographic hashing and tamper detection right now, while keeping blockchain anchoring modular for future scope.
5. **Add Real-Time Socket.IO Broadcasting + Automated Heartbeat Timeout Monitor:** Deliver instant dashboard updates (Capability #1) and automatic `ONLINE`/`OFFLINE` device/camera health tracking across multiple ESP32 units and cameras (Capabilities #3 & #4).

#### 3. Recommended First Module to Work On
**Module 1: Repository Hygiene, Documentation Alignment & Backend Core Foundation (Database Models + Auth/RBAC Middleware)**
*(Wait for confirmation first on whether any Frontend, Backend, ML, or ESP32 code already exists on another local folder/branch that should be imported before scaffolding `backend/`).*

#### 4. Why This Module Should Be First
- **Single Source of Truth:** The Backend & Database layer sits at the center of the entire architecture—the ESP32 firmware, the ML inference pipeline, and the three Role-Based Frontend Dashboards all depend on the backend's exact REST endpoints, field names, authentication headers, and database models.
- **Prevents Rework & Secret Leaks:** Creating `.gitignore` and `.env.example`, fixing the 5 critical schema omissions (`Workers.userId`, `Devices.apiKeyHash`, `Incidents.recordHash`, unified `/api/detections` payload, and removing mining-specific terminology), and standing up the authenticated database models first guarantees that every subsequent module (RFID, Sensors, ML, Supervisor Verification, and Frontend Dashboards) integrates cleanly on the first attempt.
