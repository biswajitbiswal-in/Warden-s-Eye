const mongoose = require('mongoose');

const CAMERA_STATUSES = ['ONLINE', 'OFFLINE', 'STREAM_ERROR', 'MAINTENANCE'];
const STREAM_TYPES = ['LOCAL_USB', 'RTSP', 'IP_HTTP'];

const cameraSchema = new mongoose.Schema(
  {
    cameraCode: {
      type: String,
      required: [true, 'Camera code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, 'Camera code must be at least 2 characters'],
      maxlength: [60, 'Camera code cannot exceed 60 characters'],
    },
    cameraName: {
      type: String,
      required: [true, 'Camera name is required'],
      trim: true,
      minlength: [2, 'Camera name must be at least 2 characters'],
      maxlength: [120, 'Camera name cannot exceed 120 characters'],
    },
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      required: [true, 'Assigned workplace zoneId is required'],
      index: true,
    },
    locationDescription: {
      type: String,
      default: null,
      trim: true,
      maxlength: [500, 'Location description cannot exceed 500 characters'],
    },
    streamType: {
      type: String,
      enum: {
        values: STREAM_TYPES,
        message: 'Stream type must be LOCAL_USB, RTSP, or IP_HTTP',
      },
      default: 'LOCAL_USB',
      required: true,
    },
    encryptedStreamCredentials: {
      type: String,
      default: null,
      select: false,
    },
    status: {
      type: String,
      enum: {
        values: CAMERA_STATUSES,
        message: 'Camera status must be ONLINE, OFFLINE, STREAM_ERROR, or MAINTENANCE',
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
        ret.cameraId = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.encryptedStreamCredentials;
        return ret;
      },
    },
  }
);

cameraSchema.virtual('cameraId').get(function getCameraId() {
  return this._id ? this._id.toString() : undefined;
});

const Camera = mongoose.model('Camera', cameraSchema);

module.exports = {
  Camera,
  CAMERA_STATUSES,
  STREAM_TYPES,
};
