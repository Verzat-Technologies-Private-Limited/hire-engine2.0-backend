const app = require('./src/app');
const config = require('./src/config');
const { connectDB, disconnectDB } = require('./src/config/database');
const logger = require('./src/config/logger');
const { loadPlugins } = require('./src/plugins/countries');
const { registerEmailWorker } = require('./src/jobs/emailWorker');
const { registerAlertWorker } = require('./src/jobs/alertWorker');
const { getCacheAdapter } = require('./src/adapters/cache');
const { getQueueAdapter } = require('./src/adapters/queue');

let server;

async function startServer() {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Auto-discover and load Country Plugins
    loadPlugins();

    // 3. Register background job workers
    await registerEmailWorker();
    await registerAlertWorker();

    // 4. Start HTTP Server
    server = app.listen(config.port, () => {
      logger.info(`==================================================`);
      logger.info(` Hire Engine Backend Running!`);
      logger.info(` Environment : ${config.env}`);
      logger.info(` Port        : ${config.port}`);
      logger.info(` API URL     : http://localhost:${config.port}/api/${config.apiVersion}`);
      logger.info(` Health Check: http://localhost:${config.port}/api/${config.apiVersion}/health`);
      logger.info(` Cache Driver: ${config.cache.driver}`);
      logger.info(` Queue Driver: ${config.queue.driver}`);
      logger.info(`==================================================`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// ── Graceful Shutdown ──────────────────────────────
async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');

      try {
        await disconnectDB();

        const cacheAdapter = getCacheAdapter();
        await cacheAdapter.disconnect();

        const queueAdapter = getQueueAdapter();
        await queueAdapter.shutdown();

        logger.info('Graceful shutdown completed.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', { error: err.message });
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcing shutdown');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection', { error: err.message, stack: err.stack });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

startServer();
