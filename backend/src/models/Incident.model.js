const mongoose = require('mongoose');

const INCIDENT_TYPES = [
  'MISSING_HELMET',
  'MISSING_SAFETY_VEST',
  'MULTIPLE_PPE_VIOLATION',
  'SMOKE_DETECTED',
  'FLAME_DETECTED',
  'PERSON_FALL_DETECTED',
  'UNKNOWN_RFID',
];

const INCIDENT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const INCIDENT_STATUSES = [
  'WARNING_GRACE_PERIOD',
  'SELF_RESOLVED_IN_GRACE',
  'OPEN',
  'UNDER_REVIEW',
  'VERIFIED',
  'RESOLVED',
  'REJECTED',
];

const INCIDENT_SOURCE_TYPES = ['CAMERA_DETECTION', 'SENSOR_EVENT', 'RFID_SCAN', 'MANUAL'];

const incidentSchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      default: null,
      trim: true,
    },
    incidentType: {
      type: String,
      enum: {
        values: INCIDENT_TYPES,
        message: 'Invalid incidentType',
      },
      required: [true, 'incidentType is required'],
    },
    isEmergency: {
      type: Boolean,
      default: false,
      index: true,
    },
    severity: {
      type: String,
      enum: {
        values: INCIDENT_SEVERITIES,
        message: 'severity must be LOW, MEDIUM, HIGH, or CRITICAL',
      },
      required: [true, 'severity is required'],
    },
    status: {
      type: String,
      enum: {
        values: INCIDENT_STATUSES,
        message: 'Invalid incident status',
      },
      default: 'OPEN',
      required: true,
      index: true,
    },
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      required: [true, 'Incident zoneId is required'],
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      default: null,
      index: true,
    },
    trackId: {
      type: String,
      default: null,
      trim: true,
    },
    sourceType: {
      type: String,
      enum: {
        values: INCIDENT_SOURCE_TYPES,
        message: 'sourceType must be CAMERA_DETECTION, SENSOR_EVENT, RFID_SCAN, or MANUAL',
      },
      required: [true, 'sourceType is required'],
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    deviceOrCameraCode: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Incident description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    occurrenceCount: {
      type: Number,
      default: 1,
      min: [1, 'occurrenceCount must be at least 1'],
    },
    // 120-Second Grace Period & Speaker Warning Fields
    speakerWarningPlayedAt: {
      type: Date,
      default: null,
    },
    graceStartedAt: {
      type: Date,
      default: null,
    },
    graceExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    selfResolvedAt: {
      type: Date,
      default: null,
    },
    escalatedToSupervisorAt: {
      type: Date,
      default: null,
    },
    // Critical Emergency Manual SOS Summary Field
    manualSosSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    // Supervisor Assignment, Verification & Resolution Fields
    assignedSupervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verificationNotes: {
      type: String,
      default: null,
      trim: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: null,
      trim: true,
    },
    // Tamper-Evident SHA-256 Hash Chain Fields
    recordHash: {
      type: String,
      default: null,
      trim: true,
    },
    previousHash: {
      type: String,
      default: null,
      trim: true,
    },
    blockchainTxHash: {
      type: String,
      default: null,
      trim: true,
    },
    lastPushSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.incidentId = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

incidentSchema.virtual('incidentId').get(function getIncidentId() {
  return this._id ? this._id.toString() : undefined;
});

incidentSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  }
);

incidentSchema.index({ zoneId: 1, status: 1, createdAt: -1 });
incidentSchema.index({ zoneId: 1, deviceOrCameraCode: 1, incidentType: 1, status: 1 });
incidentSchema.index({ status: 1, graceExpiresAt: 1 });

const Incident = mongoose.model('Incident', incidentSchema);

module.exports = {
  Incident,
  INCIDENT_TYPES,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  INCIDENT_SOURCE_TYPES,
};
