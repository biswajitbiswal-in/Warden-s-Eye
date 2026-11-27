const mongoose = require('mongoose');

const EVIDENCE_TYPES = ['IMAGE', 'VIDEO', 'DETECTION_PAYLOAD', 'SENSOR_PAYLOAD'];

const incidentEvidenceSchema = new mongoose.Schema(
  {
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: [true, 'Parent incidentId is required'],
      index: true,
    },
    evidenceType: {
      type: String,
      enum: {
        values: EVIDENCE_TYPES,
        message: 'evidenceType must be IMAGE, VIDEO, DETECTION_PAYLOAD, or SENSOR_PAYLOAD',
      },
      required: [true, 'evidenceType is required'],
    },
    evidenceUrl: {
      type: String,
      required: [true, 'evidenceUrl is required'],
      trim: true,
    },
    fileHash: {
      type: String,
      default: null,
      trim: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.evidenceId = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

incidentEvidenceSchema.virtual('evidenceId').get(function getEvidenceId() {
  return this._id ? this._id.toString() : undefined;
});

const IncidentEvidence = mongoose.model('IncidentEvidence', incidentEvidenceSchema);

module.exports = {
  IncidentEvidence,
  EVIDENCE_TYPES,
};
