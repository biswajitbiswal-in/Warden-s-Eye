const app = require('./app');
const { getEnv } = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');

let server;

const startServer = async () => {
  try {
    const { port, nodeEnv } = getEnv();
    await connectDB();

    server = app.listen(port, () => {
      console.log(`[Server] SmartPPE — Warden's Eye Backend listening on port ${port} (${nodeEnv})`);
    });

    // Graceful shutdown handler
    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      if (server) {
        server.close(async () => {
          await disconnectDB();
          process.exit(0);
        });
      } else {
        await disconnectDB();
        process.exit(0);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error(`[Server] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
