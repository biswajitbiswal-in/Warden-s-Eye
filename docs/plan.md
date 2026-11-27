# SmartPPE — Warden's Eye
## Master Technical & Product Development Roadmap (`plan.md`)

**Project Name:** SmartPPE — Warden's Eye  
**Product Category:** AI & IoT-Based Industrial Workplace Safety Monitoring Platform (Edge + Cloud SaaS)  
**Document Purpose:** Authoritative master roadmap bridging the current single-facility prototype and First Evaluation milestone into an offline-resilient, multi-organisation industrial safety SaaS + IoT platform.  
**Last Updated:** 2026-11-27

---

## 1. Project Overview & Product Vision

### 1.1 Project Overview
**SmartPPE — Warden's Eye** is an intelligent industrial and workplace safety monitoring platform that combines:
- **Computer Vision-Based PPE Detection:** Automated detection of safety helmets, high-visibility safety vests, and safety violations through fixed/zone cameras.
- **RFID-Based Worker Identification:** Worker check-in and zone presence identification using 13.56 MHz RFID cards and ESP32 + MFRC522 readers.
- **ESP32-Based IoT Integration:** Distributed microcontroller nodes supporting RFID checkpoints, local status heartbeats, and supplementary environmental sensors.
- **Supplementary Smoke & Flame Sensors:** Prototype hazard demonstration sensors connected to ESP32 nodes.
- **Intelligent Safety Warning & Escalation Engine:** Immediate local audio speaker warnings paired with a persistent **120-second grace period** for normal PPE violations before supervisor escalation, and **zero-delay immediate alerts** for critical emergencies.
- **Real-Time Incident Monitoring & Supervisor Notifications:** Live WebSocket dashboards and Web Push notifications scoped to each supervisor's assigned workplace zones.
- **Offline + Online Hybrid Operation:** Autonomous local edge operation (local backend, local database, local AI inference, local speaker warnings, and LAN dashboard) that continues functioning when internet connectivity drops and synchronizes cleanly to the cloud when connectivity resumes.
- **Tamper-Evident Incident Evidence & History:** Canonical SHA-256 cryptographic record hashing, hash chaining, and private evidence file integrity verification (with optional future blockchain anchoring).
- **Multi-Organisation SaaS & Subscription Architecture:** Long-term commercial architecture enabling factories, warehouses, construction facilities, laboratories, and industrial plants to onboard their own sites, buildings, zones, cameras, IoT devices, workers, and supervisors under strict tenant data isolation.

> **Strict Scope & Safety Boundaries:**
> 1. **General Industrial & Workplace Safety:** Warden's Eye is designed for general industrial workplaces (factories, warehouses, manufacturing plants, construction sites, and utility facilities). It is **not** a mining-specific system.
> 2. **No Smart Helmet Hardware:** The platform uses camera-based PPE detection and station/checkpoint RFID readers. It does **not** use smart helmets or helmet-mounted sensors.
> 3. **Supplementary Sensor Disclaimer:** The smoke and flame sensor modules are supplementary prototype demonstration components and must never be claimed as certified industrial fire/gas life-safety instruments.
> 4. **Honest Emergency Dispatch Policy:** Critical emergencies generate an immediate supervisor alert and a formatted SOS message for **manual forwarding** to emergency services. Never claim that fire services or ambulances have been automatically contacted unless an authorized dispatch integration exists.

---

## 2. Roadmap Status Legend & Classification Rules

All roadmap phases, milestones, and deliverables in this document strictly use the following five statuses:

| Status | Meaning |
|---|---|
| **`COMPLETED`** | Implemented in the repository codebase and verified by automated or documented tests. |
| **`IN PROGRESS`** | Active work started or partially implemented in the repository; remaining tasks required for completion. |
| **`PENDING`** | Planned for the core prototype and First Evaluation milestone, not yet implemented in repository code. |
| **`BLOCKED`** | Cannot be finalized until external hardware, ML artifacts, or team confirmations are provided. |
| **`FUTURE`** | Long-term commercial SaaS, multi-tenant, billing, or external anchoring extensions scheduled after the core prototype. |

### 2.1 Feature Horizon Separation

To keep engineering priorities realistic and transparent, all features are categorized into four horizons:

1. **Working Prototype Features (`COMPLETED` in Repository Today):**
   - Complete 14-phase technical audit (`SMARTPPE_TECHNICAL_AUDIT.md`) and unified canonical documentation suite (`README.md`, `docs/*`).
   - Node.js + Express.js + MongoDB (Mongoose) Backend Foundation (`backend/`).
   - Four core database models (`User`, `Zone`, `Worker`, `ZoneAssignment`) with unique and partial-unique indexes.
   - Secure authentication (`POST /api/auth/register` with First-Admin bootstrap + Admin restriction, `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/users/me`, `POST /api/auth/logout`) with `bcryptjs` password hashing, JWT verification, and rate limiting.
   - Three-tier RBAC (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`) with strict server-side supervisor zone isolation and worker self-only access (`GET /api/workers`, `GET /api/workers/me`, `GET /api/workers/:id`, `GET /api/zones`, `GET /api/zones/:id`).
   - Automated 10-part integration and security test suite (`backend/tests/foundation.test.js` — 10/10 passing).

2. **Features Under Active Development / Next Up (`IN PROGRESS` / `PENDING`):**
   - Remaining 8 core database models (`Device`, `Camera`, `RfidLog`, `PpeDetection`, `SensorEvent`, `Incident`, `IncidentEvidence`, `AuditLog`).
   - Admin CRUD APIs for workers, supervisors, zones, zone assignments, devices, and cameras.
   - Hardware and ML ingestion APIs (`POST /api/rfid/scan`, `POST /api/sensors/events`, `POST /api/devices/heartbeat`, `POST /api/detections`) with `X-Device-Key` and `X-ML-Service-Key` authentication.

3. **Features Planned for the First Evaluation Milestone (`PENDING` / `BLOCKED`):**
   - Live AI PPE detection pipeline with multi-frame verification, ByteTrack person tracking, and three-state classification (`SAFE`, `VIOLATION`, `UNCERTAIN`).
   - Live ESP32 + RC522 RFID card scanning and supplementary smoke/flame sensor integration.
   - Normal safety violation workflow with **local speaker audio warning** and **persistent 120-second grace period** before supervisor escalation.
   - Critical emergency workflow (flame, validated fire, validated person-fall) bypassing the 120-second timer with immediate alert + manual SOS message generation.
   - Role-based Frontend Dashboards (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`) with real-time WebSocket updates and Web Push notifications.
   - Offline-first local operation (LAN dashboard, local SQLite/MongoDB persistence, persistent warning timers surviving restarts, and offline sync queue).

4. **Long-Term Commercial Platform Features (`FUTURE`):**
   - Multi-organisation SaaS tenant isolation (`organisationId`, sites, buildings, floors, safety policies, and onboarding wizard).
   - Edge Agent packaging for customer facilities (RTSP/IP camera onboarding, credential encryption, and cloud sync).
   - Subscription & billing lifecycle (`Starter`, `Professional`, `Enterprise` plans, usage quotas, invoice generation, Razorpay integration, and safety-preserving expiry rules).
   - Optional on-chain smart contract hash anchoring (`blockchainTxHash`) on top of the off-chain SHA-256 incident hash chain.

---

## 3. Current Implementation Status Snapshot

