# Junior Node.js Developer Interview Guide — Hire Engine Backend

**Interviewer Profile**: Senior Node.js Backend Architect (10+ Years Experience, MNC Engineering Lead)  
**Candidate Profile**: Junior Node.js Developer claiming 100% original, solo, ground-up authorship of the `hire-engine-backend` codebase.  
**Objective**: Ask targeted, deep-dive architectural and implementation questions strictly based on this project to verify authentic code authorship, system design comprehension, and engineering maturity.

---

## Technical Interview Questions & Expected Responses

### 1. Server Bootstrap & Graceful Shutdown Lifecycle
**Question**:
"Walk me through how your server starts up and shuts down in [server.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/server.js). If the application receives a `SIGTERM` or `SIGINT` signal from process managers like Kubernetes or PM2, what exact sequence of cleanup events occurs?"

**What Senior Wants to Hear (Brief)**:
- **Startup Order**: Asynchronous sequential boot sequence: DB Connection (`connectDB()`) -> Auto-discovery of country plugins -> Worker registration -> HTTP server startup (`app.listen`).
- **Graceful Shutdown**: Stops accepting new HTTP connections via `server.close()`, then asynchronously drains and closes DB connections (`disconnectDB()`), cache adapters, and queue adapters (`shutdown()`).
- **Fail-Safe Timeout**: Implements a 10-second fallback timer (`setTimeout`) to forcefully exit (`process.exit(1)`) if dangling connections prevent process termination.
- **Process Exception Handlers**: Listens for `unhandledRejection` and `uncaughtException` to log stack traces with Winston before exiting.

---

### 2. Middleware Sequence & Security Implementation Trade-offs
**Question**:
"In [src/app.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/app.js), why is `express.raw({ type: 'application/json' })` mounted specifically for `/api/v1/subscriptions/webhooks` *before* `express.json()`? Also, I noticed several security middlewares (`helmet`, `express-mongo-sanitize`, `xss-clean`, `hpp`) are commented out—can you justify that design choice?"

**What Senior Wants to Hear (Brief)**:
- **Webhook Raw Body Parsing**: Payment gateways (Stripe/Razorpay) require the untouched, unparsed raw binary/string buffer stream to compute and verify HMAC signatures. If `express.json()` executes first, it mutates the request body into a JavaScript object, breaking signature verification.
- **Security Middleware Defense**: Acknowledges that commenting out security middlewares in [src/app.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/app.js) is a major production security flaw (or leftover local dev state). Candidate must articulate what each provides:
  - `helmet()`: Sets secure HTTP response headers (HSTS, CSP, X-Frame-Options).
  - `mongoSanitize()`: Strips `$` and `.` operators to stop NoSQL injection attacks.
  - `hpp()`: Prevents HTTP Parameter Pollution array injection attacks.

---

### 3. Extensible Plugin Architecture (Multi-Country Localization)
**Question**:
"Your project advertises multi-country support. Explain how your country plugin registry works in [src/plugins/countries/index.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/plugins/countries/index.js) and [src/middlewares/countryContext.middleware.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/middlewares/countryContext.middleware.js). If we need to expand support to Germany (`DE`), what exact steps do you take without modifying core route controllers?"

**What Senior Wants to Hear (Brief)**:
- **Auto-Discovery System**: `loadPlugins()` uses Node.js `fs.readdirSync` to dynamically scan subdirectories inside `src/plugins/countries/`, dynamically requiring each folder's `index.js` and instantiating classes extending `BaseCountryPlugin` ([base.plugin.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/plugins/countries/base.plugin.js)).
- **Context Resolution Order**: `resolveCountryContext` inspects `req.body.countryCode` -> `req.query.countryCode` -> `req.company.countryCode` -> `req.user.countryCode` to bind `req.countryPlugin`.
- **Zero-Code Core Extension**: To add `DE`, create `src/plugins/countries/DE/index.js` extending `BaseCountryPlugin`, defining currency (`EUR`), VAT tax calculation, phone regex validation, and payment provider (`stripe`). No modification to `server.js` or controllers is needed.

---

### 4. Adapter Pattern (Cache, Queue, and Payment Provider abstraction)
**Question**:
"How did you implement the Adapter pattern in [src/adapters/](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/adapters/)? How does the backend switch dynamically between In-Memory storage and Redis/BullMQ, or Stripe and Razorpay?"

**What Senior Wants to Hear (Brief)**:
- **Unified Interfaces**: Created abstract adapter contracts (e.g., `CacheAdapter`, `QueueAdapter`, `PaymentAdapter`) defining standard method signatures (`get`, `set`, `addJob`, `createSubscription`).
- **Driver-Based Dependency Injection**: Environment variables (`config.cache.driver`, `config.queue.driver`) drive factory functions (`getCacheAdapter()`, `getQueueAdapter()`) to return singletons of `RedisAdapter` / `BullMQAdapter` in production or `MemoryAdapter` in local dev/testing.
- **Dynamic Payment Factory**: Unlike cache/queue singletons, `getPaymentAdapter(providerName)` in [src/adapters/payment/index.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/adapters/payment/index.js) instantiates and caches provider instances (`StripeAdapter` vs `RazorpayAdapter`) resolved dynamically per country via `countryPlugin.getPaymentProvider()`.

---

### 5. Authentication, Token Management & Role-Based Access Control (RBAC)
**Question**:
"Walk me through your JWT authentication flow in [src/utils/tokens.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/utils/tokens.js) and role enforcement in [src/middlewares/rbac.middleware.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/middlewares/rbac.middleware.js). How do access tokens, refresh tokens, and permissions work together?"

