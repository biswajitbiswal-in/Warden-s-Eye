const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const { User } = require('../models/User.model');
const { Zone } = require('../models/Zone.model');
const { Worker } = require('../models/Worker.model');
const { ZoneAssignment } = require('../models/ZoneAssignment.model');
const { Device } = require('../models/Device.model');
const { Camera } = require('../models/Camera.model');
const { RfidLog } = require('../models/RfidLog.model');
const { PpeDetection } = require('../models/PpeDetection.model');
const { SensorEvent } = require('../models/SensorEvent.model');
const { Incident } = require('../models/Incident.model');
const { IncidentEvidence } = require('../models/IncidentEvidence.model');
const { AuditLog } = require('../models/AuditLog.model');

const verifyConnection = async () => {
  try {
    const conn = await connectDB();

    // Initialize indexes for all 12 canonical models
    await Promise.all([
      User.init(),
      Zone.init(),
      Worker.init(),
      ZoneAssignment.init(),
      Device.init(),
      Camera.init(),
      RfidLog.init(),
      PpeDetection.init(),
      SensorEvent.init(),
      Incident.init(),
      IncidentEvidence.init(),
      AuditLog.init(),
    ]);

    const adminDb = conn.db.admin();
    const serverStatus = await adminDb.ping();
    const collections = await conn.db.listCollections().toArray();

    console.log('[Verification] MongoDB Ping Result:', JSON.stringify(serverStatus));
    console.log(`[Verification] Database Name: ${conn.name}`);
    console.log(`[Verification] Host & Port: ${conn.host}:${conn.port}`);
    console.log(
      `[Verification] Initialized Collections (${collections.length}):`,
      collections.map((c) => c.name).sort().join(', ')
    );

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error(`[Verification] Failed to connect or initialize MongoDB: ${error.message}`);
    process.exit(1);
  }
};

verifyConnection();
