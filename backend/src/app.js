const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { getEnv } = require('./config/env');
const { getIsConnected } = require('./config/db');
const { sendSuccess } = require('./utils/apiResponse');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const workerRoutes = require('./routes/worker.routes');
const zoneRoutes = require('./routes/zone.routes');
const adminRoutes = require('./routes/admin.routes');
const deviceRoutes = require('./routes/device.routes');
const rfidRoutes = require('./routes/rfid.routes');
const sensorRoutes = require('./routes/sensor.routes');

const app = express();

// 1. Security Headers
app.use(helmet());

// 2. CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      const { clientUrl, nodeEnv } = getEnv();
      const allowedOrigins = clientUrl.split(',').map((o) => o.trim());
      if (!origin || nodeEnv === 'test' || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// 3. HTTP Request Logging (disabled in test mode to keep test output clean)
if (getEnv().nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// 4. Global API Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => (getEnv().nodeEnv === 'test' ? 1000 : 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: { code: 'RATE_LIMIT_EXCEEDED' },
  },
});
app.use('/api', apiLimiter);

// 5. Body Parsing with Safe Size Limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 6. Health Check Endpoint
app.get('/api/health', (_req, res) => {
  return sendSuccess(res, 200, 'SmartPPE - Warden\'s Eye Backend API is operational', {
    status: 'UP',
    databaseConnected: getIsConnected(),
    timestamp: new Date().toISOString(),
  });
});

// 7. Initial Foundation, Phase 2 Admin & Phase 3 Hardware Ingestion API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/rfid', rfidRoutes);
app.use('/api/sensors', sensorRoutes);

// 8. 404 Not Found & Centralized Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
