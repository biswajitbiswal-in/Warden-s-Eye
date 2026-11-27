const crypto = require('crypto');
const { Device } = require('../models/Device.model');
const { AppError } = require('../utils/AppError');

/**
 * Generate a cryptographically strong one-time raw device API key.
 */
const generateDeviceApiKey = () => `esp32_live_${crypto.randomBytes(24).toString('hex')}`;

/**
 * Compute the deterministic SHA-256 hex digest of a raw device API key.
 */
const hashDeviceApiKey = (rawKey) =>
  crypto.createHash('sha256').update(String(rawKey)).digest('hex');

/**
 * Constant-time comparison between a provided raw key and stored SHA-256 hex digest.
 */
const verifyDeviceApiKey = (rawKey, storedHashHex) => {
  if (!rawKey || !storedHashHex) {
    return false;
  }
  const computedHex = hashDeviceApiKey(rawKey);
  const bufA = Buffer.from(computedHex, 'utf8');
  const bufB = Buffer.from(String(storedHashHex), 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Middleware authenticating ESP32 IoT requests via `X-Device-Code` and `X-Device-Key` headers.
 * Verifies the hashed key in constant time, confirms the device is not in MAINTENANCE mode,
 * and attaches the trusted `req.device` record (including its assigned `zoneId`).
 */
const requireDeviceAuth = async (req, _res, next) => {
  try {
    const headerDeviceCode = req.headers['x-device-code'];
    const bodyDeviceCode = req.body && typeof req.body.deviceCode === 'string' ? req.body.deviceCode : null;
    const rawApiKey = req.headers['x-device-key'];

    if (!rawApiKey || typeof rawApiKey !== 'string' || !rawApiKey.trim()) {
      return next(
        new AppError(
          'Device authentication required. Missing X-Device-Key header.',
          401,
          'DEVICE_AUTH_REQUIRED'
        )
      );
    }

    const effectiveDeviceCode = (headerDeviceCode || bodyDeviceCode || '').trim().toUpperCase();
    if (!effectiveDeviceCode) {
      return next(
        new AppError(
          'Device authentication required. Missing X-Device-Code header or deviceCode field.',
          401,
          'DEVICE_CODE_REQUIRED'
        )
      );
    }

    if (
      headerDeviceCode &&
      bodyDeviceCode &&
      headerDeviceCode.trim().toUpperCase() !== bodyDeviceCode.trim().toUpperCase()
    ) {
      return next(
        new AppError(
          'Device identity mismatch: X-Device-Code header does not match body deviceCode.',
          401,
          'DEVICE_CODE_MISMATCH'
        )
      );
    }

    const deviceDoc = await Device.findOne({ deviceCode: effectiveDeviceCode }).select('+apiKeyHash');
    if (!deviceDoc) {
      return next(
        new AppError('Invalid device credentials or unregistered deviceCode.', 401, 'INVALID_DEVICE_CREDENTIALS')
      );
    }

    const isKeyValid = verifyDeviceApiKey(rawApiKey.trim(), deviceDoc.apiKeyHash);
    if (!isKeyValid) {
      return next(
        new AppError('Invalid device credentials or unregistered deviceCode.', 401, 'INVALID_DEVICE_CREDENTIALS')
      );
    }

    if (deviceDoc.status === 'MAINTENANCE') {
      return next(
        new AppError(
          `Device '${deviceDoc.deviceCode}' is currently in MAINTENANCE mode and cannot submit events.`,
          403,
          'DEVICE_IN_MAINTENANCE'
        )
      );
    }

    req.device = deviceDoc;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  generateDeviceApiKey,
  hashDeviceApiKey,
  verifyDeviceApiKey,
  requireDeviceAuth,
};
