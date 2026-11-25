# Deployment & Demonstration Guide — SmartPPE

**Status:** Proposed Deployment & Hackathon Demo Guide (To Be Adapted Once Codebase Stack Is Integrated)

---

## 1. Overview

This guide outlines the environment configuration, pre-deployment verification, local network hardware setup, production safeguards, and hackathon demonstration checklist for **SmartPPE — Warden's Eye** (AI & IoT-Based Workplace Safety Monitoring System).

---

## 2. Pre-Deployment Verification Checklist

Before deploying or running a live prototype demonstration:
1. Confirm the actual integrated technology stack across `backend/`, `frontend/`, `ml-model/`, and `hardware/esp32/`.
2. Copy `.env.example` to `.env` and populate local/deployment secrets (never commit `.env` to Git).
3. Verify database connectivity, unique indexes ([`docs/DataBase.md`](DataBase.md) Section 17), and seeded demo accounts (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`).
4. Verify that ESP32 devices (`ESP32_001`, etc.) and cameras (`CAM_001`, etc.) are registered in the database with their assigned workplace `zoneId` and hashed credentials (`apiKeyHash`).
5. Run the functional and security test suite ([`docs/TESTING.md`](TESTING.md) `T01`–`T17`).

---

## 3. Environment Configuration (`.env.example`)

All application services read configuration from environment variables. A template file [`.env.example`](../.env.example) is provided in the repository root containing **only safe placeholder values**.

Key configuration categories:
- **Backend Application:** `NODE_ENV`, `PORT` (default `5000`), `API_BASE_URL`, `CORS_ALLOWED_ORIGIN`
- **Database:** `DATABASE_URL` / `MONGODB_URI`
- **User Authentication:** `JWT_SECRET`, `JWT_EXPIRES_IN` (e.g., `8h`), `BCRYPT_SALT_ROUNDS` (e.g., `10`)
- **Service & Hardware Ingestion & Cooldowns:**
  - `ML_SERVICE_API_KEY` (validated against `X-ML-Service-Key`)
  - `RFID_COOLDOWN_SECONDS` (default `10`)
  - `INCIDENT_COOLDOWN_SECONDS` (default `60`)
  - `DEVICE_HEARTBEAT_TIMEOUT_SECONDS` (default `90`)
- **Evidence Storage:** `EVIDENCE_STORAGE_DIR` or private object storage bucket variables
- **Frontend:** `VITE_API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` and WebSocket URL

> **Security Rule:** Never copy real database URIs, passwords, JWT secrets, or device API keys into `.env.example`, Markdown docs, or ESP32 source files tracked by Git.

---

## 4. Deployment Components

Depending on the team's final integrated code branches, a complete SmartPPE deployment consists of:
1. **Frontend Dashboard Application** (Role-based web UI for `WORKER`, `SUPERVISOR`, `ADMINISTRATOR`).
2. **Backend REST & WebSocket API Service** (Authentication, ingestion, cooldown engine, SHA-256 integrity hashing).
3. **Database Instance** (Storing the 12 canonical entities defined in [`docs/DataBase.md`](DataBase.md)).
4. **ML Inference Service** (Camera frame capture, PPE object detection, and `POST /api/detections` client).
5. **ESP32 IoT Nodes** (MFRC522 RFID reader + supplementary smoke/flame sensors communicating over Wi-Fi HTTP).
6. **Private Evidence Storage** (Local protected directory or private cloud bucket for violation snapshots).

---

## 5. Hackathon Local LAN / Wi-Fi Hotspot Connectivity for ESP32 & Camera

During an on-site prototype review or hackathon demonstration, venue Wi-Fi often blocks device-to-laptop traffic (client isolation). Use a dedicated local Wi-Fi hotspot or router:

1. **Shared Local Network:** Connect the host laptop (running the Backend, Frontend, and ML Camera service) and all ESP32 nodes to the same mobile hotspot or dedicated local router (2.4 GHz Wi-Fi for ESP32 compatibility).
2. **Find Host Local IPv4 Address:** Determine the host laptop's LAN IPv4 address (e.g., `192.168.x.x` via `ipconfig` on Windows or `ip a` on Linux/macOS).
3. **Configure ESP32 Firmware Endpoint:** Point the ESP32 firmware's backend URL to `http://<HOST_LAN_IP>:5000/api` (never `http://localhost:5000/api`, because `localhost` on the ESP32 refers to the microcontroller itself).
4. **Firewall Port Rule:** Ensure the host firewall allows incoming TCP connections on the backend port (e.g., port `5000`) on the private/local network profile.

---

## 6. Production & Prototype Safeguards

- Enforce HTTPS in cloud/hosted environments and restrict CORS to known frontend origins.
- Verify role and workplace zone authorization on every API endpoint (`T08`, `T10`, `T14`).
- Enforce device (`X-Device-Key`) and ML service (`X-ML-Service-Key`) authentication on all ingestion routes (`T03`).
- Validate payload sizes, confidence bounds (`0.0..1.0`), and enum values.
- Protect `auditLogs` and verified incident `recordHash` chains from unauthorized modification.

---

## 7. Hackathon & Review Demonstration Checklist

- [ ] **Network & Services Running:** Backend, Database, Frontend, and ML Camera service are online and reachable on the demo network.
- [ ] **Three Role Logins Ready:** Test accounts ready for:
  - `ADMINISTRATOR` (System-wide overview, all workplace zones, audit logs, device/camera registry)
  - `SUPERVISOR` (Assigned to `Assembly Zone A` — sees only Zone A workers, devices, cameras, and incidents)
  - `WORKER` (Linked to test worker `EMP-001` — sees personal profile, compliance status, and own incidents)
- [ ] **RFID Cards Prepared:**
  - At least 2 **registered** 13.56 MHz RFID cards mapped to test workers (`EMP-001`, `EMP-002`).
  - At least 1 **unregistered** 13.56 MHz RFID card to demonstrate `"UNKNOWN_CARD"` / `"UNKNOWN_RFID"` handling (`T02`).
- [ ] **ESP32 Node Online:** `ESP32_001` powered via USB, RC522 wired to 3.3V SPI, sending heartbeats (`status: "ONLINE"` on dashboard).
- [ ] **Camera & ML Feed Ready:** `CAM_001` registered to `Assembly Zone A`, detecting PPE compliance and triggering a single deduplicated `"MISSING_HELMET"` or `"MISSING_SAFETY_VEST"` incident when PPE is missing.
- [ ] **Safe Sensor Trigger Prepared:** Controlled, lab-safe trigger or simulated test switch ready to demonstrate `"SMOKE_DETECTED"` and `"FLAME_DETECTED"` alerts.
- [ ] **Tamper-Evident SHA-256 Verification Demo:** Verify an incident as Supervisor, then click/call integrity verification (`/api/incidents/:id/verify-integrity`) to demonstrate cryptographic SHA-256 hash chain verification live.
- [ ] **Fallback Simulation Script Ready:** Keep a clearly labelled demo event script ready in case venue Wi-Fi or hardware power is interrupted during presentation.
- [ ] **Honest Prototype Disclaimers Stated:** Clearly note to reviewers that smoke/flame sensors are supplementary prototype demonstration modules (not certified industrial life-safety sensors), camera PPE detection does not perform facial recognition, and on-chain blockchain anchoring is a planned future extension on top of the SHA-256 hash chain.

---

## 8. Rollback Procedure

Maintain a tagged known-good Git commit and database seed snapshot before live demonstrations. If a last-minute change causes an issue, reset to the tagged commit and re-run the database seed script to restore a clean, verified demo state.
