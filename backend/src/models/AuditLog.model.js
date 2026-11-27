const mongoose = require('mongoose');

const ACTOR_ROLES = ['WORKER', 'SUPERVISOR', 'ADMINISTRATOR', 'DEVICE', 'ML_SERVICE', 'SYSTEM'];

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    actorRole: {
      type: String,
      enum: {
        values: ACTOR_ROLES,
        message: 'Invalid actorRole in audit log',
      },
      required: [true, 'actorRole is required'],
    },
    action: {
      type: String,
      required: [true, 'Audit action is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    entityType: {
      type: String,
      required: [true, 'entityType is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    entityId: {
      type: String,
      required: [true, 'entityId is required'],
      trim: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    occurredAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.auditId = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

auditLogSchema.virtual('auditId').get(function getAuditId() {
  return this._id ? this._id.toString() : undefined;
});

auditLogSchema.index({ actorId: 1, occurredAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, occurredAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = {
  AuditLog,
  ACTOR_ROLES,
};
