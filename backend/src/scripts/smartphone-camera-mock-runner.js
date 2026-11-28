/**
 * SmartPPE — Warden's Eye
 * Phase 4 CLI Runner: Smartphone Wi-Fi Camera Stream Monitor & Temporary MOCK ML Detection Service
 *
 * USAGE EXAMPLES:
 * 1. Probe a smartphone Wi-Fi camera stream (e.g., IP Webcam app on phone over local Wi-Fi)
 *    and send camera heartbeats + clearly labelled mock detections to the local backend:
 *    node src/scripts/smartphone-camera-mock-runner.js --camera=CAM_001 --stream=http://192.168.1.50:8080/shot.jpg
 *
 * 2. Run a single mock detection cycle (SAFE, UNCERTAIN, VIOLATION) without a phone stream:
 *    node src/scripts/smartphone-camera-mock-runner.js --camera=CAM_001 --once
 */

const http = require('http');
const { URL } = require('url');
const { getEnv } = require('../config/env');
const {
  buildMockDetectionPayload,
  probeSmartphoneWifiStream,
} = require('../services/mockMl.service');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const config = {
    cameraCode: process.env.CAMERA_CODE || 'CAM_001',
    streamUrl: process.env.SMARTPHONE_STREAM_URL || null,
    apiBaseUrl: process.env.API_BASE_URL || `http://127.0.0.1:${getEnv().port}/api`,
    once: false,
    intervalMs: 6000,
  };

  for (const arg of args) {
    if (arg.startsWith('--camera=')) config.cameraCode = arg.split('=')[1].toUpperCase();
    else if (arg.startsWith('--stream=')) config.streamUrl = arg.split('=')[1];
    else if (arg.startsWith('--api=')) config.apiBaseUrl = arg.split('=')[1];
    else if (arg.startsWith('--interval=')) config.intervalMs = parseInt(arg.split('=')[1], 10);
    else if (arg === '--once') config.once = true;
  }
  return config;
};

const postJson = (urlStr, headers, bodyObj) =>
  new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const payload = JSON.stringify(bodyObj);

    const req = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
          } catch (_e) {
            resolve({ statusCode: res.statusCode, body: data });
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });

const runCycle = async () => {
  const config = parseArgs();
  const { mlServiceApiKey } = getEnv();

  if (!mlServiceApiKey || mlServiceApiKey === 'REPLACE_WITH_LOCAL_ML_SERVICE_API_KEY_PLACEHOLDER') {
    console.error('[MockML] ERROR: ML_SERVICE_API_KEY is not configured in backend/.env');
    process.exit(1);
  }

  const headers = { 'X-ML-Service-Key': mlServiceApiKey };
  let reconnectAttempts = 0;
  const scenarios = ['SAFE', 'UNCERTAIN', 'VIOLATION'];
  let stepIndex = 0;

  console.log('======================================================================');
  console.log(' SmartPPE — Warden\'s Eye: Smartphone Wi-Fi Bridge & MOCK ML Service');
  console.log(' NOTE: This is a TEMPORARY MOCK SERVICE. Real ML model is pending.');
  console.log(` Camera Code : ${config.cameraCode}`);
  console.log(` Stream URL  : ${config.streamUrl || '(No smartphone URL specified - Mock Only)'}`);
  console.log(` Backend API : ${config.apiBaseUrl}`);
  console.log('======================================================================');

  const executeTick = async () => {
    // 1. If a smartphone Wi-Fi streamUrl is provided, probe connectivity & report heartbeat
    if (config.streamUrl) {
      const probe = await probeSmartphoneWifiStream(config.streamUrl, 2500);
      if (probe.reachable) {
        if (reconnectAttempts > 0) {
          console.log(`[SmartphoneStream] Reconnected to ${config.streamUrl} after ${reconnectAttempts} attempt(s)!`);
        }
        reconnectAttempts = 0;
        await postJson(`${config.apiBaseUrl}/cameras/heartbeat`, headers, {
          cameraCode: config.cameraCode,
          status: 'ONLINE',
          streamUrl: config.streamUrl,
          reconnectAttempts: 0,
          lastStreamError: null,
        });
        console.log(`[SmartphoneStream] ONLINE (${probe.latencyMs}ms, ${probe.contentType || 'stream'})`);
      } else {
        reconnectAttempts += 1;
        await postJson(`${config.apiBaseUrl}/cameras/heartbeat`, headers, {
          cameraCode: config.cameraCode,
          status: 'STREAM_ERROR',
          streamUrl: config.streamUrl,
          reconnectAttempts,
          lastStreamError: probe.error,
        });
        console.warn(
          `[SmartphoneStream] STREAM_ERROR (attempt #${reconnectAttempts}): ${probe.error}. Skipping frame inference until stream reconnects.`
        );
        return;
      }
    }

    // 2. Generate clearly labelled MOCK detection payload
    const scenario = scenarios[stepIndex % scenarios.length];
    stepIndex += 1;

    const mockPayload = buildMockDetectionPayload({
      cameraCode: config.cameraCode,
      scenario,
      missingPPE: ['helmet'],
      headRegionVisible: scenario !== 'UNCERTAIN',
    });

    const res = await postJson(`${config.apiBaseUrl}/detections`, headers, mockPayload);
    console.log(
      `[MockML -> POST /api/detections] Scenario=${scenario} | HTTP ${res.statusCode} | Result:`,
      JSON.stringify(res.body.data || res.body)
    );
  };

  if (config.once) {
    for (let i = 0; i < scenarios.length; i += 1) {
      await executeTick();
    }
    process.exit(0);
  } else {
    await executeTick();
    setInterval(executeTick, config.intervalMs);
  }
};

if (require.main === module) {
  runCycle().catch((err) => {
    console.error('[MockML] Fatal error:', err.message);
    process.exit(1);
  });
}

module.exports = { parseArgs };
