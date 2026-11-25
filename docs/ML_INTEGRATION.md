# ML Integration — SmartPPE Camera-Based PPE Detection

**Status:** Canonical Proposed ML-to-Backend Integration Contract (Model Weights & Exact Class Labels To Be Confirmed with ML Team)

---

## 1. Purpose

This document defines the standardized interface, payload schema, worker-identity boundary, and incident deduplication rules between the **camera-based PPE detection component** and the **SmartPPE — Warden's Eye** backend.

All payload definitions in this document conform to **Canonical Contract #2 (`POST /api/detections`)** in [`docs/ApiDocumentation.md`](ApiDocumentation.md) and Entity 8 (`ppeDetections`) in [`docs/DataBase.md`](DataBase.md).

---

## 2. Responsibility Boundary

| Component | Core Responsibilities |
|---|---|
| **ML Inference Service** | Capture frames from configured cameras (`cameraCode`), run the PPE object-detection model, evaluate missing required PPE, apply local frame-rate throttling/persistence filtering, optionally save an annotated violation snapshot, and submit structured JSON payloads to `POST /api/detections` using `X-ML-Service-Key`. |
| **Backend API** | Authenticate `X-ML-Service-Key`, validate that `cameraCode` is registered and active, resolve the camera's assigned `zoneId`, validate confidence ranges (`0.0..1.0`), store the record in `ppeDetections`, enforce the incident deduplication cooldown window, create/update an incident when `safetyStatus === "UNSAFE"`, and broadcast real-time WebSocket updates. |
| **Frontend Dashboards** | Display authorized camera statuses, live PPE violation alerts, violation snapshots, compliance analytics, and supervisor verification controls for the user's permitted workplace zones. |

---

## 3. Model Input, Detection Output & Class Labels

### 3.1 Model Input
- Live video stream (webcam, USB camera, RTSP IP camera, or recorded workplace test video feed) associated with a registered `cameraCode` (e.g., `"CAM_001"`).

### 3.2 Supported Class Labels & Performance (`TO BE CONFIRMED`)
- **Verification Rule:** Because the trained ML model weights and inference script are maintained by the ML team member and are not yet committed to this repository, **exact model class names and accuracy/mAP metrics are marked `TO BE CONFIRMED`** and must not be invented.
- **Proposed Canonical Normalization Mapping:** Regardless of raw model label casing (for example, whether a YOLO model outputs `"Hardhat"`, `"NO-Hardhat"`, `"Safety Vest"`, `"NO-Safety Vest"`, `"Person"`), the ML integration bridge should normalize labels into canonical lowercase identifiers before sending `POST /api/detections`:
  - `"person"` — Detected human worker in frame
  - `"helmet"` — Properly worn safety helmet detected
  - `"no_helmet"` — Missing safety helmet explicitly detected
  - `"safety_vest"` — Properly worn high-visibility safety vest detected
  - `"no_safety_vest"` — Missing safety vest explicitly detected
- **Bounding Box (`bbox`) Format:** `[xMin, yMin, xMax, yMax]` in pixel coordinates (or normalized `[0..1]` coordinates if documented consistently by the ML script).

---

## 4. Canonical Detection Payload (`POST /api/detections`)

### 4.1 Required Headers
```http
Content-Type: application/json
X-ML-Service-Key: <ML_SERVICE_API_KEY>
```

### 4.2 Request Body Example
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
  "evidenceUrl": "evidence/2026-11-25/cam001_1764066600000.jpg",
  "evidenceFileHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

### 4.3 Field Validation Rules
- `cameraCode` (**Required**, String): Must match a registered camera in `cameras`. The backend resolves `cameraId` and `zoneId` from the database record.
- `occurredAt` (**Required**, ISO 8601 UTC String): Frame capture timestamp.
- `modelVersion` (**Required**, String): Model version identifier for audit traceability.
- `idempotencyKey` (Optional, String): Unique event ID (`<cameraCode>-<epochMs>`) so network retries do not create duplicate detection rows.
- `workerId` (Optional, String or `null`): Defaults to `null` (see Section 5).
- `detections` (**Required**, Array): Each object must include `classLabel` (String), `confidence` (Number in `[0.0, 1.0]`), and optional `bbox` (`[xMin, yMin, xMax, yMax]`).
- `missingPPE` (**Required**, Array of Strings): Subset of `["helmet", "safety_vest"]` (or `[]` when compliant).
- `safetyStatus` (**Required**, Enum): `"SAFE"` | `"UNSAFE"` | `"REVIEW_REQUIRED"`.
- `overallConfidence` (**Required**, Number): Float in `[0.0, 1.0]`.
- `evidenceUrl` & `evidenceFileHash` (Optional, String or `null`): Storage reference and SHA-256 hex hash of the saved violation frame snapshot.

---

## 5. Strict Worker Identification Rule

