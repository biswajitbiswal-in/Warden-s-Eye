const { getEnv } = require('../config/env');
const { Device } = require('../models/Device.model');

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

module.exports = {
  sweepStaleDevices,
  reconcileDeviceStatus,
};
