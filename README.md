# SmartPPE — Warden's Eye

### AI & IoT-Based Workplace Safety Monitoring System

**SmartPPE — Warden's Eye** is an AI and IoT-based workplace and industrial safety monitoring system designed to improve employee safety through camera-based Personal Protective Equipment (PPE) detection, RFID-based worker identification, supplementary environmental hazard monitoring, and centralized incident management.

The system integrates ESP32 IoT hardware, computer vision, backend services, a database, and role-based monitoring dashboards to provide a unified workplace safety solution across industrial facilities, warehouses, construction sites, laboratories, and restricted operational zones.

> **Important Prototype Disclaimer:**
> - SmartPPE uses **camera-based PPE detection** and **station/checkpoint RFID worker identification**. It does **not** use smart helmets or helmet-mounted sensors.
> - The smoke and flame sensors included in the hardware prototype are **supplementary prototype demonstration components** and must not be described or relied upon as certified industrial life-safety instruments.

---

## 1. Problem Statement & Project Objectives

### Problem Statement
Industrial and workplace environments require continuous compliance with Personal Protective Equipment (PPE) rules, controlled zone access, rapid awareness of environmental anomalies, and accountable incident verification. Manual supervision alone cannot continuously monitor every entry checkpoint or operational zone, and unverified alerts can lead to either missed hazards or alert fatigue.

### Project Objectives
- **RFID Worker Identification:** Identify workers at workplace checkpoints and zones using 13.56 MHz RFID cards and ESP32 + MFRC522 readers.
- **Camera-Based PPE Detection:** Detect missing or properly worn safety equipment (such as safety helmets and high-visibility vests) using a computer vision model.
- **Supplementary Hazard Monitoring:** Demonstrate environmental hazard alerts using ESP32-connected smoke and flame sensor modules.
- **Centralized Incident Management:** Automatically generate, deduplicate, and track safety incidents from PPE violations, environmental alerts, and unknown RFID scans.
- **Role-Based Dashboards & Verification:** Enforce a three-tier role hierarchy (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`) where supervisors verify and resolve incidents within their assigned zones and administrators maintain system-wide oversight.
- **Tamper-Evident Incident Records:** Maintain verifiable incident integrity using canonical SHA-256 cryptographic hashing and hash chaining (with blockchain anchoring planned as a future extension).
- **Scalable Multi-Device & Multi-Camera Architecture:** Support multiple ESP32 units and multiple camera feeds across workplace zones.

---

## 2. Three User Roles

SmartPPE enforces a three-tier role hierarchy (detailed in [`docs/SECURITY_AND_ROLES.md`](docs/SECURITY_AND_ROLES.md)):

| Role | Scope | Core Responsibilities |
|---|---|---|
| **`WORKER`** | Personal (Self) | View own worker profile, assigned workplace zone, personal PPE compliance status, safety notifications, and personal incident history. |
| **`SUPERVISOR`** | Assigned Workplace Zones | Monitor assigned zones, view workers and active RFID presence in assigned zones, receive live zone alerts, review incident evidence, and verify, reject, or resolve incidents in assigned zones. Read-only access to assigned-zone workers (cannot create/delete workers). |
| **`ADMINISTRATOR`** *(Higher Authority)* | System-Wide | Full system overview, create/manage workers and supervisors, manage workplace zones and supervisor-zone assignments, register and monitor ESP32 devices and cameras, view all incidents and advanced analytics, verify record integrity, and review system audit logs. |

---

## 3. Core System Modules & Seven Main Capabilities

### System Modules

| Module | Description |
|---|---|
| **RFID Identification** | Identifies registered workers via MFRC522 RFID readers and records zone scan logs |
| **Camera PPE Detection** | Processes camera frames via the ML pipeline and submits structured PPE detection events |
| **Environmental Monitoring** | Monitors supplementary smoke and flame sensors via ESP32 |
| **Backend & API Layer** | Authenticates users/devices/services, validates payloads, applies incident rules, and serves REST/real-time APIs |
| **Database Layer** | Stores users, workers, zones, zone assignments, devices, cameras, logs, detections, incidents, evidence, and audit trails |
| **Role-Based Dashboards** | Provides dedicated views for Workers, Supervisors, and Administrators |
| **Tamper-Evident Integrity Layer** | Proposed SHA-256 canonical incident hashing and hash chaining (with optional future blockchain anchoring) |

### Seven Main Project Capabilities & Current Status

These seven capabilities form part of the intended SmartPPE project scope. Because the current repository contains specification and architecture documentation while source code integration is pending verification from team branches, their current repository status is reported transparently below:

| # | Core Project Capability | Current Repository Status | Notes |
|---|---|---|---|
| 1 | **Real-Time Dashboard Updates** | `PLANNED` / `NOT VERIFIED` | Event contracts (`rfid:scan`, `ppe:detection`, `sensor:alert`, `incident:new`, `incident:updated`, `device:status`, `camera:status`) defined in [`docs/ApiDocumentation.md`](docs/ApiDocumentation.md). |
| 2 | **Advanced Safety Analytics** | `PLANNED` / `NOT VERIFIED` | Compliance percentage, zone risk breakdown, and trend metrics defined in [`docs/Architecture.md`](docs/Architecture.md) and [`docs/ApiDocumentation.md`](docs/ApiDocumentation.md). |
| 3 | **Multi-Camera Support** | `PLANNED` / `NOT VERIFIED` | Camera registry, zone mapping, and per-camera detection ingestion specified in [`docs/ML_INTEGRATION.md`](docs/ML_INTEGRATION.md) and [`docs/DataBase.md`](docs/DataBase.md). |
| 4 | **Multiple ESP32 Device Support** | `PLANNED` / `NOT VERIFIED` | Per-device identity (`deviceCode`), zone mapping, authentication (`apiKeyHash`), and heartbeat tracking specified in [`docs/HARDWARE_SETUP.md`](docs/HARDWARE_SETUP.md) and [`docs/DataBase.md`](docs/DataBase.md). |
| 5 | **Advanced Role & Permission Management** | `PARTIALLY IMPLEMENTED` | Foundation RBAC (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`) and supervisor zone isolation implemented and verified in `backend/src/middleware/auth.middleware.js`. |
| 6 | **Tamper-Evident Incident Records** | `PLANNED` / `NOT VERIFIED` | Proposed canonical SHA-256 hashing (`recordHash`), hash chaining (`previousHash`), and evidence file hashing (`fileHash`) specified in [`docs/DataBase.md`](docs/DataBase.md). Blockchain anchoring remains a future extension (`NOT STARTED`). |
| 7 | **Scalable Deployment Architecture** | `PLANNED` / `NOT VERIFIED` | Modular decoupling of ESP32 nodes, ML service, backend API, database, and frontend specified in [`docs/Architecture.md`](docs/Architecture.md) and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). |

