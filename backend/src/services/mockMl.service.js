const http = require('http');
const https = require('https');
const { URL } = require('url');
const crypto = require('crypto');

/**
 * Temporary MOCK ML Detection Generator & Smartphone Wi-Fi Camera Stream Bridge.
 *
 * IMPORTANT ARCHITECTURAL BOUNDARY:
 * - This module is a TEMPORARY MOCK SERVICE for testing and demonstrating the Phase 4
 *   camera-to-backend pipeline while the ML teammate's actual trained PPE model is pending.
 * - Every payload produced by this service sets `isMockDetection: true` and
 *   `modelVersion: "mock-ppe-simulator-v1"` so mock records can never be confused with
 *   real computer-vision inference results.
 */

const MOCK_MODEL_VERSION = 'mock-ppe-simulator-v1';

/**
 * Build a clearly labelled MOCK PPE detection payload conforming 100% to
 * Canonical Contract #2 (`POST /api/detections`).
 *
 * @param {Object} options
 * @param {string} options.cameraCode - Registered camera code (e.g. "CAM_001")
 * @param {'SAFE'|'VIOLATION'|'UNCERTAIN'} [options.scenario='SAFE'] - Detection state scenario
 * @param {string[]} [options.missingPPE=[]] - Missing PPE items when scenario === 'VIOLATION'
 * @param {string|null} [options.trackId='mock-track-1'] - Simulated ByteTrack person trackId
 * @param {boolean} [options.verifyWorkerByRfid=true] - Whether backend should check RFID zone presence
 * @param {boolean} [options.headRegionVisible=true] - Simulated head visibility gate
 */
const buildMockDetectionPayload = ({
  cameraCode = 'CAM_001',
  scenario = 'SAFE',
  missingPPE = ['helmet'],
  trackId = 'mock-track-1',
  verifyWorkerByRfid = true,
  headRegionVisible = true,
} = {}) => {
  const nowIso = new Date().toISOString();
  const idempotencyKey = `MOCK-${cameraCode}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  if (scenario === 'SAFE') {
    return {
      cameraCode,
      occurredAt: nowIso,
      modelVersion: MOCK_MODEL_VERSION,
      idempotencyKey,
      isMockDetection: true,
      verifyWorkerByRfid,
      trackId,
      detections: [
        { classLabel: 'person', confidence: 0.96, bbox: [120, 80, 340, 520] },
        { classLabel: 'helmet', confidence: 0.94, bbox: [180, 80, 260, 150] },
        { classLabel: 'safety_vest', confidence: 0.92, bbox: [150, 160, 310, 380] },
      ],
      missingPPE: [],
      detectionState: 'SAFE',
      safetyStatus: 'SAFE',
      overallConfidence: 0.92,
      headRegionVisible: true,
      evidenceUrl: null,
      evidenceFileHash: null,
    };
  }

  if (scenario === 'UNCERTAIN') {
    return {
      cameraCode,
      occurredAt: nowIso,
      modelVersion: MOCK_MODEL_VERSION,
      idempotencyKey,
      isMockDetection: true,
      verifyWorkerByRfid: false,
      trackId,
      detections: [
        { classLabel: 'person', confidence: 0.81, bbox: [10, 2, 180, 410] },
        { classLabel: 'no_helmet', confidence: 0.54, bbox: [40, 2, 110, 45] },
      ],
      missingPPE: [],
      detectionState: 'UNCERTAIN',
      safetyStatus: 'REVIEW_REQUIRED',
      overallConfidence: 0.54,
      headRegionVisible,
      evidenceUrl: null,
      evidenceFileHash: null,
    };
  }

  // Default: VIOLATION scenario
  const effectiveMissing =
    Array.isArray(missingPPE) && missingPPE.length > 0 ? missingPPE : ['helmet'];
  const detections = [{ classLabel: 'person', confidence: 0.95, bbox: [140, 90, 360, 540] }];

  if (effectiveMissing.includes('helmet')) {
    detections.push({ classLabel: 'no_helmet', confidence: 0.91, bbox: [190, 90, 270, 160] });
  } else {
    detections.push({ classLabel: 'helmet', confidence: 0.93, bbox: [190, 90, 270, 160] });
  }

  if (effectiveMissing.includes('safety_vest')) {
    detections.push({ classLabel: 'no_safety_vest', confidence: 0.89, bbox: [160, 175, 320, 390] });
  } else {
    detections.push({ classLabel: 'safety_vest', confidence: 0.94, bbox: [160, 175, 320, 390] });
  }

  const mockEvidenceContent = `mock-evidence:${cameraCode}:${nowIso}:${effectiveMissing.join(',')}`;
  const mockEvidenceHash = crypto.createHash('sha256').update(mockEvidenceContent).digest('hex');

  return {
    cameraCode,
    occurredAt: nowIso,
    modelVersion: MOCK_MODEL_VERSION,
    idempotencyKey,
    isMockDetection: true,
    verifyWorkerByRfid,
    trackId,
    detections,
    missingPPE: effectiveMissing,
    detectionState: 'VIOLATION',
    safetyStatus: 'UNSAFE',
    overallConfidence: 0.89,
    headRegionVisible,
    evidenceUrl: `evidence/mock/${cameraCode.toLowerCase()}_${Date.now()}.jpg`,
    evidenceFileHash: mockEvidenceHash,
  };
};

/**
 * Probe a Smartphone Wi-Fi Camera HTTP/MJPEG/Snapshot stream over local Wi-Fi
 * (such as IP Webcam on Android `http://<PHONE_IP>:8080/shot.jpg` or `/video`,
 * or DroidCam `http://<PHONE_IP>:4747/video`).
 *
 * Returns `{ reachable: boolean, statusCode: number|null, contentType: string|null, latencyMs: number, error: string|null }`.
 */
const probeSmartphoneWifiStream = (streamUrl, timeoutMs = 3000) =>
  new Promise((resolve) => {
    const startMs = Date.now();
    let parsedUrl;
    try {
      parsedUrl = new URL(streamUrl);
    } catch (_err) {
      return resolve({
        reachable: false,
        statusCode: null,
        contentType: null,
        latencyMs: 0,
        error: `Invalid streamUrl format: ${streamUrl}`,
      });
    }

    const client = parsedUrl.protocol === 'https:' ? https : http;
    const req = client.get(
      parsedUrl,
      { timeout: timeoutMs },
      (res) => {
        const latencyMs = Date.now() - startMs;
        const statusCode = res.statusCode || null;
        const contentType = res.headers['content-type'] || null;
        // Destroy stream immediately after receiving response headers so MJPEG streams don't hang
        res.destroy();

        if (statusCode && statusCode >= 200 && statusCode < 400) {
          return resolve({
            reachable: true,
            statusCode,
            contentType,
            latencyMs,
            error: null,
          });
        }
        return resolve({
          reachable: false,
          statusCode,
          contentType,
          latencyMs,
          error: `Unexpected HTTP status ${statusCode} from smartphone camera stream`,
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({
        reachable: false,
        statusCode: null,
        contentType: null,
        latencyMs: Date.now() - startMs,
        error: `Connection timed out after ${timeoutMs}ms`,
      });
    });

    req.on('error', (err) => {
      resolve({
        reachable: false,
        statusCode: null,
        contentType: null,
        latencyMs: Date.now() - startMs,
        error: err.message,
      });
    });
  });

module.exports = {
  MOCK_MODEL_VERSION,
  buildMockDetectionPayload,
  probeSmartphoneWifiStream,
};
