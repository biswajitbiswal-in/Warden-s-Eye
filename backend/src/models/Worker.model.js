const mongoose = require('mongoose');

const WORKER_STATUSES = ['ACTIVE', 'INACTIVE'];

const workerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    employeeCode: {
      type: String,
      required: [true, 'Employee code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Worker name is required'],
      trim: true,
      minlength: [2, 'Worker name must be at least 2 characters'],
      maxlength: [120, 'Worker name cannot exceed 120 characters'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    designation: {
      type: String,
      default: null,
      trim: true,
    },
    rfidUid: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
      match: [/^[0-9A-F]{8,20}$/, 'RFID UID must be an 8 to 20 character uppercase hexadecimal string'],
    },
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      required: [true, 'Assigned workplace zoneId is required'],
      index: true,
    },
    lastSeenZoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      default: null,
    },
    lastRfidScanAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: WORKER_STATUSES,
        message: 'Worker status must be ACTIVE or INACTIVE',
      },
      default: 'ACTIVE',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.workerId = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Unique sparse/partial indexes for optional unique fields
workerSchema.index(
  { rfidUid: 1 },
  {
    unique: true,
    partialFilterExpression: { rfidUid: { $type: 'string' } },
  }
);

workerSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $type: 'objectId' } },
  }
);

workerSchema.virtual('workerId').get(function getWorkerId() {
  return this._id ? this._id.toString() : undefined;
});

const Worker = mongoose.model('Worker', workerSchema);

module.exports = {
  Worker,
  WORKER_STATUSES,
};
