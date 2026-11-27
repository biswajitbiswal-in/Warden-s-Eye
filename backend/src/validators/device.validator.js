const { z } = require('zod');
const { DEVICE_STATUSES } = require('../models/Device.model');

const registerDeviceSchema = z
  .object({
    deviceCode: z
      .string({ required_error: 'deviceCode is required' })
      .trim()
      .toUpperCase()
      .min(2, 'deviceCode must be at least 2 characters')
      .max(60, 'deviceCode cannot exceed 60 characters'),
    deviceName: z
      .string({ required_error: 'deviceName is required' })
      .trim()
      .min(2, 'deviceName must be at least 2 characters')
      .max(120, 'deviceName cannot exceed 120 characters'),
    deviceType: z.string().trim().toUpperCase().optional().default('ESP32'),
    zoneId: z.string({ required_error: 'Assigned workplace zoneId is required' }).trim().min(1),
    firmwareVersion: z.string().trim().max(40).nullable().optional().default(null),
  })
  .strict();

const updateDeviceSchema = z
  .object({
    deviceName: z.string().trim().min(2).max(120).optional(),
    zoneId: z.string().trim().min(1).optional(),
    status: z.enum(DEVICE_STATUSES).optional(),
    firmwareVersion: z.string().trim().max(40).nullable().optional(),
  })
  .strict();

const deviceHeartbeatSchema = z
  .object({
    deviceCode: z
      .string({ required_error: 'deviceCode is required' })
      .trim()
      .toUpperCase()
      .min(2)
      .max(60),
    status: z.enum(['ONLINE', 'MAINTENANCE']).optional().default('ONLINE'),
    firmwareVersion: z.string().trim().max(40).nullable().optional(),
    uptimeSeconds: z.number().int().nonnegative().optional(),
  })
  .strict();

module.exports = {
  registerDeviceSchema,
  updateDeviceSchema,
  deviceHeartbeatSchema,
};