| Module / Subsystem | Status | Verified Evidence in Repository | Remaining Work |
|---|---|---|---|
| **Technical Audit & Canonical Docs** | `COMPLETED` | `SMARTPPE_TECHNICAL_AUDIT.md`, `README.md`, `docs/*.md` | Keep synchronized as new phases are built |
| **Backend Server & MongoDB Config** | `COMPLETED` | `backend/src/app.js`, `server.js`, `config/db.js`, `config/env.js` | Add Socket.IO server & offline sync worker |
| **Auth & 3-Tier RBAC Middleware** | `COMPLETED` | `backend/src/middleware/auth.middleware.js`, `controllers/auth.controller.js` | Add `X-Device-Key`, `X-ML-Service-Key`, and future `organisationId` guards |
| **Foundation Models (`User`, `Zone`, `Worker`, `ZoneAssignment`)** | `COMPLETED` | `backend/src/models/*.model.js` | Add write CRUD endpoints & audit hooks |
| **Automated Foundation Test Suite** | `COMPLETED` | `backend/tests/foundation.test.js` (10/10 passing) | Expand test suite for ingestion, 120s timer, emergency, and sync |
| **Admin CRUD & RFID/Device/Camera Models** | `IN PROGRESS` | Read routes `/api/workers` & `/api/zones` implemented | Implement `Device`, `Camera`, `RfidLog`, `AuditLog` models & Admin write routes |
| **AI PPE Detection & Reliability Pipeline** | `BLOCKED` / `PENDING` | Contract defined in `docs/ML_INTEGRATION.md` | Confirm ML teammate's codebase/model weights; integrate ByteTrack & 3-state filter |
| **ESP32 Firmware (RC522 + Smoke + Flame)** | `BLOCKED` / `PENDING` | RC522 SPI wiring verified in `docs/HARDWARE_SETUP.md` | Confirm smoke/flame `ADC1` GPIO pins; commit `hardware/esp32/` firmware |
| **120-Second Grace Period & Speaker Warning Engine** | `PENDING` | Specified in Section 4.1 below | Implement persistent warning state machine, speaker trigger, and auto-resolution |
| **Critical Emergency & Manual SOS Workflow** | `PENDING` | Specified in Section 4.2 below | Implement zero-delay critical path and formatted SOS generator |
| **Role-Based Frontend Dashboards** | `BLOCKED` / `PENDING` | Requirements defined in `docs/Architecture.md` | Confirm/import frontend teammate's code or scaffold dashboard app |
| **Offline-First & Cloud Sync Architecture** | `PENDING` | Specified in Section 6 below | Implement persistent timer recovery, sync outbox queue, and idempotency keys |
| **Multi-Organisation SaaS & Camera Onboarding** | `FUTURE` | Specified in Section 7 below | Add `Organisation`, `Site`, `Building`, `Floor` models & tenant middleware |
| **Subscription, Quotas & Billing (Razorpay)** | `FUTURE` | Specified in Section 8 below | Add subscription plans, usage enforcement, and safety-preserving expiry rules |

---

## 4. Core Safety & Emergency Workflows (High-Priority Specification)

### 4.1 Normal Safety Violation Workflow (120-Second Grace Period)

Designed to reduce supervisor alert fatigue while giving workers an immediate opportunity to self-correct minor or temporary PPE non-compliance:

```text
[1. Camera Captures Frame]
        |
        v
[2. AI Detects Missing PPE (e.g., No Helmet / No Vest)]
        |
        v
[3. Multi-Frame Verification + ByteTrack Person Tracking (Track ID)]
   |-- If Confidence/Visibility is ambiguous --> State: UNCERTAIN (Log only; DO NOT escalate)
   |-- If Verified across N frames ------------> State: VIOLATION
        |
        v
[4. Optional Worker Association]
   (Attach workerId ONLY if reliably verified via RFID checkpoint correlation; otherwise workerId = null)
        |
        v
[5. Trigger Local Speaker Audio Warning]
   ("Attention in [Zone Name]: Required safety equipment missing. Please wear your PPE immediately.")
        |
        v
[6. Start Persistent 120-Second Grace Period Timer (Status: WARNING_GRACE_PERIOD)]
   (Stored in local database with graceExpiresAt = now + 120s so server restarts do not lose the timer)
        |
        v
[7. Continuous Monitoring During 120-Second Window]
   |
   +---> [Case A: Worker Corrects PPE Within 120s (Verified SAFE for M consecutive frames)]
   |        -> Cancel timer
   |        -> Mark warning record as SELF_RESOLVED_IN_GRACE
   |        -> Record compliance recovery timestamp (No supervisor escalation spam)
   |
   +---> [Case B: Violation Unresolved After 120 Seconds]
            -> Promote to Escalated Incident (Status: OPEN)
            -> Notify Assigned Zone Supervisor immediately (WebSocket + Web Push)
            -> Store full incident details, timestamps, evidence snapshot + SHA-256 fileHash, and response history
```

### 4.2 Critical Emergency Workflow (Zero-Delay Escalation & Manual SOS)

Applies to life-threatening or high-risk hazards:
- **Flame Detection** (`FLAME_DETECTED` from ESP32 flame sensor)
- **Validated Fire / Critical Smoke Detection** (`SMOKE_DETECTED` at `CRITICAL` threshold or vision-validated fire)
- **Validated Person-Fall Detection** (`PERSON_FALL_DETECTED` validated across consecutive camera frames)

#### Mandatory Critical Emergency Rules
1. **Skip the 120-Second Grace Period:** Immediate zero-delay execution.
2. **Immediate Critical Incident Creation:** Create an incident with `severity: "CRITICAL"`, `status: "OPEN"`, and `isEmergency: true`.
3. **Urgent Local & Remote Notifications:** Trigger an immediate local alarm/speaker alert and push an urgent high-priority alert (WebSocket + Web Push) to all assigned Zone Supervisors and Organisation Administrators.
4. **Complete Context Payload:** Include incident type, facility/site, building/floor (when configured), zone name, camera/device code, exact `occurredAt` timestamp, active RFID-checked-in workers in that zone, and available evidence snapshot.
5. **Formatted SOS Message for Manual Forwarding:** Automatically generate a copy-ready / one-click forwardable SOS summary block containing facility address, zone location, emergency type, timestamp, and active worker count so the supervisor or control room operator can immediately call or message emergency services (Fire / Ambulance).
6. **Strict Honesty Rule:** The UI and logs must state `"SOS Summary Ready for Manual Emergency Dispatch"`. **Never claim that fire services, ambulances, or external authorities have been automatically contacted** unless a certified, authorized dispatch integration is physically connected and verified.

---

## 5. False Detection Reduction & ML Reliability Architecture

To ensure high reliability in real industrial lighting, camera angles, and crowded floors without replacing the existing trained PPE detection model unnecessarily, the ML pipeline incorporates a dedicated **Reliability & Filtering Layer**:

### 5.1 Three-State Detection Classification

| Detection State | Definition & Criteria | System Action |
|---|---|---|
| **`SAFE`** | Person detected and all required zone PPE (`helmet`, `safety_vest`) detected above the validated high-confidence threshold (`>= T_high`). | Log compliance; if an active 120-second warning exists for this tracked person/zone and `SAFE` persists across $M$ frames, auto-resolve the warning. |
| **`UNCERTAIN`** | Person detected, but head/torso region is partially occluded, bounding box is too small/distant, motion blur is high, or PPE confidence falls in the ambiguous band (`T_low <= conf < T_high`). | Record diagnostic telemetry (`REVIEW_REQUIRED` / `UNCERTAIN`). **Never trigger a speaker warning or 120-second violation escalation from an `UNCERTAIN` prediction.** |
| **`VIOLATION`** | Person detected with clear head/torso visibility and missing PPE (`no_helmet` or `no_safety_vest`) above `T_high` verified across $N$ consecutive tracked frames. | Trigger the Section 4.1 Normal Safety Violation workflow (Speaker Warning + 120-Second Grace Period). |

### 5.2 Six-Stage False-Positive Reduction Pipeline
1. **Confidence Threshold Tuning:** Calibrate class-specific thresholds (`T_low`, `T_high`) using a held-out validation dataset across helmets, vests, and person boxes.
2. **Person Tracking (ByteTrack / IOU-Kalman Tracker):** Assign a persistent `trackId` to each detected person across video frames so temporary single-frame flickers are smoothed per individual rather than treated as new people.
3. **Multi-Frame Temporal Verification:** Require a violation on the same `trackId` (or same camera zone region) to appear in at least $N$ out of $K$ consecutive analyzed frames (e.g., 5 of 7 frames over ~1.5 seconds) before transitioning to `VIOLATION`.
4. **Head-Region & Torso Visibility Checks:** Verify that the upper-body/head sub-region of the person bounding box is within the camera frame boundaries, above minimum pixel dimensions (e.g., $\ge 32 \times 32\text{ px}$), and not cropped by the frame edge before declaring `MISSING_HELMET`.
5. **Duplicate Event Suppression:** Enforce per-track and per-camera cooldown windows so a single ongoing violation updates `occurrenceCount` on the active warning/incident rather than flooding the backend.
6. **Quantitative Evaluation Matrix:** Evaluate and document **Precision**, **Recall**, **False-Positive Rate (FPR)**, and **False-Negative Rate (FNR)** across:
   - Bright vs. dim industrial lighting
   - High-angle overhead vs. eye-level camera mounts
   - Single worker vs. crowded multi-worker scenes

