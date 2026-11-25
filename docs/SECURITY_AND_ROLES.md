# Security and Role-Based Access Control (RBAC) — SmartPPE

**Status:** Proposed Security & Authorization Specification (Not Yet Implemented in Repository Code)

---

## 1. Purpose

This document defines the canonical authentication, authorization, role hierarchy, device/service credential rules, and data protection standards for **SmartPPE — Warden's Eye** across human users (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`), ESP32 IoT devices, and the camera-based ML inference service.

> **Verification Note:** No authentication or RBAC middleware code currently exists in the repository. All controls described below are **proposed security specifications** that must be enforced on the backend once code implementation begins.

---

## 2. Three-Tier Role Hierarchy

SmartPPE enforces three canonical uppercase user roles (`users.role`):

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

### 2.1 `WORKER`
- **Scope:** Personal (Self-Service Only via linked `workers.userId`).
- **Permitted Actions:**
  - View own user and worker profile (`GET /api/auth/me`, `GET /api/workers/me`).
  - View own assigned workplace zone, PPE safety compliance status, and recent RFID check-ins.
  - View own personal safety alerts and incident history (`GET /api/workers/me/incidents`).
- **Prohibited Actions:**
  - Cannot browse other workers' profiles (`GET /api/workers` returns `403 Forbidden`).
  - Cannot view unassigned workplace zones, verify/resolve incidents, or manage devices/cameras.

### 2.2 `SUPERVISOR`
- **Scope:** Assigned Workplace Zones Only (mapped via `zoneAssignments`).
- **Permitted Actions:**
  - View workplace zones assigned to them (`GET /api/supervisor/zones`).
  - View workers, active RFID check-ins, cameras, ESP32 device statuses, sensor alerts, and PPE detections **only within their assigned zones**.
  - **Worker Access Policy (Resolved Canonical Rule):** Supervisors have **read-only** access to workers in their assigned zones. Supervisors cannot create, edit, or delete worker accounts or reassign RFID cards.
  - Review incidents and attached evidence within assigned zones.
  - Update incident status to `"UNDER_REVIEW"`, verify (`"VERIFIED"`), reject false positives (`"REJECTED"`), and resolve (`"RESOLVED"`) incidents in assigned zones, with mandatory notes.
  - Trigger SHA-256 record integrity verification (`GET /api/incidents/:id/verify-integrity`) for incidents in assigned zones.
  - View zone-level safety analytics (`GET /api/dashboard/overview`, `/analytics`, `/zones`).
- **Prohibited Actions:**
  - Cannot access workers, cameras, devices, alerts, or incidents in unassigned zones (`403 Forbidden`).
  - Cannot create/delete workplace zones, manage other supervisors, register ESP32 devices/cameras, or change user roles.

### 2.3 `ADMINISTRATOR` (Higher Authority)
- **Scope:** System-Wide (All Workplace Zones).
- **Permitted Actions:**
  - System-wide dashboard overview and cross-zone safety analytics.
  - Create, update, and deactivate worker profiles and assign/reassign 13.56 MHz RFID card UIDs (`/api/workers`).
  - Create, update, and deactivate supervisor and worker login accounts (`/api/admin/supervisors`).
  - Create and manage workplace zones (`/api/admin/zones`) and assign/unassign supervisors to zones (`zoneAssignments`).
  - Register, configure, rotate credentials for, and monitor all ESP32 devices (`/api/devices`) and cameras (`/api/cameras`).
  - View, verify, reject, or resolve incidents across any zone, and verify SHA-256 hash chain integrity across the entire system.
  - Inspect append-only system audit logs (`GET /api/admin/audit-logs`).

---

## 3. Unified Authorization Matrix

This matrix is canonical and matches [`docs/Architecture.md`](Architecture.md) and [`docs/DataBase.md`](DataBase.md):

| Action / Endpoint Capability | `WORKER` | `SUPERVISOR` | `ADMINISTRATOR` |
|---|---|---|---|
| View own user/worker profile (`/api/auth/me`, `/api/workers/me`) | Yes | Yes | Yes |
| View personal incident history (`/api/workers/me/incidents`) | Yes (Own only) | Yes | Yes |
| View workers list (`GET /api/workers`) | No | Assigned zones (Read-only) | All zones |
| Create / edit / delete workers & RFID tags (`POST/PUT/DELETE /api/workers`) | No | No | Yes |
| View workplace zones | Own assigned zone | Assigned zones | All zones |
| Create / edit / delete workplace zones (`/api/admin/zones`) | No | No | Yes |
| Manage supervisors & zone assignments (`/api/admin/supervisors`) | No | No | Yes |
| Register / manage ESP32 devices & cameras (`POST /api/devices`, `/api/cameras`) | No | View assigned-zone status | Yes (Full CRUD & keys) |
| View incidents & evidence (`GET /api/incidents`) | Own incidents only | Assigned zones | All zones |
| Verify / reject / resolve incidents (`/api/supervisor/incidents/:id/*`) | No | Assigned zones | All zones |
| Verify incident SHA-256 hash integrity (`/api/incidents/:id/verify-integrity`) | No | Assigned zones | All zones |
| View safety analytics (`/api/dashboard/*`) | Personal summary | Assigned zones | System-wide |
| View system audit logs (`/api/admin/audit-logs`) & manage roles | No | No | Yes |

---