---

## 4. Hardware Components

Detailed wiring and hardware safety notes are documented in [`docs/HARDWARE_SETUP.md`](docs/HARDWARE_SETUP.md).

- **ESP32 Development Board** (Wi-Fi-enabled microcontroller node)
- **MFRC522 (RC522) 13.56 MHz RFID Reader** (connected via 3.3V SPI)
- **Compatible 13.56 MHz ISO/IEC 14443A RFID Cards / Tags**
- **Smoke Sensor Module** (supplementary prototype demonstration component)
- **Flame Sensor Module** (supplementary prototype demonstration component)
- **Camera Input** (for the separate computer-vision PPE detection pipeline)

---

## 5. Technology Stack Status

In accordance with strict engineering verification standards, distinguish between the **proposed stack** and **verified repository code**:

| Component | Technology | Current Verification Status |
|---|---|---|
| **Microcontroller** | ESP32 (Arduino / C++) | `PROPOSED` / `TO BE CONFIRMED` (firmware not yet committed to repo) |
| **RFID Reader** | MFRC522 (3.3V SPI) | `VERIFIED IN DOCS` (SPI pinout documented in [`docs/HARDWARE_SETUP.md`](docs/HARDWARE_SETUP.md)) |
| **Environmental Sensors** | Smoke Sensor & Flame Sensor | `PROPOSED` / `TO BE CONFIRMED` (exact ESP32 GPIO pins to be confirmed with hardware team) |
| **ML / Computer Vision** | Camera-Based PPE Detection Model | `TO BE CONFIRMED` (developed by ML team member; model weights/scripts not yet committed) |
| **Backend API** | Node.js + Express.js + Zod + Helmet + CORS | `IMPLEMENTED (Foundation Phase)` (`backend/src/*` verified with 10/10 tests) |
| **Database** | MongoDB + Mongoose ODM | `IMPLEMENTED (Foundation Models: User, Zone, Worker, ZoneAssignment)` |
| **Authentication** | JWT (`Bearer` token) + `bcryptjs` password hashing + Rate Limiting | `IMPLEMENTED & VERIFIED` (`/api/auth/register`, `/login`, `/me`, `/logout`) |
| **Role-Based Access Control** | 3-Tier RBAC (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`) + Zone Isolation | `IMPLEMENTED & VERIFIED` (`backend/src/middleware/auth.middleware.js`) |
| **Real-Time Transport** | Proposed: WebSockets (e.g., Socket.IO) | `PROPOSED` / `NOT IMPLEMENTED` |
| **Frontend Dashboard** | Web Dashboard Framework | `TO BE CONFIRMED` (developed by frontend team member; code not yet committed) |
| **Tamper-Evident Ledger** | Proposed: SHA-256 Hash Chain (Future: Blockchain Anchoring) | `PROPOSED` / `NOT IMPLEMENTED` |
| **Version Control** | Git & GitHub | `VERIFIED` |

---

## 6. System Workflow

1. **Worker Identification:** A worker taps an RFID card on an RC522 reader connected to an ESP32 node.
2. **RFID Ingestion:** The ESP32 sends `POST /api/rfid/scan` with `deviceCode` and `rfidUid` (authenticated via `X-Device-Key`).
3. **Worker Resolution & Cooldown:** The backend resolves the registered worker, enforces a duplicate-scan cooldown window, records the scan in `rfidLogs`, and flags unknown cards.
4. **Camera PPE Detection:** The ML inference service processes camera frames and submits structured detections to `POST /api/detections` (authenticated via `X-ML-Service-Key`).
5. **Environmental Monitoring:** The ESP32 samples smoke and flame sensors and sends threshold events to `POST /api/sensors/events`.
6. **Incident Generation & Deduplication:** When a PPE violation, smoke/flame hazard, or repeated unknown RFID event meets configured rules (and is outside the deduplication cooldown window), the backend creates or updates an incident record.
7. **Real-Time Notification:** Connected Supervisor and Administrator dashboards receive instant updates for their permitted workplace zones.
8. **Supervisor Verification & Integrity Hashing:** An authorized supervisor reviews incident details and evidence, then verifies (`VERIFIED`), rejects (`REJECTED`), or resolves (`RESOLVED`) the incident. Upon verification, the backend computes a canonical SHA-256 `recordHash` chained to `previousHash` and records an audit log entry.

---

## 7. Repository Directory Structure

### 7.1 Actual Current Repository Files (Verified)

```text
Warden-s-Eye/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                 # Mongoose connection & graceful shutdown
│   │   │   └── env.js                # Environment variable loader
│   │   ├── controllers/
│   │   │   ├── auth.controller.js    # Register, login, getMe, logout
│   │   │   ├── worker.controller.js  # Role/zone-scoped worker queries
│   │   │   └── zone.controller.js    # Role/zone-scoped workplace zone queries
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js    # JWT verification, RBAC & zone context
│   │   │   ├── error.middleware.js   # Centralized error & 404 handler
│   │   │   └── validate.middleware.js# Zod request schema validator
│   │   ├── models/
│   │   │   ├── User.model.js         # Users model (WORKER, SUPERVISOR, ADMINISTRATOR)
│   │   │   ├── Worker.model.js       # Workers model with userId & rfidUid partial unique indexes
│   │   │   ├── Zone.model.js         # Workplace Zones model
│   │   │   └── ZoneAssignment.model.js # Supervisor-to-Zone assignments model
│   │   ├── routes/
│   │   │   ├── auth.routes.js        # /api/auth/*
│   │   │   ├── user.routes.js        # /api/users/me
│   │   │   ├── worker.routes.js      # /api/workers/*
│   │   │   └── zone.routes.js        # /api/zones/*
│   │   ├── utils/
│   │   │   ├── AppError.js           # Custom operational HTTP error class
│   │   │   └── apiResponse.js        # Canonical JSON response envelope
│   │   ├── validators/
│   │   │   └── auth.validator.js     # Zod schemas for register & login
│   │   ├── app.js                    # Express app, Helmet, CORS, rate limiters & routes
│   │   └── server.js                 # HTTP server bootstrap & SIGINT/SIGTERM handling
│   ├── tests/
│   │   └── foundation.test.js        # 10 automated integration & RBAC security tests
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
├── docs/
│   ├── ApiDocumentation.md           # Canonical REST & real-time API contract
│   ├── Architecture.md               # 7-layer system architecture & capability design
│   ├── DEPLOYMENT.md                 # Environment, deployment & hackathon demo checklist
│   ├── DEVELOPMENT_WORKFLOW.md       # Team responsibilities, Git workflow & integration sequence
│   ├── DataBase.md                   # Logical database schema (4 implemented, 8 planned)
│   ├── HARDWARE_SETUP.md             # ESP32 + RC522 verified SPI pinout & sensor safety guide
│   ├── ML_INTEGRATION.md             # Camera PPE detection interface & deduplication rules
│   ├── SECURITY_AND_ROLES.md         # 3-tier RBAC matrix, device/ML auth & evidence security
│   ├── TESTING.md                    # Functional, security, hardware & ML test specification
│   └── ps.md                         # Project Specification (PS)
├── .env.example                      # Placeholder environment variable template (no secrets)
├── .gitignore                        # Git ignore rules protecting secrets, builds & dependencies
├── README.md                         # Project overview and documentation index
└── SMARTPPE_TECHNICAL_AUDIT.md       # Complete technical & documentation audit report
```

### 7.2 Planned Target Code Directories (Remaining Modules To Be Integrated)

```text
Warden-s-Eye/
├── frontend/                         # Planned: Role-based Worker, Supervisor & Admin dashboards
├── ml-model/                         # Planned: Camera PPE inference service & backend bridge
└── hardware/
    ├── esp32/                        # Planned: ESP32 firmware (RC522 + Smoke + Flame + Heartbeat)
    └── circuit-diagrams/             # Planned: Hardware wiring diagrams
```

---

## 8. Documentation Index

All project documentation is maintained in the [`docs/`](docs/) directory:

- **Project Specification:** [`docs/ps.md`](docs/ps.md)
- **System Architecture:** [`docs/Architecture.md`](docs/Architecture.md)
- **Canonical API Documentation:** [`docs/ApiDocumentation.md`](docs/ApiDocumentation.md)
- **Logical Database Schema:** [`docs/DataBase.md`](docs/DataBase.md)
- **Security & Role-Based Access Control:** [`docs/SECURITY_AND_ROLES.md`](docs/SECURITY_AND_ROLES.md)
- **Hardware & ESP32 Setup Guide:** [`docs/HARDWARE_SETUP.md`](docs/HARDWARE_SETUP.md)
- **AI/ML Camera Integration Guide:** [`docs/ML_INTEGRATION.md`](docs/ML_INTEGRATION.md)
- **Testing Strategy & Test Cases:** [`docs/TESTING.md`](docs/TESTING.md)
- **Deployment & Demo Guide:** [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- **Development Workflow & Team Guide:** [`docs/DEVELOPMENT_WORKFLOW.md`](docs/DEVELOPMENT_WORKFLOW.md)
- **Technical Audit Report:** [`SMARTPPE_TECHNICAL_AUDIT.md`](SMARTPPE_TECHNICAL_AUDIT.md)

---

## 9. Backend Installation, Setup & Running Tests

The Backend Foundation (`backend/`) is implemented and verified with automated tests.

### 9.1 Prerequisites
- **Node.js** `>= 20.0.0` (verified on Node.js `v24.13.0`)
- **MongoDB** (local instance or MongoDB Atlas URI for running the live server; automated tests use `mongodb-memory-server` automatically)

### 9.2 Installation & Environment Configuration
```bash
cd backend
npm install
cp .env.example .env
```
Edit `backend/.env` and set your `MONGODB_URI` and a strong `JWT_SECRET`.

### 9.3 Starting the Backend Server
```bash
# Development mode (auto-reload):
npm --prefix backend run dev

# Production / standard start:
npm --prefix backend start
```

### 9.4 Running the Automated Foundation Test Suite
```bash
npm --prefix backend test
```
*(Runs all 10 integration & RBAC security test suites covering database connection, registration validation, bcrypt password hashing, JWT login/verification, token revocation, worker self-only access, supervisor zone isolation, and administrator access.)*

---

## 10. Limitations & Safety Disclaimers

1. **Camera PPE Detection vs. Worker Identity:** Camera-based PPE object detection identifies visible safety equipment and compliance states (`helmet`, `no_helmet`, `safety_vest`, `no_safety_vest`), **not** a specific named worker. `workerId` remains `null` on camera detections unless linked through a verified identification mechanism.
2. **Supplementary Prototype Sensors:** Smoke and flame sensor modules are included strictly for prototype hazard-alert demonstration. They are not calibrated or certified for real industrial fire/gas life-safety protection.
3. **Tamper-Evident Records vs. Blockchain:** Incident integrity is designed around canonical SHA-256 hashing and hash chaining first; on-chain blockchain anchoring is a planned future extension and is not currently implemented.

---

**Project Name:** SmartPPE — Warden's Eye  
**Category:** AI + IoT + Computer Vision + Workplace & Industrial Safety Monitoring