---

## 6. Offline + Online Hybrid Architecture (Edge-First Resilience)

Industrial facilities frequently experience internet outages or operate cameras on isolated local networks. **Local workplace safety monitoring must never fail when external internet connectivity drops.**

```text
=====================================================================================
                  FACILITY LOCAL LAN (OFFLINE-CAPABLE EDGE BOUNDARY)
=====================================================================================
  [IP/RTSP/USB Cameras] ---> [Local ML & Tracking Service] ---+
                                                              |
  [ESP32 + RC522 + Sensors] --(LAN HTTP)--> [Local Backend] <-+--> [Local Speaker]
                                                  |
                                    +-------------+-------------+
                                    |                           |
                             [Local Database]          [Local LAN Dashboard]
                         (Incidents, 120s Timers,     (Works 100% Offline for
                          Evidence & Sync Outbox)      On-Site Supervisors)
=====================================================================================
                                                  |
                                    (Async Background Sync Queue
                                     When Internet Is Available)
                                                  v
=====================================================================================
                        CLOUD SaaS PLATFORM (ONLINE MODE)
=====================================================================================
  [Cloud Backend & Multi-Tenant DB] ---> [Remote Supervisor Dashboard & Web Push]
                                    ---> [Cloud Evidence Backup & Analytics]
                                    ---> [Organisation & Subscription Management]
=====================================================================================
```

### 6.1 Offline Mode Guarantees
- **Autonomous Local Execution:** Camera monitoring, AI PPE detection, RFID worker identification, ESP32 sensor ingestion, local speaker warnings, the persistent 120-second grace period engine, and local incident storage run entirely on the local facility host/edge server over the LAN.
- **Persistent 120-Second Timers Across Restarts:** Active grace-period warnings are persisted to the local database with `graceStartedAt`, `graceExpiresAt`, and `timerStatus`. On backend startup/recovery, a reconciliation job immediately reloads pending timers and either resumes the countdown or escalates any timer that expired during downtime.
- **Local LAN Supervisor Dashboard:** Supervisors connected to the facility Wi-Fi/LAN receive real-time WebSocket alerts and can view, acknowledge, verify, and resolve incidents with zero internet connectivity.
- **Explicit Disconnection Indicators:** The local and cloud dashboards clearly flag disconnected cameras, offline ESP32 nodes (missed heartbeat $> 90\text{ s}$), and cloud sync link status (`ONLINE_SYNCED`, `OFFLINE_LOCAL_ONLY`, `SYNCING_BACKLOG`).

### 6.2 Online Mode & Cloud Synchronisation Rules
- **Non-Blocking Async Sync:** Cloud synchronization runs in an asynchronous background worker and must **never** block or add latency to local speaker warnings, 120-second timers, or LAN WebSocket alerts.
- **Persistent Outbox Sync Queue (`syncOutbox`):** Every locally created or updated incident, evidence file hash, RFID scan, and audit log is assigned a globally unique UUID / `idempotencyKey` and queued with `syncStatus: "PENDING" | "SYNCED" | "FAILED_RETRY"`.
- **Idempotent Reconnection Replay:** When internet connectivity returns, the sync worker drains the queue in chronological batches using exponential backoff. The cloud backend enforces unique constraints on `(organisationId, idempotencyKey)` to prevent duplicate incidents or duplicate push notifications after reconnection.

---

## 7. Multi-Organisation SaaS Architecture (`FUTURE` Commercial Phase)

Warden's Eye is architected to evolve from a single-facility deployment into a multi-tenant B2B industrial safety SaaS platform where multiple companies share the cloud platform with **strict server-side tenant isolation**.

### 7.1 Tenant Hierarchy & Data Isolation Model

```text
PLATFORM (Warden's Eye SaaS)
 └── ORGANISATION (Tenant: Company Profile, Industry, Safety Policies, Subscription)
      └── SITE / FACILITY (Factory, Warehouse, Construction Site)
           └── BUILDING / FLOOR
                └── SAFETY ZONE (Required PPE Rules, Grace Period Policy)
                     ├── CAMERAS (IP / RTSP / Local USB)
                     ├── ESP32 & IoT DEVICES (RFID Readers, Smoke/Flame Sensors, Speakers)
                     ├── ASSIGNED SUPERVISORS
                     ├── ASSIGNED / CHECKED-IN WORKERS & RFID CARDS
                     └── INCIDENTS, WARNINGS, EVIDENCE & AUDIT LOGS
```

#### Mandatory Multi-Tenant Security Rules
1. **Tenant Key on Every Scoped Entity:** Every organisation-owned collection/table (`sites`, `buildings`, `zones`, `cameras`, `devices`, `workers`, `users`, `zoneAssignments`, `rfidLogs`, `ppeDetections`, `sensorEvents`, `incidents`, `incidentEvidence`, `auditLogs`, `subscriptions`) carries an indexed `organisationId`.
2. **Backend Middleware Enforcement:** Tenant isolation is enforced on the server by extracting `organisationId` from the authenticated user's session/JWT (or the edge agent's cryptographic certificate) and injecting `{ organisationId }` into every database query and mutation.
3. **Never Trust Frontend Tenant IDs:** Client-supplied `organisationId` values in query parameters or request bodies are ignored or validated strictly against the authenticated session's tenant scope to prevent cross-company IDOR attacks.

### 7.2 Eleven-Step Organisation Onboarding Workflow
1. **Organisation Account Creation:** Provision the company administrator account and organisation tenant record.
2. **Company & Facility Details:** Record industry type (manufacturing, logistics, construction, laboratory), primary address, and emergency contact numbers (used in manual SOS templates).
3. **Sites, Buildings, Floors & Safety Zones:** Define physical hierarchy and zone-specific PPE requirements (`helmet`, `safety_vest`, etc.).
4. **Camera Registration:** Add cameras via the Camera Onboarding Wizard (Section 7.3).
5. **Camera Connectivity Test:** Verify RTSP/HTTP/local device reachability and frame capture via the local Warden's Eye Edge Agent.
6. **Camera-to-Zone Assignment:** Map each verified camera to a specific safety zone.
7. **IoT Device & Speaker Registration:** Register ESP32 nodes (`deviceCode`, one-time `X-Device-Key` generation, hashed `apiKeyHash`) and local warning speaker outputs.
8. **Worker & Supervisor Provisioning:** Create supervisor accounts and worker profiles (`employeeCode`, department, designation).
9. **RFID Card & Zone Responsibility Assignment:** Map 13.56 MHz `rfidUid` tags to workers and assign supervisors to safety zones (`zoneAssignments`).
10. **Safety Policy Configuration:** Configure confidence thresholds, the 120-second warning grace period, and critical emergency escalation contacts.
11. **Activate Monitoring:** Enable live edge inference, heartbeat monitoring, and dashboard alerting.

### 7.3 Camera Onboarding & Edge Agent Architecture
- **Supported Sources:** IP Cameras, RTSP streams (`rtsp://...`), ONVIF-compatible streams, and local USB/UVC cameras connected to the facility edge host.
- **Warden's Eye Local Edge Agent:** Because a cloud server cannot directly pull private LAN RTSP streams (`192.168.x.x`) without risky port forwarding, the local Warden's Eye Edge Agent runs inside the customer facility, connects to local RTSP/IP cameras, executes connectivity tests, captures a low-bandwidth preview frame for the onboarding UI, runs local AI PPE inference, triggers local speaker warnings, and reports health heartbeats (`ONLINE` / `OFFLINE` / `STREAM_ERROR`).
- **Encrypted Camera Credentials:** RTSP usernames, passwords, and stream URLs are encrypted at rest (AES-256-GCM using a server-managed encryption key) and are never returned in plaintext to browser clients after saving.

