const mongoose = require('mongoose');
const config = require('./index');
const logger = require('./logger');

/**
 * Connect to MongoDB with exponential-backoff retry logic.
 * Registers event listeners for connection lifecycle events.
 */
const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000;

async function connectDB(retryCount = 0) {
  try {
    const conn = await mongoose.connect(config.mongodb.uri, {
      // Mongoose 8 defaults are sensible; these are explicit for clarity
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_DELAY_MS * Math.pow(2, retryCount);
      logger.warn(
        `MongoDB connection failed (attempt ${retryCount + 1}/${MAX_RETRIES}). ` +
          `Retrying in ${delay}ms...`,
        { error: error.message }
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectDB(retryCount + 1);
    }

    logger.error('MongoDB connection failed after max retries. Exiting.', {
      error: error.message,
    });
    process.exit(1);
  }
}

// ── Connection lifecycle events ────────────────────
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', { error: err.message });
});

/**
 * Gracefully close the MongoDB connection.
 */
async function disconnectDB() {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed gracefully');
  } catch (error) {
    logger.error('Error closing MongoDB connection', { error: error.message });
  }
}

module.exports = { connectDB, disconnectDB };
