const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const getEnv = () => ({
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  clientUrl: process.env.CLIENT_URL || process.env.CORS_ALLOWED_ORIGIN || 'http://localhost:5173',
  mlServiceApiKey: process.env.ML_SERVICE_API_KEY || '',
  rfidCooldownSeconds: parseInt(process.env.RFID_COOLDOWN_SECONDS || '10', 10),
  incidentCooldownSeconds: parseInt(process.env.INCIDENT_COOLDOWN_SECONDS || '60', 10),
  deviceHeartbeatTimeoutSeconds: parseInt(process.env.DEVICE_HEARTBEAT_TIMEOUT_SECONDS || '90', 10),
  warningGraceSeconds: parseInt(process.env.WARNING_GRACE_SECONDS || '120', 10),
});

module.exports = { getEnv };
