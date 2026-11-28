const { z } = require('zod');
const { CAMERA_STATUSES, STREAM_TYPES } = require('../models/Camera.model');

const registerCameraSchema = z
  .object({
    cameraCode: z
      .string({ required_error: 'cameraCode is required' })
      .trim()
      .toUpperCase()
      .min(2, 'cameraCode must be at least 2 characters')
      .max(60, 'cameraCode cannot exceed 60 characters'),
    cameraName: z
      .string({ required_error: 'cameraName is required' })
      .trim()
      .min(2, 'cameraName must be at least 2 characters')
      .max(120, 'cameraName cannot exceed 120 characters'),
    zoneId: z.string({ required_error: 'Assigned workplace zoneId is required' }).trim().min(1),
    locationDescription: z.string().trim().max(500).nullable().optional().default(null),
    streamType: z.enum(STREAM_TYPES).optional().default('SMARTPHONE_WIFI'),
    streamUrl: z.string().trim().max(500).nullable().optional().default(null),
  })
  .strict();

const updateCameraSchema = z
  .object({
    cameraName: z.string().trim().min(2).max(120).optional(),
    zoneId: z.string().trim().min(1).optional(),
    locationDescription: z.string().trim().max(500).nullable().optional(),
    streamType: z.enum(STREAM_TYPES).optional(),
    streamUrl: z.string().trim().max(500).nullable().optional(),
    status: z.enum(CAMERA_STATUSES).optional(),
  })
  .strict();

const updateCameraStatusSchema = z
  .object({
    status: z.enum(CAMERA_STATUSES, {
      required_error: 'Camera status is required (ONLINE, OFFLINE, STREAM_ERROR, or MAINTENANCE)',
    }),
    reconnectAttempts: z.number().int().nonnegative().optional(),
    lastStreamError: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

const cameraHeartbeatSchema = z
  .object({
    cameraCode: z
      .string({ required_error: 'cameraCode is required' })
      .trim()
      .toUpperCase()
      .min(2)
      .max(60),
    status: z.enum(['ONLINE', 'OFFLINE', 'STREAM_ERROR']).optional().default('ONLINE'),
    streamUrl: z.string().trim().max(500).nullable().optional(),
    reconnectAttempts: z.number().int().nonnegative().optional(),
    lastStreamError: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

module.exports = {
  registerCameraSchema,
  updateCameraSchema,
  updateCameraStatusSchema,
  cameraHeartbeatSchema,
};
