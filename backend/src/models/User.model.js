const mongoose = require('mongoose');

const USER_ROLES = ['WORKER', 'SUPERVISOR', 'ADMINISTRATOR'];
const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Never return passwordHash by default
    },
    role: {
      type: String,
      enum: {
        values: USER_ROLES,
        message: 'Role must be WORKER, SUPERVISOR, or ADMINISTRATOR',
      },
      default: 'WORKER',
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: USER_STATUSES,
        message: 'Status must be ACTIVE, INACTIVE, or SUSPENDED',
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
        ret.userId = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.userId = ret._id.toString();
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

const User = mongoose.model('User', userSchema);

module.exports = {
  User,
  USER_ROLES,
  USER_STATUSES,
};
