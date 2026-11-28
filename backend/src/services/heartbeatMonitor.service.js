const { getEnv } = require('../config/env');
const { Device } = require('../models/Device.model');
const { Camera } = require('../models/Camera.model');

/**
 * Evaluates whether an ONLINE device has exceeded the configured heartbeat timeout
 * (`DEVICE_HEARTBEAT_TIMEOUT_SECONDS`, default 90s) and transitions stale devices to OFFLINE.
 */
const sweepStaleDevices = async () => {
  const { deviceHeartbeatTimeoutSeconds } = getEnv();
  const cutoffDate = new Date(Date.now() - deviceHeartbeatTimeoutSeconds * 1000);

  const result = await Device.updateMany(
    {
      status: 'ONLINE',
      $or: [{ lastHeartbeat: { $lt: cutoffDate } }, { lastHeartbeat: null }],
    },
    {
      $set: { status: 'OFFLINE' },
    }
  );

  return result.modifiedCount || 0;
};

/**
 * Evaluates a single device document against the heartbeat timeout threshold.
 */
const reconcileDeviceStatus = async (deviceDoc) => {
  if (!deviceDoc) return null;
  const { deviceHeartbeatTimeoutSeconds } = getEnv();
  const cutoffMs = Date.now() - deviceHeartbeatTimeoutSeconds * 1000;

  if (
    deviceDoc.status === 'ONLINE' &&
    (!deviceDoc.lastHeartbeat || new Date(deviceDoc.lastHeartbeat).getTime() < cutoffMs)
  ) {
    deviceDoc.status = 'OFFLINE';
    await Device.updateOne({ _id: deviceDoc._id }, { $set: { status: 'OFFLINE' } });
  }
  return deviceDoc;
};

/**
 * Evaluates whether an ONLINE camera has exceeded the configured heartbeat timeout
 * (`DEVICE_HEARTBEAT_TIMEOUT_SECONDS`, default 90s) and transitions stale cameras to OFFLINE.
 */
const sweepStaleCameras = async () => {
  const { deviceHeartbeatTimeoutSeconds } = getEnv();
  const cutoffDate = new Date(Date.now() - deviceHeartbeatTimeoutSeconds * 1000);

  const result = await Camera.updateMany(
    {
      status: 'ONLINE',
      $or: [{ lastHeartbeat: { $lt: cutoffDate } }, { lastHeartbeat: null }],
    },
    {
      $set: { status: 'OFFLINE' },
    }
  );

  return result.modifiedCount || 0;
};

/**
 * Evaluates a single camera document against the heartbeat timeout threshold.
 */
const reconcileCameraStatus = async (cameraDoc) => {
  if (!cameraDoc) return null;
  const { deviceHeartbeatTimeoutSeconds } = getEnv();
  const cutoffMs = Date.now() - deviceHeartbeatTimeoutSeconds * 1000;

  if (
    cameraDoc.status === 'ONLINE' &&
    (!cameraDoc.lastHeartbeat || new Date(cameraDoc.lastHeartbeat).getTime() < cutoffMs)
  ) {
    cameraDoc.status = 'OFFLINE';
    await Camera.updateOne({ _id: cameraDoc._id }, { $set: { status: 'OFFLINE' } });
  }
  return cameraDoc;
};

module.exports = {
  sweepStaleDevices,
  reconcileDeviceStatus,
  sweepStaleCameras,
  reconcileCameraStatus,
};
