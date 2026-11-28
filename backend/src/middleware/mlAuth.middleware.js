const crypto = require('crypto');
const { getEnv } = require('../config/env');
const { AppError } = require('../utils/AppError');

/**
 * Constant-time SHA-256 comparison between two strings.
 */
const safeCompareKeys = (providedKey, configuredKey) => {
  if (!providedKey || !configuredKey) {
    return false;
  }
  const hashA = crypto.createHash('sha256').update(String(providedKey)).digest();
  const hashB = crypto.createHash('sha256').update(String(configuredKey)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
};

/**
 * Middleware authenticating ML inference service requests via the `X-ML-Service-Key` header.
 */
const requireMlAuth = (req, _res, next) => {
  try {
    const providedKey = req.headers['x-ml-service-key'];
    if (!providedKey || typeof providedKey !== 'string' || !providedKey.trim()) {
      return next(
        new AppError(
          'ML service authentication required. Missing X-ML-Service-Key header.',
          401,
          'ML_AUTH_REQUIRED'
        )
      );
    }

    const { mlServiceApiKey } = getEnv();
    if (!mlServiceApiKey || mlServiceApiKey === 'REPLACE_WITH_LOCAL_ML_SERVICE_API_KEY_PLACEHOLDER') {
      return next(
        new AppError(
          'Server ML_SERVICE_API_KEY is not configured.',
          500,
          'SERVER_CONFIG_ERROR'
        )
      );
    }

    if (!safeCompareKeys(providedKey.trim(), mlServiceApiKey.trim())) {
      return next(
        new AppError('Invalid X-ML-Service-Key credential.', 401, 'INVALID_ML_SERVICE_KEY')
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  requireMlAuth,
  safeCompareKeys,
};
