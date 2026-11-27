const mongoose = require('mongoose');

const DEVICE_STATUSES = ['ONLINE', 'OFFLINE', 'MAINTENANCE'];

const deviceSchema = new mongoose.Schema(
  {
    deviceCode: {
      type: String,
      required: [true, 'Device code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, 'Device code must be at least 2 characters'],
      maxlength: [60, 'Device code cannot exceed 60 characters'],
    },
    deviceName: {
      type: String,
      required: [true, 'Device name is required'],
      trim: true,
      minlength: [2, 'Device name must be at least 2 characters'],
      maxlength: [120, 'Device name cannot exceed 120 characters'],
    },
    deviceType: {
      type: String,
      default: 'ESP32',
      uppercase: true,
      trim: true,
      required: true,
    },
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      required: [true, 'Assigned workplace zoneId is required'],
      index: true,
    },
    apiKeyHash: {
      type: String,
      required: [true, 'Device apiKeyHash is required'],
      select: false, // Never return hashed device credentials in queries
    },
    firmwareVersion: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: DEVICE_STATUSES,
        message: 'Device status must be ONLINE, OFFLINE, or MAINTENANCE',
      },
      default: 'OFFLINE',
      required: true,
    },
    lastHeartbeat: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.deviceId = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.apiKeyHash;
        return ret;
      },
    },
  }
);

deviceSchema.virtual('deviceId').get(function getDeviceId() {
  return this._id ? this._id.toString() : undefined;
});

const Device = mongoose.model('Device', deviceSchema);

module.exports = {
  Device,
  DEVICE_STATUSES,
};
