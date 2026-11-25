const mongoose = require('mongoose');

const ZONE_STATUSES = ['ACTIVE', 'INACTIVE'];

const zoneSchema = new mongoose.Schema(
  {
    zoneCode: {
      type: String,
      required: [true, 'Zone code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, 'Zone code must be at least 2 characters'],
      maxlength: [40, 'Zone code cannot exceed 40 characters'],
    },
    zoneName: {
      type: String,
      required: [true, 'Zone name is required'],
      trim: true,
      minlength: [2, 'Zone name must be at least 2 characters'],
      maxlength: [120, 'Zone name cannot exceed 120 characters'],
    },
    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ZONE_STATUSES,
        message: 'Zone status must be ACTIVE or INACTIVE',
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
        ret.zoneId = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

zoneSchema.virtual('zoneId').get(function getZoneId() {
  return this._id ? this._id.toString() : undefined;
});

const Zone = mongoose.model('Zone', zoneSchema);

module.exports = {
  Zone,
  ZONE_STATUSES,
};
