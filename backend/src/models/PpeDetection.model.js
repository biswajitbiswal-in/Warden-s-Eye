const mongoose = require('mongoose');

const DETECTION_STATES = ['SAFE', 'VIOLATION', 'UNCERTAIN'];
const PPE_SAFETY_STATUSES = ['SAFE', 'UNSAFE', 'REVIEW_REQUIRED'];
const WORKER_IDENTIFICATION_SOURCES = ['NONE', 'RFID_CHECKPOINT_VERIFIED'];

const detectedObjectSubSchema = new mongoose.Schema(
  {
    classLabel: {
      type: String,
      required: [true, 'Detected object classLabel is required'],
      trim: true,
    },
    confidence: {
      type: Number,
      required: [true, 'Detected object confidence is required'],
      min: [0, 'Confidence cannot be less than 0.0'],
      max: [1, 'Confidence cannot exceed 1.0'],
    },
    bbox: {
      type: [Number],
      default: undefined,
    },
  },
  { _id: false }
);

const ppeDetectionSchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      default: null,
      trim: true,
    },
    cameraId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Camera',
      required: [true, 'Source cameraId is required'],
      index: true,
    },
    cameraCode: {
      type: String,
      required: [true, 'Source cameraCode is required'],
      uppercase: true,
      trim: true,
    },
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      required: [true, 'Workplace zoneId is required'],
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      default: null,
    },
    workerIdentificationSource: {
      type: String,
      enum: {
        values: WORKER_IDENTIFICATION_SOURCES,
        message: 'workerIdentificationSource must be NONE or RFID_CHECKPOINT_VERIFIED',
      },
      default: 'NONE',
      required: true,
    },
    isMockDetection: {
      type: Boolean,
      default: false,
      required: true,
      index: true,
    },
    trackId: {
      type: String,
      default: null,
      trim: true,
    },
    modelVersion: {
      type: String,
      required: [true, 'ML modelVersion is required'],
      trim: true,
    },
    detections: {
      type: [detectedObjectSubSchema],
      default: [],
      required: true,
    },
    missingPPE: {
      type: [String],
      default: [],
      required: true,
    },
    detectionState: {
      type: String,
      enum: {
        values: DETECTION_STATES,
        message: 'detectionState must be SAFE, VIOLATION, or UNCERTAIN',
      },
      default: 'SAFE',
      required: true,
    },
    safetyStatus: {
      type: String,
      enum: {
        values: PPE_SAFETY_STATUSES,
        message: 'safetyStatus must be SAFE, UNSAFE, or REVIEW_REQUIRED',
      },
      required: true,
    },
    overallConfidence: {
      type: Number,
      required: [true, 'overallConfidence is required'],
      min: [0, 'overallConfidence cannot be less than 0.0'],
      max: [1, 'overallConfidence cannot exceed 1.0'],
    },
    headRegionVisible: {
      type: Boolean,
      default: true,
    },
    evidenceUrl: {
      type: String,
      default: null,
      trim: true,
    },
    evidenceFileHash: {
      type: String,
      default: null,
      trim: true,
    },
    occurredAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.detectionId = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

ppeDetectionSchema.virtual('detectionId').get(function getDetectionId() {
  return this._id ? this._id.toString() : undefined;
});

ppeDetectionSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  }
);

ppeDetectionSchema.index({ cameraId: 1, occurredAt: -1 });
ppeDetectionSchema.index({ zoneId: 1, occurredAt: -1 });

const PpeDetection = mongoose.model('PpeDetection', ppeDetectionSchema);

module.exports = {
  PpeDetection,
  DETECTION_STATES,
  PPE_SAFETY_STATUSES,
  WORKER_IDENTIFICATION_SOURCES,
};
