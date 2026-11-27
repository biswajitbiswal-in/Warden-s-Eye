const { z } = require('zod');
const { SENSOR_TYPES, SENSOR_ALERT_STATUSES } = require('../models/SensorEvent.model');

const submitSensorEventSchema = z
  .object({
    deviceCode: z
      .string({ required_error: 'deviceCode is required' })
      .trim()
      .toUpperCase()
      .min(2, 'deviceCode must be at least 2 characters')
      .max(60, 'deviceCode cannot exceed 60 characters'),
    sensorType: z.enum(SENSOR_TYPES, {
      required_error: 'sensorType is required (SMOKE or FLAME)',
      invalid_type_error: 'sensorType must be SMOKE or FLAME',
    }),
    sensorValue: z.number({
      required_error: 'sensorValue is required',
      invalid_type_error: 'sensorValue must be a number',
    }),
    threshold: z.number({
      required_error: 'threshold is required',
      invalid_type_error: 'threshold must be a number',
    }),
    alertStatus: z.enum(SENSOR_ALERT_STATUSES, {
      required_error: 'alertStatus is required (NORMAL, WARNING, or CRITICAL)',
      invalid_type_error: 'alertStatus must be NORMAL, WARNING, or CRITICAL',
    }),
    occurredAt: z
      .string()
      .datetime({ message: 'occurredAt must be a valid ISO 8601 timestamp' })
      .optional(),
    firmwareVersion: z.string().trim().max(40).nullable().optional(),
  })
  .strict();

module.exports = {
  submitSensorEventSchema,
};
