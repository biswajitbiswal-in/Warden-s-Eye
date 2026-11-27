const { z } = require('zod');

const rfidScanSchema = z
  .object({
    deviceCode: z
      .string({ required_error: 'deviceCode is required' })
      .trim()
      .toUpperCase()
      .min(2, 'deviceCode must be at least 2 characters')
      .max(60, 'deviceCode cannot exceed 60 characters'),
    rfidUid: z
      .string({ required_error: 'rfidUid is required' })
      .trim()
      .toUpperCase()
      .regex(/^[0-9A-F]{8,20}$/, 'rfidUid must be an 8 to 20 character uppercase hexadecimal string'),
    occurredAt: z
      .string()
      .datetime({ message: 'occurredAt must be a valid ISO 8601 timestamp' })
      .optional(),
    firmwareVersion: z.string().trim().max(40).nullable().optional(),
  })
  .strict();

module.exports = {
  rfidScanSchema,
};
