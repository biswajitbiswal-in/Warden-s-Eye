const { z } = require('zod');
const { WORKER_STATUSES } = require('../models/Worker.model');

const rfidUidSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-9A-F]{8,20}$/, 'RFID UID must be an 8 to 20 character uppercase hexadecimal string');

const createWorkerSchema = z
  .object({
    employeeCode: z
      .string({ required_error: 'Employee code is required' })
      .trim()
      .toUpperCase()
      .min(2, 'Employee code must be at least 2 characters')
      .max(40, 'Employee code cannot exceed 40 characters'),
    name: z
      .string({ required_error: 'Worker name is required' })
      .trim()
      .min(2, 'Worker name must be at least 2 characters')
      .max(120, 'Worker name cannot exceed 120 characters'),
    department: z
      .string({ required_error: 'Department is required' })
      .trim()
      .min(2, 'Department must be at least 2 characters')
      .max(100, 'Department cannot exceed 100 characters'),
    designation: z.string().trim().max(100).nullable().optional().default(null),
    zoneId: z.string({ required_error: 'Assigned workplace zoneId is required' }).trim().min(1),
    rfidUid: rfidUidSchema.nullable().optional().default(null),
    userId: z.string().trim().nullable().optional().default(null),
    status: z.enum(WORKER_STATUSES).optional().default('ACTIVE'),
  })
  .strict();

const updateWorkerSchema = z
  .object({
    employeeCode: z.string().trim().toUpperCase().min(2).max(40).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    department: z.string().trim().min(2).max(100).optional(),
    designation: z.string().trim().max(100).nullable().optional(),
    zoneId: z.string().trim().min(1).optional(),
    rfidUid: rfidUidSchema.nullable().optional(),
    userId: z.string().trim().nullable().optional(),
    status: z.enum(WORKER_STATUSES).optional(),
  })
  .strict();

module.exports = {
  createWorkerSchema,
  updateWorkerSchema,
};
