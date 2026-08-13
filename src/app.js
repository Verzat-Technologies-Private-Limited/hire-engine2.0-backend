const express = require('express');
// const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
// const mongoSanitize = require('express-mongo-sanitize');
// const hpp = require('hpp');
// const xss = require('xss-clean');
const passport = require('./config/passport');
const config = require('./config');
const requestLogger = require('./middlewares/requestLogger.middleware');
const errorHandler = require('./middlewares/errorHandler.middleware');
const { globalLimiter } = require('./middlewares/rateLimiter.middleware');
const routes = require('./routes');
const requestTracker = require('./middlewares/requesTracker.middleware');

const app = express();

app.use(requestTracker);

// 1. Security HTTP Headers
// app.use(helmet());

// 2. Enable CORS
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

// 3. Compression
app.use(compression());

// 4. Raw body parsing for Webhooks (MUST be before express.json parsing)
app.use('/api/v1/subscriptions/webhooks', express.raw({ type: 'application/json' }));

// 5. Body Parsing with size limits
// app.use(express.json({ limit: '10kb' }));
// app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(express.json());
app.use(express.urlencoded());

// 6. Data Sanitization against NoSQL injection
// app.use(mongoSanitize());

// 7. Data Sanitization against XSS
// app.use(xss());

// 8. Prevent HTTP Parameter Pollution
// app.use(hpp());

// 9. Passport initialization
app.use(passport.initialize());

// 10. Request Logging
app.use(requestLogger);

// 11. Global Rate Limiter
app.use('/api', globalLimiter);

// 12. Mount API Routes
app.use(`/api/${config.apiVersion}`, routes);

// 13. 404 Handler for unmapped routes
app.use((_req, _res, next) => {
  const ApiError = require('./utils/ApiError');
  next(ApiError.notFound('Requested API endpoint does not exist'));
});

// 14. Global Error Handler
app.use(errorHandler);

module.exports = app;