## 4. Human User Authentication (Proposed Specification)

- **Password Hashing:** Never store or log plaintext passwords. Hash all passwords using `bcrypt` (cost factor $\ge 10$) or `argon2id` into `users.passwordHash`.
- **JWT Access Tokens:**
  - Issued upon successful `POST /api/auth/login`.
  - Signed using a high-entropy `JWT_SECRET` ($\ge 256$-bit secret stored in `.env`).
  - Recommended access-token expiry: `8h` for prototype/shift use (or `15m` access token paired with an `httpOnly` refresh token if refresh tokens are enabled).
  - Token payload includes `{ sub: userId, role: user.role }`—the backend middleware must still verify that the user account remains `"ACTIVE"` and resolve supervisor `zoneIds` server-side from `zoneAssignments`.
- **Login Rate Limiting:** Apply rate limiting (e.g., max 10 failed login attempts per 15 minutes per IP/account) on `POST /api/auth/login` to prevent credential brute-forcing.

---

## 5. ESP32 Device & ML Service Authentication

ESP32 nodes and the ML inference service must authenticate separately from human JWT sessions so a compromised sensor or script cannot impersonate a human supervisor or administrator.

### 5.1 ESP32 Device Authentication (`X-Device-Code` + `X-Device-Key`)
- Each registered ESP32 device in `devices` has a unique `deviceCode` (e.g., `"ESP32_001"`) and a secret API key.
- The backend stores **only a cryptographic hash** (`devices.apiKeyHash`, e.g., SHA-256 or `bcrypt`) in the database—never the raw secret.
- Every ESP32 request to `POST /api/rfid/scan`, `POST /api/sensors/events`, and `POST /api/devices/heartbeat` must include:
  - `X-Device-Code: <DEVICE_CODE>`
  - `X-Device-Key: <RAW_DEVICE_API_KEY>`
- The backend validates the key against `apiKeyHash`, confirms the device is not in `"MAINTENANCE"` mode, and resolves `zoneId` strictly from the registered `devices` record (ignoring any client-spoofed zone ID).

### 5.2 ML Inference Service Authentication (`X-ML-Service-Key`)
- Requests from the ML service to `POST /api/detections` must provide the `X-ML-Service-Key` header matching the backend's environment variable `ML_SERVICE_API_KEY` (or per-camera hashed credential).
- The backend verifies that `cameraCode` is registered in `cameras` and resolves `zoneId` directly from the camera record.

---

## 6. Server-Side Authorization & IDOR Prevention

1. **Never Trust Frontend Claims:** Frontend route guards and hidden buttons are UX conveniences only. Every backend endpoint must enforce `requireAuth`, `requireRole(...)`, and zone-scope checks.
2. **Prevent Insecure Direct Object References (IDOR):**
   - When a `SUPERVISOR` requests `GET /api/incidents/:id`, `GET /api/workers/:id`, or `POST /api/supervisor/incidents/:id/verify`, the backend must load the target record's `zoneId` and verify that `zoneId` is present in the supervisor's active `zoneAssignments`. If not, return `403 Forbidden`.
   - When a `WORKER` requests incident or profile data, the backend must scope the query strictly to `workerId === currentUser.workerId`.
3. **Real-Time Subscription Scoping:** WebSocket connections must authenticate via JWT during the handshake and only join socket rooms corresponding to their authorized role and assigned `zoneId`s.

---

## 7. Data, Secret & Evidence Protection

- **Environment Secrets:** Store all secrets (`JWT_SECRET`, database URI, `ML_SERVICE_API_KEY`, storage keys) in `.env` (excluded via `.gitignore`). Commit only `.env.example` with safe placeholder values.
- **Evidence Protection:**
  - Store camera violation snapshots in private storage outside public unauthenticated web roots.
  - Serve evidence only through an authenticated endpoint or short-lived signed URL after verifying that the requester is authorized for that incident's `zoneId`.
  - Compute and store a SHA-256 `fileHash` in `incidentEvidence` when saving an image so file replacement or tampering can be detected.
  - Keep all images, videos, and worker personal information off-chain.

---

## 8. Audit Logging Requirements

Record append-only entries in `auditLogs` for:
- User login and failed authentication attempts.
- Worker registration, profile updates, and RFID UID assignment/reassignment.
- Supervisor creation and workplace zone assignment changes (`zoneAssignments`).
- ESP32 device and camera registration, status changes, and key rotation.
- Incident status changes (`UNDER_REVIEW`, `VERIFIED`, `REJECTED`, `RESOLVED`).
- Role or permission changes.

---

## 9. Security Testing Checklist

Before demonstration or deployment, execute the security tests defined in [`docs/TESTING.md`](TESTING.md):
1. Worker attempting to call `GET /api/workers` or `/api/admin/*` -> `403 Forbidden`.
2. Supervisor assigned to `ZONE_A` attempting to view or verify an incident in `ZONE_B` -> `403 Forbidden`.
3. ESP32 endpoint called without `X-Device-Key` or with an invalid key -> `401 Unauthorized`.
4. ML detection endpoint called without `X-ML-Service-Key` or with confidence `1.5` -> `401` / `400`.
5. Unauthorized user attempting to download incident evidence -> `403 Forbidden`.
6. Direct database modification of a `VERIFIED` incident -> detected by `GET /api/incidents/:id/verify-integrity` (`integrityValid: false`).
