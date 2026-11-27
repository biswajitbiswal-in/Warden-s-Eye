const mongoose = require('mongoose');

const RFID_SCAN_STATUSES = ['SUCCESS', 'UNKNOWN_CARD', 'DUPLICATE_IGNORED', 'REJECTED'];

const rfidLogSchema = new mongoose.Schema(
  {
    rfidUid: {
      type: String,
      required: [true, 'Scanned RFID UID is required'],
      uppercase: true,
      trim: true,
      match: [/^[0-9A-F]{8,20}$/, 'RFID UID must be an 8 to 20 character uppercase hexadecimal string'],
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      default: null,
      index: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: [true, 'Source ESP32 deviceId is required'],
      index: true,
    },
    deviceCode: {
      type: String,
      required: [true, 'Source ESP32 deviceCode is required'],
      uppercase: true,
      trim: true,
    },
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      required: [true, 'Workplace zoneId is required'],
      index: true,
    },
    scanStatus: {
      type: String,
      enum: {
        values: RFID_SCAN_STATUSES,
        message: 'scanStatus must be SUCCESS, UNKNOWN_CARD, DUPLICATE_IGNORED, or REJECTED',
      },
      required: true,
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
        ret.logId = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

rfidLogSchema.virtual('logId').get(function getLogId() {
  return this._id ? this._id.toString() : undefined;
});

rfidLogSchema.index({ rfidUid: 1, occurredAt: -1 });
rfidLogSchema.index({ zoneId: 1, occurredAt: -1 });
rfidLogSchema.index({ workerId: 1, occurredAt: -1 });

const RfidLog = mongoose.model('RfidLog', rfidLogSchema);

module.exports = {
  RfidLog,
  RFID_SCAN_STATUSES,
};
