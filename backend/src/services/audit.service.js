const { AuditLog } = require('../models/AuditLog.model');

const SENSITIVE_KEYS = ['password', 'passwordHash', 'apiKey', 'apiKeyHash', 'deviceApiKey', 'token', 'secret'];

/**
 * Recursively sanitize an object so sensitive keys are never persisted into audit logs.
 */
const sanitizeDetails = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeDetails);
  }
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      clean[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !(value instanceof Date)) {
      clean[key] = sanitizeDetails(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
};

/**
 * Write an append-only audit log record.
 */
const recordAuditLog = async ({
  actorId = null,
  actorRole = 'SYSTEM',
  action,
  entityType,
  entityId,
  details = {},
  occurredAt = new Date(),
}) => {
  const safeDetails = sanitizeDetails(details);
  const logEntry = await AuditLog.create({
    actorId: actorId || null,
    actorRole,
    action: String(action).toUpperCase(),
    entityType: String(entityType).toUpperCase(),
    entityId: String(entityId),
    details: safeDetails,
    occurredAt,
  });
  return logEntry;
};

module.exports = {
  recordAuditLog,
  sanitizeDetails,
};
