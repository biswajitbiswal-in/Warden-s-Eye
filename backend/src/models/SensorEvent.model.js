const mongoose = require('mongoose');

const SENSOR_TYPES = ['SMOKE', 'FLAME'];
const SENSOR_ALERT_STATUSES = ['NORMAL', 'WARNING', 'CRITICAL'];

const sensorEventSchema = new mongoose.Schema(
  {
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
    sensorType: {
      type: String,
      enum: {
        values: SENSOR_TYPES,
        message: 'sensorType must be SMOKE or FLAME',
      },
      required: true,
    },
    sensorValue: {
      type: Number,
      required: [true, 'Numeric sensorValue is required'],
    },
    threshold: {
      type: Number,
      required: [true, 'Numeric threshold is required'],
    },
    alertStatus: {
      type: String,
      enum: {
        values: SENSOR_ALERT_STATUSES,
        message: 'alertStatus must be NORMAL, WARNING, or CRITICAL',
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
        ret.eventId = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

sensorEventSchema.virtual('eventId').get(function getEventId() {
  return this._id ? this._id.toString() : undefined;
});

sensorEventSchema.index({ deviceId: 1, sensorType: 1, occurredAt: -1 });
sensorEventSchema.index({ zoneId: 1, occurredAt: -1 });

const SensorEvent = mongoose.model('SensorEvent', sensorEventSchema);

module.exports = {
  SensorEvent,
  SENSOR_TYPES,
  SENSOR_ALERT_STATUSES,
};
