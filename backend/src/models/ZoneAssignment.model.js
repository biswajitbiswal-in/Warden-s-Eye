const mongoose = require('mongoose');

const ASSIGNMENT_STATUSES = ['ACTIVE', 'INACTIVE'];

const zoneAssignmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Supervisor userId is required'],
      index: true,
    },
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      required: [true, 'Workplace zoneId is required'],
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'assignedBy administrator userId is required'],
    },
    status: {
      type: String,
      enum: {
        values: ASSIGNMENT_STATUSES,
        message: 'Assignment status must be ACTIVE or INACTIVE',
      },
      default: 'ACTIVE',
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.assignmentId = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index preventing duplicate active supervisor-to-zone assignments
zoneAssignmentSchema.index({ userId: 1, zoneId: 1 }, { unique: true });

zoneAssignmentSchema.virtual('assignmentId').get(function getAssignmentId() {
  return this._id ? this._id.toString() : undefined;
});

const ZoneAssignment = mongoose.model('ZoneAssignment', zoneAssignmentSchema);

module.exports = {
  ZoneAssignment,
  ASSIGNMENT_STATUSES,
};
