# Development Workflow and Team Responsibilities — SmartPPE

**Status:** Active Team Workflow & Integration Specification

---

## 1. Purpose

Coordinate development across hardware/IoT, backend, machine learning, frontend, and technical documentation for **SmartPPE — Warden's Eye** (AI & IoT-Based Workplace Safety Monitoring System) while preventing schema mismatches, duplicate code, or secret leaks.

---

## 2. Team Work Areas & Planned Repository Folder Ownership

| Work Area | Planned Repository Path | Core Responsibilities |
|---|---|---|
| **Backend & System Integration** | `backend/` | REST & WebSocket APIs, database models (12 entities), JWT + 3-tier RBAC, supervisor zone isolation, `X-Device-Key` & `X-ML-Service-Key` auth,RFID/sensor/ML ingestion, incident deduplication cooldowns, and SHA-256 tamper-evident hashing |
| **Machine Learning (Camera PPE)** | `ml-model/` | Camera frame capture, PPE detection inference, frame persistence filtering, violation snapshot capture, and sending canonical JSON to `POST /api/detections` |
| **Frontend Dashboards** | `frontend/` | Role-based web dashboards (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`), real-time WebSocket event listeners, analytics charts, incident verification UI, and SHA-256 integrity verification badge |
| **Hardware & ESP32 Firmware** | `hardware/esp32/`<br>`hardware/circuit-diagrams/` | ESP32 non-blocking firmware, 3.3V SPI MFRC522 RFID reader wiring, supplementary smoke & flame sensor integration (`ADC1` pins, 3.3V protection), local scan cooldown, and 30s heartbeats |
| **Architecture & Documentation** | `docs/` & `README.md` | Canonical API/database contracts, security specification, hardware setup, testing evidence, and audit reports |

---

## 3. Canonical Integration Contract Rules

Before merging or connecting any two modules, every team member must adhere to the **Canonical Proposed Contracts** documented in this repository:

1. **Canonical API Payloads & Headers:** Follow [`docs/ApiDocumentation.md`](ApiDocumentation.md) for all endpoints, especially:
   - `POST /api/rfid/scan` (authenticated with `X-Device-Code` + `X-Device-Key`)
   - `POST /api/sensors/events` (authenticated with `X-Device-Code` + `X-Device-Key`)
   - `POST /api/devices/heartbeat` (authenticated with `X-Device-Code` + `X-Device-Key`)
   - `POST /api/detections` (authenticated with `X-ML-Service-Key`)
2. **Canonical Database Entities & Enums:** Follow [`docs/DataBase.md`](DataBase.md) for the 12 core entities and uppercase status/role enums (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`, `OPEN`, `UNDER_REVIEW`, `VERIFIED`, `RESOLVED`, `REJECTED`).
3. **Timestamp Convention:** Use ISO 8601 UTC strings (`"YYYY-MM-DDTHH:mm:ssZ"`), using `occurredAt` for physical event occurrence times and `createdAt` / `updatedAt` for database record timestamps.
4. **Domain Terminology:** Always use general workplace and industrial safety terminology (workplace zones, employees/workers, assembly/warehouse/restricted zones). Never re-introduce mining-specific terminology or smart-helmet claims.

---

## 4. Git & Repository Hygiene Workflow

1. **Protect Secrets First:**
   - Never commit `.env` files, hardcoded Wi-Fi passwords, database URIs, JWT secrets, or raw device API keys.
   - Verify `.gitignore` is active before running `git add`. Use `.env.example` with placeholder values only.
2. **Branching Strategy:**
   - Keep `main` stable and deployable.
   - Create focused feature branches for each module task:
     - `docs/canonical-contract-alignment`
     - `feature/backend-core-and-models`
     - `feature/auth-and-rbac`
     - `feature/rfid-and-sensor-ingestion`
     - `feature/ml-detection-and-incidents`
     - `feature/sha256-tamper-evidence`
     - `feature/frontend-dashboards`
     - `feature/esp32-firmware`
3. **Commit & Pull Request Discipline:**
   - Make small, logical commits.
   - Test endpoints and validation rules locally against [`docs/TESTING.md`](TESTING.md) before merging.
   - Update documentation status tables honestly when a module moves from `PLANNED` to `IMPLEMENTED` and `VERIFIED`.

---

## 5. Step-by-Step Development & Integration Sequence

1. **Step 1 — Audit & Documentation Alignment (Completed):** Audit repository, unify API/database/security/hardware/ML contracts, remove mining terminology, and add `.gitignore` and `.env.example`.
2. **Step 2 — Team Confirmations & Code Import:** Confirm existing frontend, ML, backend, or firmware code from teammates' local machines/branches and confirm smoke/flame ESP32 `ADC1` GPIO pins and ML class labels.
3. **Step 3 — Backend Foundation & 12 Database Models:** Set up the backend server, database connection, 12 canonical models, unique indexes, and demo seed script.
4. **Step 4 — Authentication & 3-Tier RBAC Middleware:** Implement user login (`JWT`), password hashing, `WORKER` / `SUPERVISOR` (zone-scoped) / `ADMINISTRATOR` guards, and `X-Device-Key` / `X-ML-Service-Key` verification.
5. **Step 5 — Zone, Worker, Device & Camera Registry APIs:** Implement management and self-service (`/api/workers/me`) endpoints plus heartbeat timeout tracking.
6. **Step 6 — RFID, Sensor & ML Detection Ingestion + Cooldown Engine:** Implement `/api/rfid/scan`, `/api/sensors/events`, `/api/detections`, and automatic incident generation with deduplication cooldowns.
7. **Step 7 — Supervisor Verification & SHA-256 Tamper-Evident Ledger:** Implement incident verification (`VERIFIED` / `REJECTED`), resolution (`RESOLVED`), canonical SHA-256 `recordHash` + `previousHash` chaining, `/api/incidents/:id/verify-integrity`, and `auditLogs`.
8. **Step 8 — Real-Time WebSockets & Dashboard Analytics:** Connect Socket.IO room broadcasting and `/api/dashboard/*` aggregations.
9. **Step 9 — Frontend, ESP32 Firmware & ML Camera Integration:** Connect all three role dashboards, flash ESP32 node firmware, and connect the Python ML camera inference bridge.
10. **Step 10 — End-to-End Verification (`T01`–`T17`):** Execute all tests in [`docs/TESTING.md`](TESTING.md) and record actual test evidence.

---

## 6. Instructions for AI Coding Assistants (Antigravity)

- Always inspect the existing repository before editing or creating files.
- Follow the canonical contracts in [`docs/ApiDocumentation.md`](ApiDocumentation.md), [`docs/DataBase.md`](DataBase.md), and [`docs/SECURITY_AND_ROLES.md`](SECURITY_AND_ROLES.md).
- Reuse existing components, routes, and database models—never create a duplicate backend or second database.
- Do not modify the frontend design or ML model pipeline without explicit user approval.
- Implement one module at a time and wait for user approval between phases.
- Never invent credentials, hardware pin numbers, ML accuracy metrics, or fake passing test results.

---

## 7. Definition of Done

A module is considered **`IMPLEMENTED AND VERIFIED`** only when:
1. Source code is committed to the repository.
2. Input validation, error handling, and role/zone authorization are enforced on the server.
3. Corresponding functional and security test cases in [`docs/TESTING.md`](TESTING.md) have been executed and passed.
4. Documentation status tables accurately reflect the verified state.