**Camera-based PPE object detection identifies visible safety equipment and compliance conditions—it does NOT automatically identify a named individual worker.**

1. **Default Behavior (`workerId: null`):** The ML service must send `"workerId": null` unless an explicit, validated worker-identification mechanism is implemented and active.
2. **Backend Enforcement:** The backend must never allow the ML service to attach arbitrary or guessed `workerId` values.
3. **Zone Context for Supervisors:** When an `"UNSAFE"` camera detection creates an incident in a workplace zone (e.g., `zone_01`), the backend associates the incident with `cameraCode` and `zoneId`. In the Supervisor Incident Verification UI, the dashboard can display the list of workers currently checked into `zone_01` via RFID (`workers.lastSeenZoneId`) as contextual information so the supervisor can investigate and optionally confirm `workerId` during verification.

---

## 6. How PPE Violations Become Incidents (Cooldown & Deduplication Strategy)

A video camera runs at 15–30 frames per second. Without deduplication, a worker standing without a helmet for 10 seconds would generate 150–300 separate incidents. SmartPPE prevents frame-flooding using a **two-stage deduplication strategy**:

### Stage 1: ML Edge / Inference Persistence & Throttling (Proposed)
- **Minimum Confidence Threshold:** Ignore raw bounding boxes below a configurable confidence floor (e.g., `MIN_CONFIDENCE = 0.65`, or mark `0.50..0.65` as `"REVIEW_REQUIRED"`).
- **Multi-Frame Persistence:** Require a violation (e.g., `no_helmet` or `person` without `helmet`) to persist across $N$ consecutive analyzed frames (e.g., 3 frames over 1 second) before emitting an `"UNSAFE"` event.
- **Edge Emission Interval:** Once an `"UNSAFE"` event is sent for `cameraCode`, throttle identical violation POSTs from that camera for a local interval (e.g., 5–10 seconds).

### Stage 2: Backend Incident Cooldown Window (Proposed)
- When `POST /api/detections` receives an `"UNSAFE"` detection:
  1. The backend always stores the detection record in `ppeDetections` (unless `idempotencyKey` is a duplicate retry) and updates `cameras.lastHeartbeat`.
  2. The backend maps `missingPPE` to an `incidentType`:
     - Missing both helmet and vest -> `"MULTIPLE_PPE_VIOLATION"` (Severity: `"HIGH"`)
     - Missing `"helmet"` -> `"MISSING_HELMET"` (Severity: `"HIGH"`)
     - Missing `"safety_vest"` -> `"MISSING_SAFETY_VEST"` (Severity: `"MEDIUM"`)
  3. **Cooldown Lookup:** The backend queries `incidents` for an existing open/active incident (`status IN ["OPEN", "UNDER_REVIEW"]`) matching `(zoneId, deviceOrCameraCode: cameraCode, incidentType)` updated within the last `INCIDENT_COOLDOWN_SECONDS` (e.g., `60` seconds).
  4. **Merge vs. Create:**
     - If an active incident exists within the cooldown window, the backend increments `occurrenceCount = occurrenceCount + 1` and updates `updatedAt` on the existing incident (`incidentCreated: false, cooldownMerged: true`).
     - Otherwise, the backend creates a new `"OPEN"` incident (`occurrenceCount: 1`), attaches any `evidenceUrl` / `evidenceFileHash` to `incidentEvidence`, and broadcasts `incident:new` via WebSockets.

---

## 7. Evidence Storage & Integrity

- When an `"UNSAFE"` violation triggers, the ML service (or backend) saves an annotated frame snapshot to private storage (never a public unauthenticated directory).
- Compute the SHA-256 digest of the image bytes (`evidenceFileHash`) and store it in `incidentEvidence.fileHash`.
- When a supervisor later verifies the incident (`POST /api/supervisor/incidents/:id/verify`), `fileHash` is included in the incident's canonical SHA-256 `recordHash` calculation, ensuring both the incident metadata and the visual evidence are tamper-evident.

---

## 8. ML Integration Test Checklist

Execute the test cases in [`docs/TESTING.md`](TESTING.md):
- Valid `"SAFE"` detection (`missingPPE: []`) stored in `ppeDetections` without creating an incident.
- Valid `"UNSAFE"` detection (`missingPPE: ["helmet"]`) creates an `"OPEN"` `"MISSING_HELMET"` incident and broadcasts `ppe:detection` + `incident:new`.
- 10 rapid `"UNSAFE"` detections from `CAM_001` within 10 seconds result in only **1** open incident with `occurrenceCount: 10`.
- Payload with `overallConfidence: 1.4` or `-0.2` is rejected with `400 Bad Request`.
- Payload with unregistered `cameraCode` is rejected with `404 Not Found`.
- Payload without `X-ML-Service-Key` is rejected with `401 Unauthorized`.
- Confirm `workerId` remains `null` on camera-only detections.