---

## 8. Subscription & Commercial Business Model (`FUTURE` Commercial Phase)

### 8.1 Proposed Commercial Tiers

*(Note: These are proposed commercial packages for product roadmap planning, not final binding commercial commitments.)*

| Feature / Quota | **Starter** (Proposed) | **Professional** (Proposed) | **Enterprise** (Proposed) |
|---|---|---|---|
| **Target Customer** | Single small workshop or pilot zone | Medium factory or warehouse facility | Multi-site industrial enterprise |
| **Facilities / Sites** | 1 Site | Up to 3 Sites | Unlimited / Custom Sites |
| **Registered Cameras** | Up to 4 Cameras | Up to 20 Cameras | Custom / High-Volume Quota |
| **Registered Workers & RFID** | Up to 50 Workers | Up to 300 Workers | Unlimited / Custom Quota |
| **Core PPE Detection & 120s Warning** | Included | Included | Included |
| **Critical Emergency & SOS Workflow** | Included | Included | Included |
| **Supervisor Dashboard & Web Push** | Basic Zone View | Full Real-Time + Web Push | Multi-Supervisor + Escalation Matrix |
| **Offline + Online Cloud Sync** | Local + Basic Sync | Full Hybrid Offline/Online Sync | Priority Multi-Site Cloud Sync |
| **Safety Analytics & Exports** | 30-Day Incident History | Advanced Zone & Compliance Analytics | Custom BI Exports, SLA & Audit Ledger |
| **Billing Cadence** | Monthly / Yearly | Monthly / Yearly | Yearly / Custom Contract |

### 8.2 Subscription & Billing System Components
- **Public Pricing & Plan Comparison View:** Transparent display of proposed Starter, Professional, and Enterprise capabilities and resource quotas.
- **Organisation Subscription Management:** Track plan tier, billing cycle (`MONTHLY` | `YEARLY`), `currentPeriodStart`, `currentPeriodEnd`, `status` (`TRIALING` | `ACTIVE` | `PAST_DUE` | `EXPIRED`), and active resource counters (`cameraCount`, `workerCount`, `siteCount`).
- **Backend Quota Enforcement Middleware:** Checks plan limits when an Organisation Administrator attempts to onboard *new* cameras, sites, or worker profiles beyond their tier quota.
- **Payment Verification, History & Invoicing:** Payment webhook verification, immutable payment transaction log, downloadable PDF/HTML invoice generation, and automated renewal reminder notifications (7 days and 1 day prior to expiry).
- **Future Payment Gateway Integration:** Planned integration with **Razorpay** (orders, checkout, and HMAC-SHA256 webhook signature verification).

### 8.3 CRITICAL SAFETY RULE: Subscription Expiry Behaviour
> **Non-Negotiable Safety Policy:**  
> Subscription expiry, payment failure, or billing disputes must **NEVER** silently disable local safety monitoring, camera PPE detection, local speaker warnings, the 120-second violation workflow, critical emergency alerts, or read/export access to existing incident and evidence records.  
>
> When a subscription enters `PAST_DUE` or `EXPIRED`:
> 1. **All active local safety monitoring, speaker warnings, and critical emergency alerts continue running 100% uninterrupted.**
> 2. **Existing incident history and evidence remain accessible** for compliance and auditing.
> 3. Administrative creation of *new* sites, *new* cameras, or *new* premium cloud analytics exports is gracefully restricted with a prominent renewal banner until the subscription is renewed.

---

## 9. Authentication, Role Hierarchy & Dashboard Roadmap

### 9.1 Authentication & Access Control Policy
- **Three Canonical Roles Retained:** `ADMINISTRATOR`, `SUPERVISOR`, `WORKER`.
- **No Public Self-Registration:** There is no unrestricted public sign-up page for workers or supervisors. Only an authorized `ADMINISTRATOR` (or the initial first-user system bootstrap) can provision accounts and assign roles.
- **Distinction Between Platform Administration & Organisation Administration (SaaS Phase):**
  - In the core prototype (Phases 1–12), `ADMINISTRATOR` represents the **Organisation / Facility Higher Authority**.
  - In the multi-organisation SaaS phase (Phases 13–14), a distinct platform-level scope (`isPlatformAdmin: true` or platform management scope) manages tenant onboarding, global platform health, and subscription plans without exposing one customer's worker/incident data to another customer's Organisation Administrator.

### 9.2 Role-Specific Dashboard Interfaces & Design System

All dashboards follow a **functional, high-contrast industrial monitoring design system** (strong typographic hierarchy, clear severity color coding for `SAFE` / `UNCERTAIN` / `WARNING_120S` / `CRITICAL_EMERGENCY`, live countdown badges, connection health pills, and responsive layouts—prioritizing operational clarity over decorative clutter):

| Dashboard View | Target User | Core Functional Screens |
|---|---|---|
| **1. Platform Administrator Console** *(Future SaaS Phase)* | Warden's Eye SaaS Operator | Organisation tenant directory, onboarding provisioning, subscription & quota management, payment/invoice logs, and platform-wide service health. |
| **2. Organisation Administrator Dashboard** *(Core Higher Authority)* | Company / Facility Safety Head | Facility/site & safety zone management, camera onboarding & health grid, ESP32 device & speaker management, worker & RFID management, supervisor zone assignment, system-wide incidents + SHA-256 integrity verification, safety analytics, audit logs, and subscription/billing overview. |
| **3. Supervisor Operations Dashboard** | Zone Safety Supervisor | Assigned zones overview, live active 120-second warning countdowns, critical emergency alert banner + one-click copyable manual SOS summary, worker active RFID presence in assigned zones, incident review & evidence viewer, verification (`VERIFIED` / `REJECTED`) and resolution (`RESOLVED`) actions with notes. |
| **4. Worker Self-Service Portal** | Industrial Worker / Employee | Personal profile (`employeeCode`, department), assigned workplace zone and required PPE checklist, personal PPE compliance status, recent RFID check-ins, and personal safety incident/notification history. |

---

## 10. Hardware, IoT & Edge Audio Specification

### 10.1 Verified Prototype Hardware & RC522 SPI Wiring
The prototype IoT node uses an **ESP32 Development Board** paired with an **MFRC522 (RC522) 13.56 MHz RFID Reader** over the 3.3V VSPI bus (verified in [`docs/HARDWARE_SETUP.md`](docs/HARDWARE_SETUP.md)):

| RC522 Pin | ESP32 Pin | Notes |
|---|---|---|
| `3.3V` (`VCC`) | `3V3` | **Strictly 3.3 V** — never connect to 5 V (`VIN`) |
| `GND` | `GND` | Common ground |
| `RST` | `GPIO 22` | Reset pin |
| `SDA` (`SS` / `CS`) | `GPIO 5` | SPI Chip Select (not I2C SDA) |
| `SCK` | `GPIO 18` | VSPI Clock |
| `MOSI` | `GPIO 23` | VSPI MOSI |
| `MISO` | `GPIO 19` | VSPI MISO |
| `IRQ` | *Not connected* | Unused |

### 10.2 Supplementary Smoke & Flame Sensors (`TO BE CONFIRMED`)
- **No Invented GPIO Pins:** Actual physical breadboard GPIO pins for the smoke and flame sensors remain marked **`TO BE CONFIRMED`** with the hardware team before flashing final firmware.
- **Hardware Design Constraints:**
  - Analog outputs (`AO`) must use ESP32 **`ADC1` pins (`GPIO 32–39`)** (recommended: `GPIO 34` for Smoke, `GPIO 35` for Flame) because ESP32 `ADC2` pins fail when Wi-Fi is active.
  - Any 5 V sensor output must be scaled via a **3.3 V voltage divider** ($10\text{ k}\Omega / 20\text{ k}\Omega$) or level shifter before reaching an ESP32 GPIO pin.
- **Prototype Disclaimer:** Smoke and flame sensors are supplementary prototype demonstration modules, not certified industrial fire/gas detection equipment.

