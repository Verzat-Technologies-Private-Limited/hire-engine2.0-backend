// middlewares/requestTracker.js
const requestTracker = (req, res, next) => {
  const id = Date.now();
  const start = Date.now();

  console.log(`→ [${id}] START  ${req.method} ${req.originalUrl}`);

  // Listen for the moment a response is actually sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`✓ [${id}] DONE   ${req.method} ${req.originalUrl}  ${res.statusCode}  (${duration}ms)`);
  });

  // If neither 'finish' nor an error fires within 10 seconds,
  // the request is stuck.
  const timer = setTimeout(() => {
    console.warn(`⚠️ [${id}] HANG   ${req.method} ${req.originalUrl}  — no response after 10s`);
  }, 10_000);

  // If the response finishes in time, cancel the warning
  res.on('finish', () => clearTimeout(timer));

  next();
};

module.exports = requestTracker;