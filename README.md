# 🚀 Hire Engine Backend — Scalable Multi-Country Job Portal API

Production-grade, scalable backend for a Monster Jobs-style hiring platform built with **Node.js, Express.js, Mongoose & MongoDB**.

---

## 🌟 Key Features & Architectural Highlights

1. **🔌 Country-Aware Plugin System (Zero `if-else` chains)**
   - Pluggable strategy pattern architecture under `src/plugins/countries/`.
   - Adding support for a new country (e.g. 🇮🇳 India, 🇺🇸 US, 🇬🇧 UK) is as simple as adding a new plugin folder with standardized interface contracts for:
     - Dynamic company registration validation (GST, PAN, CIN for India; EIN for US)
     - Tax calculations (GST 18% vs US state sales tax)
     - Country-specific data privacy policies (DPDP 2023, CCPA, GDPR)
     - Payment gateway auto-selection

2. **💳 Modular Adapter Layer (Plug & Play)**
   - **Payment Adapters**: Seamless adapter pattern (`PaymentGatewayAdapter`) supporting **Razorpay** (India) and **Stripe** (US/UK/Global).
   - **File Storage**: Cloudinary integration for resume parsing and image/document storage.
   - **Email**: SendGrid integration with fallback to console logging stub.
   - **Cache & Queues**: Interfaced for Redis & BullMQ with in-memory stubs for zero-dependency local development.
   - **Resume Parser**: Abstracted parser interface returning structured experience/skills data.

3. **👥 Actor-Based Functionality**
   - **Job Seeker**: Multi-format resume upload, profile visibility toggling, "Easy Apply", screening questions, saved searches with alert preferences, application history.
   - **Employer / Recruiter**: Business registration verification, sub-account team management with granular permissions, job posting/promotion, candidate pipeline stage tracking (ATS), candidate rating/notes, bulk emails.
   - **System Administrator**: Employer verification, user suspension/banning, content moderation flags, taxonomy management, system config tuning, financial refund processing, audit logging.

---

## 🛠 Tech Stack

- **Runtime**: Node.js (>= 18.0)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (Access + Refresh Tokens), OAuth 2.0 (Google, LinkedIn)
- **Security**: Helmet, CORS, Rate Limiting, NoSQL Sanitization, XSS Clean, HPP, Bcrypt
- **Validation**: Joi
- **Logging**: Winston + Morgan

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (>= v18.0)
- MongoDB instance running locally (`mongodb://localhost:27017/hire-engine`) or MongoDB Atlas URI

### 2. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Seed Database (Optional demo data)
```bash
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
```
The server will start at `http://localhost:5000/api/v1`.

---

## 📚 API Endpoints Summary

| Module | Route Prefix | Description |
|--------|--------------|-------------|
| **Auth** | `/api/v1/auth` | Register, login, OAuth, refresh token, password reset, email verify |
| **Users** | `/api/v1/users` | Profile view/update, visibility toggle, GDPR data deletion |
| **Resumes** | `/api/v1/resumes` | Upload, auto-parse, list, set default, delete |
| **Jobs** | `/api/v1/jobs` | Post jobs, update, status change, promote, view details |
| **Applications**| `/api/v1/applications` | Apply (Easy Apply), view status, candidate notes, rating, bulk email |
| **Search** | `/api/v1/search` | Advanced job search (geo, salary, filters), resume DB Boolean search, saved alerts |
| **Company** | `/api/v1/companies` | Register (country-plugin validated), team sub-accounts, permissions |
| **Subscriptions**| `/api/v1/subscriptions` | Pricing plans, subscribe (Razorpay/Stripe), cancel, webhooks |
| **Pipelines** | `/api/v1/pipelines` | Customizable ATS pipeline stages per company |
| **Notifications**| `/api/v1/notifications`| User in-app notifications and read toggles |
| **Analytics** | `/api/v1/analytics` | Job conversion rates, applicant demographics, company overview |
| **Admin** | `/api/v1/admin` | Employer verification, user bans, flags, taxonomy, config, refunds, audit logs |

---

## 📖 Comprehensive API Documentation

- **💼 [Recruiter & Employer Frontend API Guide](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/RECRUITER_API_DOCUMENTATION.md)**: Dedicated frontend integration guide detailing all recruiter-side endpoints, payload bodies, response formats, AI features, TypeScript types, and Axios client setup.
- **🌐 [Core Platform API Documentation](file:///g:/github-hire-engine-monster-jobs/hire-engine-backend/API_DOCUMENTATION.md)**: Full API reference covering Job Seekers, Employers, Admin, and Country Plugins.

---

## 🧪 System Health & Plugins Endpoint

- **Health Check**: `GET /api/v1/health`
- **Supported Country Plugins**: `GET /api/v1/countries`