### 10.3 Speaker Warning Output Integration
- For the Normal Safety Violation workflow (Section 4.1 Step 6), the local warning audio can be triggered either via:
  1. **Local Edge Host Audio Output / Connected Speaker** driven by the local backend/ML service (using pre-recorded `.wav`/`.mp3` voice alerts or offline TTS), or
  2. **Zone IoT Buzzer / Audio Module** triggered via the zone's ESP32 node.

---

## 11. Fifteen-Phase Master Development Roadmap

### Phase 1: Existing Project Audit & Gap Analysis
- **Status:** `COMPLETED`
- **Objective:** Inspect the entire repository, audit all 11 documentation files against actual code, identify schema/API conflicts, eliminate mining-specific terminology, and establish a unified canonical specification.
- **Tasks:**
  - Execute 14-phase codebase and documentation inspection.
  - Generate `SMARTPPE_TECHNICAL_AUDIT.md`.
  - Unify API contracts (`POST /api/rfid/scan`, `POST /api/detections`, `POST /api/sensors/events`), 12 database entities, and 3-tier RBAC permissions across `README.md` and `docs/*.md`.
  - Add `.gitignore` and `.env.example` repository safeguards.
- **Dependencies:** None.
- **Expected Deliverables:** `SMARTPPE_TECHNICAL_AUDIT.md`, updated `README.md`, 10 aligned `docs/*.md` files, `.gitignore`, `.env.example`.
- **Acceptance Criteria:** Zero mining terminology or smart-helmet claims remain; all docs reference identical field names and enums.
- **Testing Requirements:** Automated regex and cross-document consistency verification (Completed).

---

### Phase 2: Core Backend Architecture & Foundation Database Models
- **Status:** `COMPLETED`
- **Objective:** Build the Node.js + Express.js + MongoDB (Mongoose) backend foundation, configuration loader, centralized error handling, and the initial 4 core database models.
- **Tasks:**
  - Set up `backend/` structure (`config/`, `models/`, `controllers/`, `middleware/`, `routes/`, `utils/`, `validators/`, `tests/`).
  - Configure Mongoose connection (`connectDB`, `disconnectDB`) with graceful `SIGINT`/`SIGTERM` shutdown.
  - Implement `User`, `Zone`, `Worker`, and `ZoneAssignment` models with timestamps, virtual IDs, and partial unique indexes (`rfidUid`, `userId`).
  - Implement `GET /api/health`, centralized error middleware, and Zod validation middleware.
