const { z } = require('zod');
const { DETECTION_STATES, PPE_SAFETY_STATUSES } = require('../models/PpeDetection.model');

const detectedObjectSchema = z
  .object({
    classLabel: z
      .string({ required_error: 'Detected object classLabel is required' })
      .trim()
      .min(1, 'classLabel cannot be empty')
      .max(60),
    confidence: z
      .number({
        required_error: 'Detected object confidence is required',
        invalid_type_error: 'confidence must be a number between 0.0 and 1.0',
      })
      .min(0, 'confidence must be between 0.0 and 1.0')
      .max(1, 'confidence must be between 0.0 and 1.0'),
    bbox: z
      .array(z.number())
      .length(4, 'bbox must be an array of 4 numbers [xMin, yMin, xMax, yMax]')
      .optional(),
  })
  .strict();

const submitDetectionSchema = z
  .object({
    cameraCode: z
      .string({ required_error: 'cameraCode is required' })
      .trim()
      .toUpperCase()
      .min(2, 'cameraCode must be at least 2 characters')
      .max(60, 'cameraCode cannot exceed 60 characters'),
    occurredAt: z
      .string({ required_error: 'occurredAt ISO 8601 timestamp is required' })
      .datetime({ message: 'occurredAt must be a valid ISO 8601 UTC timestamp' }),
    modelVersion: z
      .string({ required_error: 'modelVersion is required' })
      .trim()
      .min(1, 'modelVersion cannot be empty')
      .max(80),
    idempotencyKey: z.string().trim().min(2).max(160).nullable().optional().default(null),
    workerId: z.string().trim().nullable().optional().default(null),
    verifyWorkerByRfid: z.boolean().optional().default(false),
    isMockDetection: z.boolean().optional().default(false),
    trackId: z.string().trim().max(80).nullable().optional().default(null),
    detections: z
      .array(detectedObjectSchema, {
        required_error: 'detections array is required',
      })
      .default([]),
    missingPPE: z
      .array(z.string().trim().toLowerCase().min(1))
      .default([]),
    detectionState: z.enum(DETECTION_STATES).optional(),
    safetyStatus: z.enum(PPE_SAFETY_STATUSES).optional(),
    overallConfidence: z
      .number({
        required_error: 'overallConfidence is required',
        invalid_type_error: 'overallConfidence must be a number between 0.0 and 1.0',
      })
      .min(0, 'overallConfidence must be between 0.0 and 1.0')
      .max(1, 'overallConfidence must be between 0.0 and 1.0'),
    headRegionVisible: z.boolean().optional().default(true),
    evidenceUrl: z.string().trim().max(500).nullable().optional().default(null),
    evidenceFileHash: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[0-9a-f]{64}$/, 'evidenceFileHash must be a valid 64-character SHA-256 hex digest')
      .nullable()
      .optional()
      .default(null),
  })
  .strict()
  .refine((data) => Boolean(data.detectionState || data.safetyStatus), {
    message: 'Either detectionState (SAFE, VIOLATION, UNCERTAIN) or safetyStatus (SAFE, UNSAFE, REVIEW_REQUIRED) is required',
    path: ['detectionState'],
  });

module.exports = {
  submitDetectionSchema,
  detectedObjectSchema,
};
