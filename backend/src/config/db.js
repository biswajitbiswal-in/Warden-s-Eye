const mongoose = require('mongoose');
const { getEnv } = require('./env');

let isConnected = false;

/**
 * Connect to MongoDB using Mongoose.
 * Never hardcodes database credentials; reads strictly from environment or explicit parameter.
 */
const connectDB = async (customUri) => {
  const { mongodbUri, nodeEnv } = getEnv();
  const uri = customUri || mongodbUri;

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined. Please configure it in .env.');
  }

  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    if (nodeEnv !== 'test') {
      console.log(`[Database] MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    }
    return conn.connection;
  } catch (error) {
    isConnected = false;
    if (nodeEnv !== 'test') {
      console.error(`[Database] MongoDB connection error: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Disconnect from MongoDB gracefully.
 */
const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    isConnected = false;
    const { nodeEnv } = getEnv();
    if (nodeEnv !== 'test') {
      console.log('[Database] MongoDB connection closed gracefully.');
    }
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  getIsConnected: () => isConnected || mongoose.connection.readyState === 1,
};