- **Dependencies:** Phase 1.
- **Expected Deliverables:** `backend/package.json`, `backend/src/config/*`, `backend/src/models/{User,Zone,Worker,ZoneAssignment}.model.js`, `backend/src/app.js`, `backend/src/server.js`.
- **Acceptance Criteria:** Server connects to MongoDB cleanly, enforces unique indexes, and returns standardized JSON envelopes.
- **Testing Requirements:** Verified in `backend/tests/foundation.test.js` (Tests #1 and #7 passing).

---

### Phase 3: Authentication & Role-Based Access Control (RBAC)
- **Status:** `COMPLETED`
- **Objective:** Implement secure JWT authentication, `bcryptjs` password hashing, admin-restricted user registration (with first-admin bootstrap), and 3-tier RBAC (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`) with strict supervisor zone isolation.
- **Tasks:**
  - Implement `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/users/me`, and `POST /api/auth/logout`.
  - Implement `requireAuth`, `optionalAuth`, and `requireRole` middleware.
  - Enforce supervisor zone-scoping and worker self-only access on `GET /api/workers`, `GET /api/workers/me`, `GET /api/workers/:id`, `GET /api/zones`, and `GET /api/zones/:id`.
  - Add authentication rate limiting (`express-rate-limit`).
- **Dependencies:** Phase 2.
- **Expected Deliverables:** `auth.controller.js`, `worker.controller.js`, `zone.controller.js`, `auth.middleware.js`, `auth.validator.js`, and routes.
- **Acceptance Criteria:** Passwords stored only as bcrypt hashes; `passwordHash` never leaked; cross-zone supervisor requests and cross-worker IDOR requests rejected with `403 Forbidden`.
- **Testing Requirements:** Verified in `backend/tests/foundation.test.js` (Tests #2, #3, #4, #5, #6, #8, #9, #10 — all passing).

---

### Phase 4: Worker, Zone, Supervisor & RFID Registry Management
- **Status:** `IN PROGRESS` *(Read endpoints `COMPLETED`; Admin Write CRUD & RFID scan ingestion `PENDING`)*
- **Objective:** Complete Administrator CRUD APIs for managing workplace zones, supervisors, zone assignments, workers, and RFID card mappings, plus the `RfidLog` and `AuditLog` models and `POST /api/rfid/scan` endpoint.
- **Tasks:**
  - Implement `RfidLog` and `AuditLog` Mongoose models.
  - Implement Admin zone CRUD (`POST/PUT/DELETE /api/admin/zones`) and supervisor assignment (`POST/DELETE /api/admin/zones/:id/assign-supervisor`).
  - Implement Admin supervisor management (`GET/POST/PUT/DELETE /api/admin/supervisors`).
  - Implement Admin worker CRUD (`POST/PUT/DELETE /api/workers`) with unique `rfidUid` assignment validation.
  - Implement `POST /api/rfid/scan` and `GET /api/rfid/logs` with duplicate-scan cooldown (`RFID_COOLDOWN_SECONDS`), worker `lastSeenZoneId` / `lastRfidScanAt` tracking, and `"UNKNOWN_CARD"` logging.
- **Dependencies:** Phase 3.
- **Expected Deliverables:** `RfidLog.model.js`, `AuditLog.model.js`, `admin.controller.js`, `rfid.controller.js`, and updated worker/zone controllers.
- **Acceptance Criteria:** Registered RFID cards resolve the correct worker and update active zone presence; duplicate taps within the cooldown window return `duplicateIgnored: true`; unknown cards log `"UNKNOWN_CARD"` without creating a worker.
- **Testing Requirements:** Functional tests `T01`, `T02`, `T11`, `T15`.

---

### Phase 5: AI Integration & Detection Reliability (False-Positive Reduction)
- **Status:** `PENDING` *(Partially `BLOCKED` on confirming ML teammate's existing model weights & class labels)*
- **Objective:** Integrate the camera PPE detection model with a multi-frame verification and tracking layer (`SAFE`, `VIOLATION`, `UNCERTAIN`) and connect it to `POST /api/detections`.
- **Tasks:**
  - Implement `Camera` and `PpeDetection` models in `backend/src/models/` and camera registry routes (`/api/cameras`).
  - Implement `X-ML-Service-Key` authentication middleware (`requireMlAuth`).
  - Build/integrate the Python ML inference & reliability wrapper (`ml-model/`):
    - Person tracking across frames (ByteTrack or IOU tracker with `trackId`).
    - Head-region and torso visibility checks (preventing false missing-helmet triggers when a worker's head is out of frame or occluded).
    - Confidence threshold calibration (`T_low`, `T_high`) producing `SAFE`, `UNCERTAIN`, or `VIOLATION`.
    - Multi-frame persistence check ($N$ of $K$ frames) before emitting a `VIOLATION` event.
  - Implement `POST /api/detections`, `GET /api/detections`, and `GET /api/detections/:id`.
  - Benchmark Precision, Recall, FPR, and FNR across varied lighting, angles, and multi-person frames.
- **Dependencies:** Phase 3, confirmation of ML teammate's model file/labels.
- **Expected Deliverables:** `Camera.model.js`, `PpeDetection.model.js`, `detection.controller.js`, ML reliability pipeline in `ml-model/`, and validation metrics report.
- **Acceptance Criteria:** `UNCERTAIN` detections are logged for diagnostics but never trigger speaker warnings or supervisor escalations; `workerId` remains `null` unless verified via RFID correlation; invalid confidence scores (`<0` or `>1`) return `400 Bad Request`.
- **Testing Requirements:** Functional tests `T06`, `T07`, `T16`, plus precision/recall benchmark evaluation.

---

### Phase 6: Sensor & ESP32 Hardware Integration
- **Status:** `PENDING` *(Partially `BLOCKED` on confirming actual smoke & flame `ADC1` GPIO pins)*
- **Objective:** Implement backend device management (`Device` model, `X-Device-Key` authentication, heartbeat timeout monitoring), sensor event ingestion (`SensorEvent` model, `POST /api/sensors/events`), and non-blocking ESP32 firmware.
- **Tasks:**
  - Implement `Device` and `SensorEvent` models in `backend/src/models/`.
  - Implement `POST /api/devices` (returning one-time raw device API key and storing `apiKeyHash`), `GET /api/devices`, `POST /api/devices/heartbeat`, and `requireDeviceAuth` middleware.
  - Implement background/computed heartbeat timeout monitor marking silent devices (`>90s`) as `"OFFLINE"`.
  - Implement `POST /api/sensors/events`, `GET /api/sensors/events`, and `GET /api/sensors/status` for supplementary `SMOKE` and `FLAME` sensors.
  - Write non-blocking ESP32 firmware (`hardware/esp32/smartppe_node/smartppe_node.ino`) supporting verified RC522 SPI pins (`GPIO 5, 18, 19, 22, 23`), confirmed `ADC1` smoke/flame pins, boot warm-up grace period, 5-sample moving average, 3–5s local RFID debounce, and 30s heartbeats.
- **Dependencies:** Phase 4, confirmation of smoke/flame ESP32 GPIO pins.
- **Expected Deliverables:** `Device.model.js`, `SensorEvent.model.js`, `device.controller.js`, `sensor.controller.js`, and ESP32 `.ino` firmware.
- **Acceptance Criteria:** Unauthenticated device requests return `401`; valid heartbeats mark device `ONLINE`; stopping heartbeats transitions device to `OFFLINE` after timeout; smoke and flame events are stored accurately.
- **Testing Requirements:** Functional tests `T03`, `T04`, `T05`, `T12`, plus hardware bench verification.

---

### Phase 7: Safety Warning & 120-Second Escalation Engine
- **Status:** `PENDING`
- **Objective:** Implement the Normal Safety Violation workflow (Section 4.1): local speaker audio warning, persistent 120-second grace period timer, automatic resolution if the worker corrects their PPE within 120 seconds, and supervisor escalation if unresolved.
- **Tasks:**
  - Implement `Incident` and `IncidentEvidence` models supporting warning lifecycle states (`WARNING_GRACE_PERIOD`, `SELF_RESOLVED_IN_GRACE`, `OPEN`, `UNDER_REVIEW`, `VERIFIED`, `RESOLVED`, `REJECTED`), `graceStartedAt`, `graceExpiresAt`, `occurrenceCount`, and SHA-256 hash fields (`recordHash`, `previousHash`, `fileHash`).
  - Implement local speaker audio warning service (plays clear zone voice warning upon confirmed multi-frame `VIOLATION`).
  - Implement the persistent 120-second grace timer service:
    - Starts a 120-second window when a confirmed PPE `VIOLATION` occurs.
    - Monitors incoming `SAFE` detections from the same camera/track; if corrected within 120 seconds, resolves the warning (`SELF_RESOLVED_IN_GRACE`) and logs recovery time.
    - If still unresolved when `now >= graceExpiresAt`, promotes the record to an escalated `"OPEN"` incident, attaches evidence snapshot + `fileHash`, and notifies the assigned Zone Supervisor.
  - Implement supervisor verification (`POST /api/supervisor/incidents/:id/verify`), resolution (`POST /api/supervisor/incidents/:id/resolve`), and canonical SHA-256 tamper-evident hash chain verification (`GET /api/incidents/:id/verify-integrity`).
- **Dependencies:** Phases 4, 5, 6.
- **Expected Deliverables:** `Incident.model.js`, `IncidentEvidence.model.js`, `warningEscalation.service.js`, `speaker.service.js`, `incident.controller.js`, `supervisor.controller.js`.
- **Acceptance Criteria:** A worker putting on their helmet within 120 seconds resolves the warning without spamming the supervisor; a violation persisting past 120 seconds escalates immediately to the assigned supervisor with full evidence and SHA-256 integrity hash support.
- **Testing Requirements:** Automated timer unit/integration tests (using configurable short grace duration in test mode and 120s in normal mode), plus `T08`, `T09`, `T10`, `T17`.

---

### Phase 8: Critical Emergency Response & Manual SOS Workflow
- **Status:** `PENDING`
- **Objective:** Implement the zero-delay Critical Emergency workflow (Section 4.2) for flame detection, validated fire/critical smoke, and validated person-fall events.
- **Tasks:**
  - Add critical emergency classifier in the ingestion pipeline (`FLAME_DETECTED`, critical `SMOKE_DETECTED`, `PERSON_FALL_DETECTED`).
  - Bypass the 120-second grace period for all critical emergencies; immediately create a `CRITICAL` `"OPEN"` incident (`isEmergency: true`).
  - Trigger immediate urgent local speaker alarm and high-priority supervisor/admin notifications.
  - Implement the **Manual SOS Message Generator** producing a structured emergency dispatch text block (Emergency Type, Facility/Zone Location, Timestamp, Active Checked-In Workers in Zone, Supervisor Contact, and Evidence Link) ready for manual phone/SMS/WhatsApp forwarding to emergency responders.
  - Record emergency acknowledgement and response timeline history.
- **Dependencies:** Phases 6 and 7.
- **Expected Deliverables:** `emergency.service.js`, SOS message formatter, and emergency acknowledgement endpoints.
- **Acceptance Criteria:** Flame or person-fall events trigger a critical incident and supervisor alert in $< 1\text{ second}$ (skipping the 120s timer) and generate an accurate manual SOS summary without falsely claiming automatic fire/ambulance dispatch.
- **Testing Requirements:** Emergency bypass integration tests verifying 0-second delay and SOS payload completeness.

---

### Phase 9: Real-Time Dashboards, Analytics & Web Push Notifications
- **Status:** `PENDING` *(Partially `BLOCKED` on confirming existing frontend repository/code)*
- **Objective:** Build and integrate the role-based web dashboards (`ADMINISTRATOR`, `SUPERVISOR`, `WORKER`), Socket.IO real-time event broadcasting, safety analytics aggregations, and browser Web Push notifications.
- **Tasks:**
  - Integrate Socket.IO with JWT handshake authentication and role/zone-scoped room subscriptions (`zone:<zoneId>`, `user:<userId>`, `role:ADMINISTRATOR`).
  - Implement Web Push notification subscription (`VAPID` keys) so supervisors receive urgent browser/mobile push alerts for 120s-escalated violations and critical emergencies even when the dashboard tab is in the background.
  - Implement `/api/dashboard/overview`, `/api/dashboard/analytics`, `/api/dashboard/recent-activities`, and `/api/dashboard/zones`.
  - Build/connect the functional industrial monitoring UI for:
    - **Organisation Administrator:** Zones, cameras, devices, workers, supervisors, incidents + SHA-256 verification badge, analytics, audit logs.
    - **Supervisor:** Assigned zones, active 120s grace countdowns, urgent emergency banner + copyable SOS modal, evidence review, verify/reject/resolve controls.
    - **Worker:** Personal profile, assigned zone, PPE status, personal safety history.
- **Dependencies:** Phases 4, 7, 8.
- **Expected Deliverables:** `backend/src/socket.js`, `push.service.js`, `dashboard.controller.js`, and `frontend/` role-based application.
- **Acceptance Criteria:** Live events update permitted dashboards in $< 1\text{ s}$; supervisors only receive events for their assigned zones; duplicate push notifications are suppressed.
- **Testing Requirements:** Functional test `T13` and cross-role UI verification.

---

### Phase 10: Offline-First Edge Operation
- **Status:** `PENDING`
- **Objective:** Ensure the complete local safety loop (AI inference, RFID identification, sensor processing, speaker warnings, persistent 120-second timers, and LAN supervisor dashboard) runs with zero internet dependency.
- **Tasks:**
  - Persist all active 120-second warning timers in the local database and implement startup timer recovery so a server restart never loses an active warning countdown.
  - Package local static assets, fonts, and audio warning files so the LAN dashboard and speaker system require no external CDN or cloud API calls.
  - Implement live health indicators for cameras, ESP32 devices, and internet uplink status (`ONLINE` vs. `OFFLINE_LOCAL_MODE`).
  - Implement local database backup and snapshot export utilities.
- **Dependencies:** Phases 7, 8, 9.
- **Expected Deliverables:** Startup timer recovery service, offline asset configuration, device/camera disconnection detector, and local backup script.
- **Acceptance Criteria:** With external internet physically disconnected, a camera PPE violation still plays the local speaker warning, counts down 120 seconds, escalates to the LAN supervisor dashboard, and survives a backend process restart.
- **Testing Requirements:** Offline LAN disconnect test and server-restart-during-grace-period recovery test.

---

### Phase 11: Online Cloud Synchronisation
- **Status:** `PENDING`
- **Objective:** Synchronize locally recorded offline incidents, evidence metadata, RFID logs, and audit trails to the remote cloud platform when internet connectivity is available, without delaying local alerts.
- **Tasks:**
  - Implement the persistent `SyncOutbox` model (`outboxId`, `entityType`, `entityId`, `idempotencyKey`, `payload`, `syncStatus`, `retryCount`, `lastAttemptAt`).
  - Build an asynchronous background sync worker with exponential backoff that drains `PENDING` outbox records to the cloud API when internet connectivity is detected.
  - Enforce idempotent cloud ingestion using `idempotencyKey` to prevent duplicate incidents or duplicate Web Push alerts after network reconnection.
- **Dependencies:** Phase 10.
- **Expected Deliverables:** `SyncOutbox.model.js`, `cloudSync.worker.js`, and cloud idempotent ingestion handler.
- **Acceptance Criteria:** Events generated while offline sync automatically upon reconnection with zero duplicate records and zero impact on local alert latency.
- **Testing Requirements:** Disconnect-generate-reconnect integration test verifying 100% event delivery and 0 duplicates.

---

### Phase 12: Comprehensive Testing, Security Hardening & First Evaluation Readiness
- **Status:** `IN PROGRESS` *(Foundation test suite `COMPLETED`; full E2E & hardware/ML tests `PENDING`)*
- **Objective:** Execute the full 17+ functional, security, hardware, ML reliability, and offline recovery test suite and prepare the First Evaluation demonstration package.
- **Tasks:**
  - Automate API integration tests `T01`–`T17` plus 120-second grace timer tests, emergency bypass tests, and offline sync tests.
  - Audit rate limiting, input validation, private authenticated evidence serving, and SHA-256 tamper detection.
  - Build a clearly labeled **Demo Fallback Simulator Script** (`backend/src/scripts/demo-simulator.js`) for fail-safe presentation if venue hardware/Wi-Fi is disrupted.
  - Record actual pass/fail test evidence in `docs/TESTING.md`.
- **Dependencies:** Phases 1–11.
- **Expected Deliverables:** Complete automated test suite (`backend/tests/*.test.js`), updated `docs/TESTING.md` with real test results, and demo simulator script.
- **Acceptance Criteria:** All automated functional and security tests pass; zero secrets exposed; first evaluation checklist items verified.
- **Testing Requirements:** Full execution of `npm --prefix backend test` and live hardware/camera dry run.

---

### Phase 13: Multi-Organisation SaaS Architecture & Camera Onboarding
- **Status:** `FUTURE`
- **Objective:** Transform Warden's Eye into a multi-tenant industrial safety SaaS platform where multiple companies onboard their own sites, buildings, floors, zones, cameras, devices, workers, and supervisors with strict server-side tenant isolation.
- **Tasks:**
  - Implement `Organisation`, `Site`, `Building`, `Floor`, and `SafetyPolicy` models.
  - Add indexed `organisationId` to all operational collections and enforce server-side tenant scoping middleware (`requireTenantScope`).
  - Separate **Platform Administrator** routes (`/api/platform/*`) from **Organisation Administrator** routes (`/api/admin/*`).
  - Implement the 11-step Organisation Onboarding Wizard and Camera Onboarding flow (RTSP/IP/local camera registration, AES-256-GCM credential encryption at rest, Edge Agent connectivity test, live preview snapshot, and zone assignment).
- **Dependencies:** Phase 12.
- **Expected Deliverables:** Multi-tenant models, tenant isolation middleware, onboarding APIs/UI, and Edge Agent camera connector.
- **Acceptance Criteria:** Organisation A Administrator or Supervisor can never read, mutate, or subscribe to Organisation B records (`403`/`404` enforced server-side); camera credentials are encrypted at rest.
- **Testing Requirements:** Automated cross-tenant IDOR penetration tests and RTSP camera onboarding tests.

---

### Phase 14: Subscription, Usage Quotas & Commercial Billing (Razorpay)
- **Status:** `FUTURE`
- **Objective:** Add commercial subscription management (`Starter`, `Professional`, `Enterprise`), resource usage tracking, invoice generation, renewal reminders, and optional Razorpay payment gateway integration while strictly preserving safety operations upon expiry.
- **Tasks:**
  - Implement `Subscription`, `PaymentTransaction`, and `Invoice` models.
  - Build public pricing page and Organisation Billing & Usage dashboard (tracking active cameras, workers, and sites against plan limits).
  - Implement `subscriptionQuota.middleware.js` that enforces camera/worker onboarding quotas while **never blocking active safety monitoring, 120s warnings, critical emergency alerts, or access to existing incident history**.
  - Implement invoice generation, renewal reminder notifications, and Razorpay order/webhook verification (`HMAC-SHA256`).
- **Dependencies:** Phase 13.
- **Expected Deliverables:** Subscription & billing models, quota middleware, pricing & billing UI, invoice generator, and Razorpay webhook handler.
- **Acceptance Criteria:** Expired subscription restricts adding a *new* camera beyond quota with a renewal notice, while verified test proves live camera PPE violations, speaker warnings, and critical emergencies continue working without interruption.
- **Testing Requirements:** Quota limit tests, webhook signature verification tests, and safety-continuity-on-expiry regression tests.

---

### Phase 15: Production Deployment, Optional Blockchain Anchoring & Industrial Pilot Testing
- **Status:** `FUTURE`
- **Objective:** Deploy the cloud SaaS platform and local Edge Agent to a pilot industrial facility, conduct real-world reliability benchmarks, and optionally enable on-chain smart contract hash anchoring (`blockchainTxHash`).
- **Tasks:**
  - Containerize cloud backend, frontend, and local Edge Agent (`Docker` / `docker-compose`) with automated database backups, HTTPS/TLS, and health monitoring.
  - Conduct on-site pilot testing in an industrial/workplace environment across multiple shifts.
  - Optional: Connect `/api/blockchain/record` and `/api/blockchain/verify/:incidentId` to anchor off-chain SHA-256 `recordHash` digests onto an EVM testnet/mainnet smart contract.
- **Dependencies:** Phases 12, 13, 14.
- **Expected Deliverables:** Production deployment configs, pilot evaluation report, and optional smart contract hash registry.
- **Acceptance Criteria:** Zero unplanned safety monitoring downtime during pilot trial; end-to-end latency from critical detection to supervisor alert $< 2\text{ seconds}$ on LAN.
- **Testing Requirements:** Pilot load testing, backup-and-restore drill, and multi-hour soak test.

---

## 12. First Evaluation Milestone Checklist

This dedicated section defines exactly what will be demonstrated during the **First Evaluation**, clearly separating **Live / Working Features**, **Controlled Prototype Demonstrations**, and **Future Vision**:

| # | Evaluation Item | Demonstration Mode & Target Scope | Current Status |
|---|---|---|---|
| **1** | **Problem Statement & Proposed Solution** | Present industrial workplace safety gaps (manual supervision limits, alert fatigue, offline blind spots) and Warden's Eye's integrated AI + RFID + IoT + 120s warning solution. | `COMPLETED` (Documented in `README.md` & `plan.md`) |
| **2** | **System Architecture & Authenticated Backend** | Show the 7-layer architecture, MongoDB database models, JWT login, and 3-tier RBAC (`ADMINISTRATOR`, `SUPERVISOR` zone isolation, `WORKER` self-service) passing 10/10 automated tests. | `COMPLETED` (Live in `backend/`) |
| **3** | **Actual AI PPE Detection & False-Positive Filtering** | Live camera feed detecting `helmet`, `no_helmet`, `safety_vest`, `no_safety_vest` with multi-frame verification, person tracking, and 3-state classification (`SAFE`, `VIOLATION`, `UNCERTAIN`). | `PENDING` / `BLOCKED` (Awaiting ML teammate code integration) |
| **4** | **RFID Worker Identification** | Live ESP32 + 3.3V SPI RC522 reader scanning registered 13.56 MHz worker cards (`SUCCESS`, updating zone presence) and rejecting unregistered cards (`UNKNOWN_CARD`). | `PENDING` (Wiring verified; firmware & `/api/rfid/scan` next) |
| **5** | **ESP32 & Supplementary Sensor Integration** | Live ESP32 node sending 30-second heartbeats (`ONLINE` status) and supplementary smoke/flame threshold events (`POST /api/sensors/events`). *Explicitly disclosed as prototype demonstration sensors.* | `PENDING` / `BLOCKED` (Awaiting smoke/flame `ADC1` GPIO pin confirmation) |
| **6** | **Normal Safety Violation Workflow** | Worker enters camera view without a helmet -> verified across frames -> local speaker plays voice warning -> 120-second grace countdown starts on dashboard. | `PENDING` (Phase 7) |
| **7** | **120-Second Grace Period (Self-Correction vs. Escalation)** | **Demo A:** Worker puts on helmet within 120s -> warning auto-resolves (`SELF_RESOLVED_IN_GRACE`).<br>**Demo B:** Violation persists past 120s -> incident escalates (`OPEN`) and notifies assigned Zone Supervisor. *(Note: For live presentation pacing, demo mode may display both the standard 120s timer and a configurable accelerated demo timer, clearly labeled).* | `PENDING` (Phase 7) |
| **8** | **Critical Emergency & Manual SOS Demonstration** | Trigger supplementary flame sensor or validated fall detection -> skips 120s grace period -> immediate `CRITICAL` supervisor alert + generated **Manual SOS Summary** ready for forwarding to emergency services. | `PENDING` (Phase 8) |
| **9** | **Incident History, Evidence & SHA-256 Tamper Verification** | Supervisor reviews incident snapshot evidence, verifies incident (`VERIFIED`), and runs `GET /api/incidents/:id/verify-integrity` to prove SHA-256 cryptographic tamper detection. | `PENDING` (Phase 7) |
| **10** | **Offline Functionality (LAN Operation)** | Disconnect external internet; demonstrate that local backend, local DB, camera PPE detection, speaker warning, 120s timer, and LAN supervisor dashboard continue operating locally. | `PENDING` (Phase 10) |
| **11** | **Future Multi-Organisation SaaS & Subscription Vision** | Present the architecture roadmap for multi-tenant company isolation (`organisationId`), 11-step onboarding wizard, RTSP Edge Agent, and `Starter`/`Professional`/`Enterprise` subscription plans. | `COMPLETED` (Architected in Sections 7 & 8 of `plan.md`; implementation is `FUTURE`) |

---

## 13. Security, Reliability & Testing Strategy

### 13.1 Security & Reliability Milestone Checklist
- [x] **Password Hashing & Sensitive Field Exclusion:** `bcryptjs` hashing; `passwordHash` stripped via `select: false` and `toJSON` transforms (`COMPLETED`).
- [x] **JWT Authentication & Token Revocation:** Signed Bearer tokens with expiration and logout revocation (`COMPLETED`).
- [x] **Role & Zone Authorization (IDOR Prevention):** Server-side enforcement of `WORKER`, `SUPERVISOR` (assigned `zoneId`s only), and `ADMINISTRATOR` (`COMPLETED` for foundation routes).
- [x] **API Input Validation & Rate Limiting:** Zod schema validation and `express-rate-limit` on `/api/auth/*` and `/api/*` (`COMPLETED`).
- [ ] **ESP32 Device Authentication (`X-Device-Key`):** Per-device API key hashed as `apiKeyHash` in `devices` (`PENDING` — Phase 6).
- [ ] **ML Service Authentication (`X-ML-Service-Key`):** Dedicated service credential for `POST /api/detections` (`PENDING` — Phase 5).
- [ ] **Encrypted Camera Credentials:** AES-256-GCM encryption at rest for RTSP/IP camera passwords (`FUTURE` — Phase 13).
- [ ] **Secure Web Push Subscriptions & Duplicate Suppression:** Authenticated VAPID subscription binding per user/zone and deduplicated notification dispatch (`PENDING` — Phase 9).
- [ ] **Persistent Event & Timer Recovery:** Database-backed 120-second timers and `SyncOutbox` queue surviving process restarts (`PENDING` — Phases 7 & 10).
- [ ] **Incident Evidence Integrity:** Authenticated private evidence serving paired with SHA-256 `fileHash` and `recordHash` chain verification (`PENDING` — Phase 7).
- [ ] **Multi-Tenant `organisationId` Isolation:** Server-side tenant scoping across all queries (`FUTURE` — Phase 13).

### 13.2 Multi-Layer Testing Strategy
1. **Automated Backend Unit & Integration Tests (`node:test` + `supertest` + `mongodb-memory-server`):**
   - Currently `10/10` passing in `backend/tests/foundation.test.js`.
   - Expand with automated suites for `T01`–`T17`, 120-second grace auto-resolution vs. escalation, critical emergency zero-delay bypass, and offline-to-online sync idempotency.
2. **ML Detection Reliability Benchmarks:**
   - Evaluate Precision, Recall, FPR, and FNR on labeled test videos across lighting angles, occlusion cases, and multi-worker scenes; verify `UNCERTAIN` state suppression.
3. **Hardware Bench & Failure Recovery Tests:**
   - Verify 3.3V RC522 SPI operation, `ADC1` sensor stability with Wi-Fi active, 30s heartbeat timeout detection (`ONLINE` -> `OFFLINE`), and automatic Wi-Fi reconnection.

---

## 14. Risks, Dependencies & Required Team Confirmations

### 14.1 Technical Risks & Mitigations

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| **Unmerged Teammate Codebases (ML, Frontend, Firmware)** | Integration delays before First Evaluation | Lock down canonical JSON contracts in `docs/ApiDocumentation.md` and import/integrate teammate modules one by one against automated tests. |
| **False PPE Violations from Partial Body / Head Cropping** | Alert fatigue & unnecessary speaker warnings | Enforce head/torso visibility bounds, ByteTrack tracking, multi-frame persistence, and the `UNCERTAIN` state (Section 5). |
| **ESP32 `ADC2` Conflict with Wi-Fi or 5V Sensor Over-Voltage** | Sensor read failures or ESP32 pin damage | Wire analog sensors strictly to `ADC1` (`GPIO 32–39`) and use a 3.3V voltage divider ($10\text{ k}\Omega / 20\text{ k}\Omega$) on 5V sensor outputs (`docs/HARDWARE_SETUP.md`). |
| **Lost 120-Second Timers on Server Restart** | Missed supervisor escalations | Persist `graceExpiresAt` in the local database and reconcile pending timers on server startup (Section 6.1). |
| **Venue Wi-Fi Instability During Live Evaluation** | Hardware/cloud disconnect during demo | Run local offline-first LAN mode on a dedicated hotspot and maintain a clearly labeled fallback demo simulator script (Phase 12). |

### 14.2 Missing Information Requiring Team Confirmation

To unblock `BLOCKED` tasks in Phases 5, 6, and 9, the development team must confirm:
1. **Existing ML Code & Class Labels:** Location of the ML teammate's PPE detection repository/weights and exact raw class names output by the model.
2. **Smoke & Flame Sensor ESP32 GPIO Pins:** Exact `ADC1` GPIO pins wired on the physical prototype breadboard (recommended: `GPIO 34` for Smoke, `GPIO 35` for Flame).
3. **Existing Frontend Codebase:** Whether a frontend repository/folder already exists on the frontend teammate's machine to import into `frontend/`, or if `frontend/` should be scaffolded directly in this repo.
4. **Local Speaker Hardware Target:** Whether the prototype audio warning will play through the local edge computer's speaker output or an ESP32-connected buzzer/audio module.