**What Senior Wants to Hear (Brief)**:
- **Dual Token Flow**: Generates short-lived Access Tokens (containing `userId` and `role`) signed with `accessSecret`, alongside long-lived Refresh Tokens signed with a distinct `refreshSecret`.
- **RBAC Middleware Mechanism**: `authorize(...allowedRoles)` returns a higher-order middleware function that checks if `req.user.role` exists within the allowed role parameters (supporting `candidate`, `recruiter`, `employer_admin`, `admin`, `superAdmin`).
- **Security Considerations**: Access tokens are kept stateless for fast verification in [auth.middleware.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/middlewares/auth.middleware.js), while refresh tokens are verified and rotated against database store during session renewals.

---

### 6. Asynchronous Error Handling & Global Error Middleware
**Question**:
"Why do you use the `asyncHandler` wrapper in your controllers, and how does your global error handler in [src/middlewares/errorHandler.middleware.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/middlewares/errorHandler.middleware.js) transform Mongoose and JWT exceptions?"

**What Senior Wants to Hear (Brief)**:
- **Elimination of Boilerplate**: `asyncHandler` ([src/utils/asyncHandler.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/utils/asyncHandler.js)) wraps async controller signatures in a `Promise.resolve().catch(next)` block, automatically passing unhandled promise rejections to the global error middleware without repetitive `try/catch` blocks.
- **Custom Error Standardization**: `ApiError` ([src/utils/ApiError.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/utils/ApiError.js)) encapsulates operational status codes, error messages, and operational flags.
- **Mongoose / JWT Error Translation**: `errorHandler.middleware.js` checks specific error types:
  - Mongoose `CastError` -> Formats into HTTP 400 (Invalid ID).
  - Mongo Error Code `11000` -> Formats into HTTP 409 (Duplicate Key Conflict).
  - Joi `ValidationError` -> Formats field validation messages with HTTP 400.
  - `JsonWebTokenError` / `TokenExpiredError` -> Formats into HTTP 401 Unauthorized.

---

### 7. Asynchronous Queue Processing & Worker Architecture
**Question**:
"How are background tasks like transactional emails and job alert processing offloaded from HTTP request handlers in [src/jobs/](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/jobs/)?"

**What Senior Wants to Hear (Brief)**:
- **Decoupled Job Dispatching**: HTTP routes enqueue background tasks (`getQueueAdapter().addJob('emailQueue', payload)`) immediately returning HTTP response (e.g. 202 Accepted / 201 Created) without blocking the client on SMTP latency.
- **Worker Registration**: `registerEmailWorker()` ([emailWorker.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/jobs/emailWorker.js)) and `registerAlertWorker()` ([alertWorker.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/jobs/alertWorker.js)) register persistent consumer listeners on application startup.
- **Concurrency & Resilience**: In BullMQ/Redis mode, workers execute concurrently, support retries with exponential backoff, and handle failure dead-letter queues.

---

### 8. Complex Search, Filtering & Database Optimization
**Question**:
"Explain how your search service in [src/services/search.service.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/services/search.service.js) constructs database queries for job postings. How do you handle pagination, full-text search, and relational references?"

**What Senior Wants to Hear (Brief)**:
- **Dynamic Query Building**: Programmatically constructs Mongoose filter objects based on query parameters (keywords regex/text search on title/description, salary range filters, tags `$in`, country/location filters).
- **Pagination Utility**: Uses [src/utils/pagination.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/utils/pagination.js) to compute `skip` and `limit` from `page` and `limit` params, executing queries alongside `countDocuments()` to return standardized metadata (`totalPages`, `totalItems`, `currentPage`).
- **Population & Field Projection**: Uses Mongoose `.populate('company', 'name logo countryCode')` to fetch light relational metadata without over-fetching document payload.

---

### 9. File Upload Strategy & Resume Parsing Pipeline
**Question**:
"How does candidate resume processing work across [src/middlewares/upload.middleware.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/middlewares/upload.middleware.js) and [src/utils/resumeParser.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/utils/resumeParser.js)?"

**What Senior Wants to Hear (Brief)**:
- **Multer Middleware Filtering**: `upload.middleware.js` configures storage limits (e.g. 5MB) and strict MIME-type validation (`application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
- **Storage Strategy**: Streams uploaded files to Cloudinary (or local storage in fallback/dev mode) via the storage adapter ([src/adapters/storage/index.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/adapters/storage/index.js)), returning public URL and asset metadata.
- **Asynchronous Text Parsing**: `resumeParser.js` extracts raw string content from document streams and applies regex/keyword extraction to derive candidate skills, experience years, contact info, and generate ATS matching scores.

---

### 10. Automated Testing & Database Seeding Strategy
**Question**:
"How do you run automated tests in [src/__tests__/](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/src/__tests__/) without polluting developer or production MongoDB databases, and how does [scripts/seed.js](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/scripts/seed.js) work?"

**What Senior Wants to Hear (Brief)**:
- **In-Memory Integration Testing**: Uses `mongodb-memory-server` combined with `supertest` in Jest tests. Spins up an ephemeral in-memory MongoDB instance during `beforeAll`, executes HTTP assertions against Express `app`, and clears collections between tests.
- **Seeding Script Execution**: `scripts/seed.js` connects to the MongoDB instance via `connectDB()`, clears existing non-production test collections, hashes passwords via `bcryptjs`, and inserts initial reference taxonomies, admin users, dummy companies, and sample job postings.
