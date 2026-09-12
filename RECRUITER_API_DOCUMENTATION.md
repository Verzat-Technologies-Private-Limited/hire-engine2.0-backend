# 💼 Hire Engine — Recruiter & Employer API Documentation

> **Complete Frontend Developer Integration Guide**  
> *Verified against actual backend routes, controllers, Joi validation schemas, and database models. Everything required to implement the Recruiter Portal and Employer Dashboard without consulting backend developers.*

---

## 📑 Table of Contents

1. [Architecture & Request Standards](#1-architecture--request-standards)
   - [1.1 Base URL & Environments](#11-base-url--environments)
   - [1.2 Authentication & JWT Headers](#12-authentication--jwt-headers)
   - [1.3 Multi-Country Context Headers & Parameters](#13-multi-country-context-headers--parameters)
   - [1.4 Standard API Response Format](#14-standard-api-response-format)
   - [1.5 Standard API Error Format & Status Codes](#15-standard-api-error-format--status-codes)
   - [1.6 Pagination & Sorting Standards](#16-pagination--sorting-standards)
2. [Recruiter Authentication & Identity](#2-recruiter-authentication--identity)
   - `POST /api/v1/auth/register` (Register Recruiter — Corporate Email Enforced)
   - `POST /api/v1/auth/login` (Login with User & Company Permissions Context)
   - `POST /api/v1/auth/refresh-token` (Refresh Access Token)
   - `POST /api/v1/auth/logout` (Logout Session)
   - `POST /api/v1/auth/change-password` (Change Password — Authenticated)
   - `POST /api/v1/auth/forgot-password` (Request Password Reset Link)
   - `POST /api/v1/auth/reset-password` (Reset Password with Token)
   - `POST /api/v1/auth/verify-email` (Verify Email Token)
   - `POST /api/v1/auth/resend-verification-email` (Resend Verification Email)
   - `POST /api/v1/auth/send-otp` (Send SMS OTP)
   - `POST /api/v1/auth/verify-otp` (Verify SMS OTP)
   - `GET /api/v1/auth/google` & `GET /api/v1/auth/linkedin` (Social OAuth)
3. [Recruiter Profile Management](#3-recruiter-profile-management)
   - `GET /api/v1/users/me` (Get Current Profile)
   - `PATCH /api/v1/users/me` (Update Profile Details)
   - `PATCH /api/v1/users/me/visibility` (Toggle Profile Visibility)
   - `DELETE /api/v1/users/me` (GDPR Account Deletion)
4. [Company Profile, Verification & Team Collaboration](#4-company-profile-verification--team-collaboration)
   - `GET /api/v1/companies/lookup/domain` (Match Company by Corporate Domain)
   - `POST /api/v1/companies` (Register Company with Country Plugin Validation)
   - `GET /api/v1/companies/:id` (Get Company Profile Details)
   - `PATCH /api/v1/companies/:id` (Update Company Profile)
   - `POST /api/v1/companies/:id/request-join` (Request to Join Existing Company)
   - `POST /api/v1/companies/:id/team` (Add Team Member Directly — Owner Only)
   - `PATCH /api/v1/companies/:id/team/:userId` (Update Team Member Permissions)
   - `DELETE /api/v1/companies/:id/team/:userId` (Remove Team Member)
   - `POST /api/v1/companies/:id/invitations` (Invite Team Member via Email)
   - `GET /api/v1/companies/:id/invitations` (List Company Invitations)
   - `DELETE /api/v1/companies/:id/invitations/:inviteId` (Revoke Invitation)
   - `GET /api/v1/companies/invitations/:token` (Public Invitation Preview)
   - `POST /api/v1/companies/invitations/:token/accept` (Accept Team Invitation)
   - `POST /api/v1/companies/:id/documents` (Upload Compliance Document)
   - `GET /api/v1/companies/:id/documents` (Get Documents & Verification Checklist)
   - `POST /api/v1/companies/phone/send-otp` (Send OTP to Company Phone — Auth Required)
   - `POST /api/v1/companies/:id/phone/verify-otp` (Verify Company Phone OTP)
   - [Employer Verification Lifecycle & Job Publishing Gate](#418-employer-verification-lifecycle--job-publishing-gate)
5. [Job Postings Lifecycle Management](#5-job-postings-lifecycle-management)
   - `POST /api/v1/jobs` (Create Job Posting — Active Subscription Required)
   - `GET /api/v1/jobs/employer/my-jobs` (List Recruiter's Jobs)
   - `GET /api/v1/jobs/:id` (Get Single Job Details)
   - `PATCH /api/v1/jobs/:id` (Update Job Details)
   - `PATCH /api/v1/jobs/:id/status` (Publish / Pause / Close Job)
   - `POST /api/v1/jobs/:id/promote` (Sponsor / Boost Job)
6. [Applicant Tracking System (ATS) & Candidate Pipeline](#6-applicant-tracking-system-ats--candidate-pipeline)
   - `GET /api/v1/applications/jobs/:jobId/applications` (List Job Applicants)
   - `GET /api/v1/applications/:id` (Get Single Candidate Application Details)
   - `GET /api/v1/applications/:id/fit` (AI Candidate Fit Score & Scorecard)
   - `PATCH /api/v1/applications/:id/status` (Update Stage & Status)
   - `POST /api/v1/applications/:id/notes` (Add Recruiter Note & Rating)
   - `GET /api/v1/applications/:id/notes` (List Candidate Application Notes)
   - `PUT /api/v1/applications/:id/notes/:noteId` (Update Recruiter Note)
   - `DELETE /api/v1/applications/:id/notes/:noteId` (Delete Recruiter Note — 204 No Content)
   - `POST /api/v1/applications/:id/rate` (Rate Candidate 1–5 Stars)
   - `DELETE /api/v1/applications/:id/rate` (Clear Candidate Rating)
   - `POST /api/v1/applications/bulk-email` (Send Bulk Email to Applicants)
7. [Talent Sourcing, Resume Database & AI Semantic Match](#7-talent-sourcing-resume-database--ai-semantic-match)
   - `GET /api/v1/search/resumes` (Advanced Boolean & Hybrid Resume Search)
   - `GET /api/v1/search/resumes/similar/:resumeId` (Find Candidates Similar to Top Profile)
   - `GET /api/v1/search/resumes/rank-by-job/:jobId` (AI-Rank Candidate Pool against Job)
   - `POST /api/v1/search/saved` (Save Talent Search Query & Alerts)
   - `GET /api/v1/search/saved` (List Recruiter's Saved Searches)
   - `DELETE /api/v1/search/saved/:id` (Delete Saved Search)
8. [Candidate Resume & AI Match Inspection](#8-candidate-resume--ai-match-inspection)
   - `GET /api/v1/resumes/:id` (View Full Parsed Candidate Resume)
   - `GET /api/v1/resumes/:id/analysis` (AI Resume Analysis & ATS Feedback)
   - `GET /api/v1/resumes/:id/match/:jobId` (Direct Resume-to-Job Match Analysis)
9. [Custom ATS Hiring Pipelines](#9-custom-ats-hiring-pipelines)
   - `POST /api/v1/pipelines` (Create Custom Pipeline)
   - `GET /api/v1/pipelines` (List Company Pipelines — Requires `companyId` Query Param)
   - `PATCH /api/v1/pipelines/:id` (Update Pipeline & Stages)
   - `DELETE /api/v1/pipelines/:id` (Delete Pipeline)
10. [Subscriptions, Pricing Plans & Invoicing](#10-subscriptions-pricing-plans--invoicing)
    - `GET /api/v1/subscriptions/plans` (Get Available Plans & Localized Pricing)
    - `POST /api/v1/subscriptions` (Step 1: Create Subscription Order & Pending Transaction)
    - `POST /api/v1/subscriptions/verify` (Step 2: Cryptographic Payment Verification & Activation)
    - `GET /api/v1/subscriptions/current` (Current Subscription, Expiration & Quotas)
    - `DELETE /api/v1/subscriptions` (Cancel Active Subscription)
    - `GET /api/v1/subscriptions/transactions` (Billing History & Transactions)
    - `GET /api/v1/subscriptions/transactions/:id/invoice` (Download B2B Tax Invoice)
    - `POST /api/v1/subscriptions/webhooks/:provider` (Payment Webhook Integration)
11. [Recruitment Analytics & ROI Reporting](#11-recruitment-analytics--roi-reporting)
    - `GET /api/v1/analytics/company/overview` (Company Overview ROI Dashboard)
    - `GET /api/v1/analytics/jobs/:jobId` (Job Funnel & Conversion Analytics)
    - `GET /api/v1/analytics/jobs/:jobId/demographics` (Applicant Demographics & Top Skills)
12. [Recruiter Notifications](#12-recruiter-notifications)
    - `GET /api/v1/notifications` (List Notifications)
    - `PATCH /api/v1/notifications/:id/read` (Mark Notification Read)
    - `PATCH /api/v1/notifications/read-all` (Mark All Notifications Read)
13. [Global Country Plugins & System Info](#13-global-country-plugins--system-info)
    - `GET /api/v1/countries` (List Supported Countries & Metadata)
    - `GET /api/v1/health` (Health Check)
14. [Frontend TypeScript Interfaces & Enums](#14-frontend-typescript-interfaces--enums)
15. [Frontend Integration Best Practices (Axios Client Setup)](#15-frontend-integration-best-practices-axios-client-setup)

---

## 1. Architecture & Request Standards

### 1.1 Base URL & Environments

| Environment | Base URL |
| :--- | :--- |
| **Local Development** | `http://localhost:5000/api/v1` |
| **Production** | `https://api.hireengine.com/api/v1` |

### 1.2 Authentication & JWT Headers

All protected recruiter endpoints require the **Bearer Access Token** in the `Authorization` header:

```http
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

- **Access Token Lifetime**: 15 minutes
- **Refresh Token Lifetime**: 7 days (persisted securely in `localStorage` or `HttpOnly` cookie)
- **Role Requirement**: Most recruiter endpoints require the user to have role `'employer'` or `'admin'`.
- **Validation Engine**: Joi with `allowUnknown: false`. Any unexpected fields submitted in request bodies will trigger a `400 Bad Request` validation error. Submit only documented fields.

### 1.3 Multi-Country Context Headers & Parameters

The backend features a country plugin architecture (`IN`, `US`, etc.) that governs tax calculation, payment provider selection (Razorpay vs Stripe), business verification rules, and legal identifier formats.

Country context is resolved in order of priority:
1. Explicit in request body (e.g. `countryCode: "IN"` in `POST /api/v1/companies` — **required** for company registration)
2. Explicit in query string (e.g. `?countryCode=IN` in `GET /api/v1/subscriptions/plans`)
3. HTTP Header:
   ```http
   X-Country-Code: IN
   ```
4. Company's registered country (when operating on an existing company)
5. User's registered `countryCode`

### 1.4 Standard API Response Format

Every successful API response adheres to the `ApiResponse` format:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Human readable success message",
  "data": { ... },
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalDocs": 95,
      "limit": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

> **Note**: The `meta` object is included automatically on paginated list endpoints. `meta.pagination` provides all navigation flags required for UI paginators.

### 1.5 Standard API Error Format & Status Codes

Errors return standard JSON containing machine-readable error details:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "phone",
      "message": "Business phone number is required for company registration",
      "type": "any.required"
    }
  ]
}
```

#### Common HTTP Status Codes:
- `200 OK`: Request succeeded.
- `201 Created`: Resource created successfully.
- `204 No Content`: Resource deleted successfully with no response body (e.g. `DELETE /applications/:id/notes/:noteId`).
- `400 Bad Request`: Validation failure or malformed payload.
- `401 Unauthorized`: Missing, expired, or invalid Bearer token.
- `403 Forbidden`: Insufficient role or lack of company team permissions.
- `404 Not Found`: Resource ID does not exist.
- `409 Conflict`: Unique constraint violation (e.g. duplicate email, duplicate company name).
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Server error.

### 1.6 Pagination & Sorting Standards

All list endpoints accept the following standard query parameters:
- `page`: Page number (integer >= 1, default `1`).
- `limit`: Items per page (integer 1-100, default `20`).
- `sort`: Sorting field name prefix with `-` for descending (e.g. `-createdAt`, `rating`).

---

## 2. Recruiter Authentication & Identity

### 2.1 Recruiter Registration
Create a new employer/recruiter account.

> [!IMPORTANT]
> **Corporate Email Mandatory for Employers**:
> When `role: "employer"`, free consumer email providers (`gmail.com`, `yahoo.com`, `hotmail.com`, `outlook.com`, `icloud.com`, etc.) are **strictly rejected** by the backend validation with `400 Bad Request`:
> `"A business/corporate email address is required to register an employer profile. Free consumer email providers are not permitted."`
> Frontend registration forms must advise recruiters to use their official work email.

- **Method / URL**: `POST /api/v1/auth/register`
- **Auth**: None (Public)
- **Rate Limit**: 20 requests per 15 min

#### Request Body
```json
{
  "firstName": "Sarah",
  "lastName": "Jenkins",
  "email": "sarah.jenkins@techcorp.io",
  "password": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!",
  "role": "employer",
  "countryCode": "US"
}
```

| Field | Type | Required | Constraints |
| :--- | :--- | :--- | :--- |
| `firstName` | `string` | **Yes** | 1-50 characters |
| `lastName` | `string` | **Yes** | 1-50 characters |
| `email` | `string` | **Yes** | Valid corporate business email |
| `password` | `string` | **Yes** | 8-128 characters |
| `confirmPassword` | `string` | **Yes** | Must match `password` |
| `role` | `string` | No | Defaults to `'jobseeker'`. Pass `'employer'` for recruiter profiles |
| `countryCode` | `string` | No | ISO 2-letter uppercase code (e.g. `"US"`, `"IN"`) |

#### Response `(201 Created)`
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user": {
      "_id": "66b44a10e7b231123a8b4567",
      "firstName": "Sarah",
      "lastName": "Jenkins",
      "email": "sarah.jenkins@techcorp.io",
      "role": "employer",
      "isEmailVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

### 2.2 Recruiter Login
Authenticate recruiter and obtain JWT tokens. For employer accounts, the backend automatically returns the recruiter's associated company summary, verification status, and team permissions.

- **Method / URL**: `POST /api/v1/auth/login`
- **Auth**: None (Public)
- **Rate Limit**: 20 requests per 15 min

#### Request Body
```json
{
  "email": "sarah.jenkins@techcorp.io",
  "password": "SecurePassword123!"
}
```

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "66b44a10e7b231123a8b4567",
      "firstName": "Sarah",
      "lastName": "Jenkins",
      "email": "sarah.jenkins@techcorp.io",
      "role": "employer",
      "status": "active",
      "isEmailVerified": true,
      "countryCode": "US",
      "company": {
        "_id": "66b44a20e7b231123a8b4588",
        "name": "CloudScale Technologies Inc.",
        "slug": "cloudscale-technologies-inc",
        "logoUrl": "https://storage.hireengine.com/logos/cloudscale.png",
        "countryCode": "US",
        "verificationStatus": "approved",
        "isVerified": true,
        "isOwner": true,
        "permissions": [
          "manage_jobs",
          "view_applications",
          "manage_applications",
          "manage_team",
          "view_analytics",
          "manage_billing"
        ]
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

> **Frontend Routing Tip**:
> If `user.role === 'employer'` and `user.company` is `null`, navigate the recruiter to the **Employer Onboarding / Company Registration** flow (`POST /api/v1/companies`). If `user.company` exists, route directly to the Employer Dashboard.

---

### 2.3 Refresh Access Token
Obtain a fresh 15-minute access token and rotated refresh token using a valid refresh token.

- **Method / URL**: `POST /api/v1/auth/refresh-token`
- **Auth**: None (Public)

#### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2.4 Logout
Invalidate the current refresh token on the backend and discard tokens on the client.

- **Method / URL**: `POST /api/v1/auth/logout`
- **Auth**: Optional / Discard tokens on client

#### Request Body (Optional)
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged out successfully",
  "data": null
}
```

---

### 2.5 Change Password (Authenticated)
Change account password while logged in. Verifies current password before setting new password and invalidating active refresh tokens.

- **Method / URL**: `POST /api/v1/auth/change-password`
- **Auth**: `Bearer <token>`
- **Rate Limit**: 20 requests per 15 min

#### Request Body
```json
{
  "currentPassword": "SecurePassword123!",
  "newPassword": "NewSuperPassword456!",
  "confirmPassword": "NewSuperPassword456!"
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `currentPassword` | `string` | **Yes** | Existing account password |
| `newPassword` | `string` | **Yes** | Min 8 characters, must differ from current password |
| `confirmPassword` | `string` | **Yes** | Must match `newPassword` |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password changed successfully",
  "data": null
}
```

---

### 2.6 Password Recovery & Reset

#### Step 1: Request Password Reset Link
- **Method / URL**: `POST /api/v1/auth/forgot-password`
- **Request Body**:
```json
{
  "email": "sarah.jenkins@techcorp.io"
}
```
- **Response `(200 OK)`**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "If an account with that email exists, a password reset link has been sent.",
  "data": null
}
```

#### Step 2: Set New Password
- **Method / URL**: `POST /api/v1/auth/reset-password`
- **Request Body**:
```json
{
  "token": "d98e8f7a6b5c4d3e2f1a0b9c8d7e6f5a",
  "password": "BrandNewPassword123!",
  "confirmPassword": "BrandNewPassword123!"
}
```
- **Response `(200 OK)`**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password has been reset successfully. You can now login with your new password.",
  "data": null
}
```

---

### 2.7 Verify Email Address
- **Method / URL**: `POST /api/v1/auth/verify-email`
- **Request Body**:
```json
{
  "token": "4a7c8b9d0e1f2a3b4c5d6e7f8a9b0c1d"
}
```
- **Response `(200 OK)`**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Email verified successfully.",
  "data": null
}
```

---

### 2.8 Resend Email Verification
- **Method / URL**: `POST /api/v1/auth/resend-verification-email`
- **Auth**: None (Public)
- **Request Body**:
```json
{
  "email": "sarah.jenkins@techcorp.io"
}
```
- **Response `(200 OK)`**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "If an unverified account with that email exists, a new verification link has been sent.",
  "data": null
}
```

---

### 2.9 SMS OTP Authentication

#### Step 1: Send OTP to Phone
Dispatches 6-digit numeric OTP valid for 5 minutes via SMS gateway.

- **Method / URL**: `POST /api/v1/auth/send-otp`
- **Auth**: None (Public)
- **Request Body**:
```json
{
  "mobile": "+919876543210"
}
```
- **Response `(200 OK)`**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP sent successfully to +919876543210. Valid for 5 minutes.",
  "data": {
    "success": true,
    "message": "OTP sent successfully to +919876543210. Valid for 5 minutes."
  }
}
```

#### Step 2: Verify OTP
- **Method / URL**: `POST /api/v1/auth/verify-otp`
- **Auth**: None (Public)
- **Request Body**:
```json
{
  "mobile": "+919876543210",
  "otp": "492810"
}
```
- **Response `(200 OK)`**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP verified successfully.",
  "data": {
    "verified": true,
    "message": "OTP verified successfully."
  }
}
```

---

### 2.10 Social OAuth (Google & LinkedIn)
To initiate social login/registration, redirect the browser to:
- Google: `GET /api/v1/auth/google`
- LinkedIn: `GET /api/v1/auth/linkedin`

OAuth callback returns JSON payload containing `{ user, tokens }` on success.

---

## 3. Recruiter Profile Management

### 3.1 Get Recruiter Profile
Fetch current authenticated user profile. Automatically populates linked company details.

- **Method / URL**: `GET /api/v1/users/me`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile retrieved successfully",
  "data": {
    "_id": "66b44a10e7b231123a8b4567",
    "firstName": "Sarah",
    "lastName": "Jenkins",
    "email": "sarah.jenkins@techcorp.io",
    "role": "employer",
    "phone": "+14155552671",
    "avatar": "https://storage.hireengine.com/avatars/sarah.jpg",
    "headline": "Head of Talent Acquisition",
    "countryCode": "US",
    "status": "active",
    "profileVisibility": "public",
    "isEmailVerified": true,
    "company": {
      "_id": "66b44a20e7b231123a8b4588",
      "name": "CloudScale Technologies Inc.",
      "verificationStatus": "approved"
    },
    "createdAt": "2026-08-21T10:00:00.000Z"
  }
}
```

---

### 3.2 Update Recruiter Profile
Update personal contact details, headline, and bio.

> [!NOTE]
> Field name for telephone is `phone` (NOT `mobile`). Unknown keys will trigger `400 Bad Request`. Email and role cannot be changed via this endpoint.

- **Method / URL**: `PATCH /api/v1/users/me`
- **Auth**: `Bearer <token>`

#### Request Body *(At least one field required)*
```json
{
  "firstName": "Sarah",
  "lastName": "Jenkins-Smith",
  "phone": "+14155559999",
  "headline": "VP of Global Talent Acquisition",
  "avatar": "https://storage.hireengine.com/avatars/sarah_new.jpg",
  "summary": "10+ years scaling technology teams from Seed to Series D."
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `firstName` | `string` | No | 1–50 characters |
| `lastName` | `string` | No | 1–50 characters |
| `phone` | `string` | No | Contact phone number |
| `avatar` | `string` | No | Valid image URL |
| `headline` | `string` | No | Max 200 characters |
| `summary` | `string` | No | Max 2000 characters |
| `skills` | `string[]` | No | Array of strings (max 50) |
| `location` | `object` | No | `{ address, city, state, country, postalCode }` |
| `countryCode` | `string` | No | 2-letter uppercase ISO code |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile updated successfully",
  "data": {
    "_id": "66b44a10e7b231123a8b4567",
    "firstName": "Sarah",
    "lastName": "Jenkins-Smith",
    "email": "sarah.jenkins@techcorp.io",
    "role": "employer",
    "phone": "+14155559999",
    "headline": "VP of Global Talent Acquisition",
    "avatar": "https://storage.hireengine.com/avatars/sarah_new.jpg"
  }
}
```

---

### 3.3 Toggle Profile Visibility
Control whether recruiter profile is publicly searchable.

- **Method / URL**: `PATCH /api/v1/users/me/visibility`
- **Auth**: `Bearer <token>`

#### Request Body
```json
{
  "visibility": "public"
}
```
*(Valid values: `"public"`, `"private"`, `"anonymous"`)*

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile visibility set to public",
  "data": {
    "_id": "66b44a10e7b231123a8b4567",
    "profileVisibility": "public"
  }
}
```

---

### 3.4 Request GDPR Account Deletion
Initiates GDPR compliant account deletion. Sets user status to `deleted` and anonymizes sensitive identifying attributes.

- **Method / URL**: `DELETE /api/v1/users/me`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Your account deletion request has been processed. All personal data has been scheduled for permanent erasure.",
  "data": {
    "message": "Your account deletion request has been processed. All personal data has been scheduled for permanent erasure."
  }
}
```

---

## 4. Company Profile, Verification & Team Collaboration

### 4.1 Match Company by Corporate Email Domain
When a new recruiter registers with corporate email (e.g. `alex@uber.com`), call this endpoint to check if an existing company profile already exists for domain `uber.com`.

- **Method / URL**: `GET /api/v1/companies/lookup/domain?domain=techcorp.io`
- **Auth**: None (Public)

#### Query Parameters
| Param | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `domain` | `string` | **Yes** | Corporate domain extracted from user's email |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Domain lookup result",
  "data": {
    "matched": true,
    "company": {
      "_id": "66b44a20e7b231123a8b4588",
      "name": "CloudScale Technologies Inc.",
      "slug": "cloudscale-technologies-inc",
      "logoUrl": "https://storage.hireengine.com/logos/cloudscale.png",
      "website": "https://techcorp.io"
    }
  }
}
```
*(If no company matched, returns `{ "matched": false, "company": null }`)*

---

### 4.2 Register Company Profile
Registers the employer's company. Validates legal business registration fields, corporate contact phone, and duplicate business identifiers using the active Country Plugin.

- **Method / URL**: `POST /api/v1/companies`
- **Auth**: `Bearer <token>` (User must have verified email address; `isEmailVerified: true`)
- **Headers**: `Content-Type: application/json` (Optional: `X-Country-Code: IN` or `US`)

#### Business Rules & Validation:
1. **Email Verification Gate**: The user account must be verified before registering a company (`403 Forbidden` if unverified).
2. **Single Ownership**: A user account may only own one registered company profile (`409 Conflict` if user already owns a company).
3. **Mandatory Fields**: `name`, `countryCode` (2 uppercase characters), and `phone` are **strictly required**.
4. **Country Plugin Registration Details**:
   - For India (`IN`): Validates `registrationDetails.gstNumber` (15-char GSTIN format) and `registrationDetails.panNumber` (10-char PAN). Phone must be a valid 10-digit Indian mobile number.
   - For US (`US`): Validates `registrationDetails.einNumber` (XX-XXXXXXX format).
5. **Instant Phone Verification**: If recruiter previously triggered `POST /api/v1/companies/phone/send-otp`, they can provide `phoneOtp` directly in the registration payload to verify the company phone immediately upon registration.

#### Request Body (US Company Example)
```json
{
  "name": "CloudScale Technologies Inc.",
  "countryCode": "US",
  "phone": "+14155550199",
  "website": "https://cloudscale.io",
  "industry": "Software & Internet",
  "size": "51-200",
  "description": "Leading cloud infrastructure and developer automation platform.",
  "contactName": "Sarah Jenkins",
  "address": {
    "street": "500 Howard Street, Suite 400",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94105",
    "country": "United States"
  },
  "socialLinks": {
    "linkedin": "https://linkedin.com/company/cloudscale",
    "twitter": "https://twitter.com/cloudscale_io"
  },
  "registrationDetails": {
    "einNumber": "12-3456789",
    "stateOfIncorporation": "DE",
    "businessType": "corporation"
  }
}
```

#### Request Body (India Company with Instant Phone OTP)
```json
{
  "name": "CloudScale India Pvt Ltd",
  "countryCode": "IN",
  "phone": "+919876543210",
  "phoneOtp": "492810",
  "contactName": "Rajesh Sharma",
  "website": "https://cloudscale.in",
  "industry": "Software & Internet",
  "size": "51-200",
  "description": "India development center for CloudScale.",
  "address": {
    "street": "Outer Ring Road, Bellandur",
    "city": "Bengaluru",
    "state": "Karnataka",
    "postalCode": "560103",
    "country": "India"
  },
  "registrationDetails": {
    "gstNumber": "29AAAAA0000A1Z5",
    "panNumber": "AAAAA0000A",
    "cinNumber": "U72200KA2020PTC123456"
  }
}
```

#### Response `(201 Created)`
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Company registered successfully. Pending business verification.",
  "data": {
    "_id": "66b44a20e7b231123a8b4588",
    "name": "CloudScale India Pvt Ltd",
    "owner": "66b44a10e7b231123a8b4567",
    "website": "https://cloudscale.in",
    "industry": "Software & Internet",
    "size": "51-200",
    "description": "India development center for CloudScale.",
    "countryCode": "IN",
    "phone": "+919876543210",
    "contactName": "Rajesh Sharma",
    "isPhoneVerified": true,
    "verifiedPhone": true,
    "verificationStatus": "pending",
    "reviewDeadlineAt": "2026-09-14T10:05:00.000Z",
    "teamMembers": [
      {
        "user": "66b44a10e7b231123a8b4567",
        "role": "owner",
        "permissions": [
          "manage_jobs",
          "view_applications",
          "manage_applications",
          "manage_team",
          "view_analytics",
          "manage_billing"
        ],
        "joinedAt": "2026-09-12T10:05:00.000Z"
      }
    ],
    "createdAt": "2026-09-12T10:05:00.000Z"
  }
}
```

---

### 4.3 Get Company Profile
- **Method / URL**: `GET /api/v1/companies/:id`
- **Auth**: None (Public) or `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Company profile retrieved successfully",
  "data": {
    "_id": "66b44a20e7b231123a8b4588",
    "name": "CloudScale Technologies Inc.",
    "logoUrl": "https://storage.hireengine.com/logos/cloudscale.png",
    "website": "https://cloudscale.io",
    "industry": "Software & Internet",
    "size": "51-200",
    "description": "Leading cloud infrastructure platform.",
    "countryCode": "US",
    "verificationStatus": "approved",
    "isVerified": true,
    "address": {
      "city": "San Francisco",
      "state": "CA",
      "country": "United States"
    }
  }
}
```

---

### 4.4 Update Company Profile
Update company profile details. Requires `employer` or `admin` role and company team membership.

- **Method / URL**: `PATCH /api/v1/companies/:id`
- **Auth**: `Bearer <token>`

#### Request Body
```json
{
  "name": "CloudScale Technologies Inc.",
  "website": "https://cloudscale.io",
  "industry": "Cloud Infrastructure",
  "size": "201-500",
  "description": "Updated global cloud platform description."
}
```

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Company profile updated successfully",
  "data": {
    "_id": "66b44a20e7b231123a8b4588",
    "name": "CloudScale Technologies Inc.",
    "industry": "Cloud Infrastructure",
    "size": "201-500"
  }
}
```

---

### 4.5 Request to Join Company
Allows a recruiter whose domain matches an existing company to submit a request to the company owner for team membership.

- **Method / URL**: `POST /api/v1/companies/:id/request-join`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Join request submitted to company owner",
  "data": {
    "message": "Join request submitted to company owner"
  }
}
```

---

### 4.6 Add Team Member Directly (Owner Only)
Directly attach an existing registered user to the company with granular permissions.

- **Method / URL**: `POST /api/v1/companies/:id/team`
- **Auth**: `Bearer <token>` (Company Owner only)

#### Available Team Permissions:
- `manage_jobs`: Create, edit, pause, and close job postings.
- `view_applications`: View candidate applications and resumes.
- `manage_applications`: Change hiring stages, submit notes, and rate candidates.
- `manage_team`: Invite and manage team sub-accounts.
- `view_analytics`: Access ROI metrics and job conversion reports.
- `manage_billing`: Manage subscription plans and access invoices.

#### Request Body
```json
{
  "email": "alex.recruiter@techcorp.io",
  "permissions": [
    "manage_jobs",
    "view_applications",
    "manage_applications",
    "view_analytics"
  ]
}
```

#### Response `(201 Created)`
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Team member added successfully",
  "data": {
    "_id": "66b44a20e7b231123a8b4588",
    "teamMembers": [
      {
        "user": "66b44a10e7b231123a8b4567",
        "role": "owner",
        "permissions": [
          "manage_jobs",
          "view_applications",
          "manage_applications",
          "manage_team",
          "view_analytics",
          "manage_billing"
        ]
      },
      {
        "user": {
          "_id": "66b44a30e7b231123a8b4599",
          "firstName": "Alex",
          "lastName": "Wong",
          "email": "alex.recruiter@techcorp.io"
        },
        "role": "member",
        "permissions": [
          "manage_jobs",
          "view_applications",
          "manage_applications",
          "view_analytics"
        ],
        "joinedAt": "2026-09-12T10:15:00.000Z"
      }
    ]
  }
}
```

---

### 4.7 Update Team Member Permissions
- **Method / URL**: `PATCH /api/v1/companies/:id/team/:userId`
- **Auth**: `Bearer <token>` (Company Owner only)

#### Request Body
```json
{
  "permissions": [
    "view_applications",
    "manage_applications"
  ]
}
```

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Team member permissions updated successfully",
  "data": { ... }
}
```

---

### 4.8 Remove Team Member
- **Method / URL**: `DELETE /api/v1/companies/:id/team/:userId`
- **Auth**: `Bearer <token>` (Company Owner only)

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Team member removed successfully",
  "data": null
}
```

---

### 4.9 Invite Team Member via Email
Sends an email invitation token to a colleague with pre-assigned permissions.

- **Method / URL**: `POST /api/v1/companies/:id/invitations`
- **Auth**: `Bearer <token>` (Company Owner only)

#### Request Body
```json
{
  "email": "sarah.hiringmanager@techcorp.io",
  "permissions": [
    "view_applications",
    "manage_applications"
  ]
}
```

#### Response `(201 Created)`
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Team invitation sent successfully",
  "data": {
    "_id": "66b44a35e7b231123a8b45aa",
    "company": "66b44a20e7b231123a8b4588",
    "email": "sarah.hiringmanager@techcorp.io",
    "permissions": ["view_applications", "manage_applications"],
    "token": "7b8f9a0c1d2e3f4a5b6c7d8e9f0a1b2c",
    "status": "pending",
    "expiresAt": "2026-09-19T10:00:00.000Z"
  }
}
```

---

### 4.10 List Company Invitations
- **Method / URL**: `GET /api/v1/companies/:id/invitations`
- **Auth**: `Bearer <token>` (Company Owner only)

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Company invitations retrieved successfully",
  "data": [
    {
      "_id": "66b44a35e7b231123a8b45aa",
      "email": "sarah.hiringmanager@techcorp.io",
      "permissions": ["view_applications", "manage_applications"],
      "status": "pending",
      "expiresAt": "2026-09-19T10:00:00.000Z",
      "createdAt": "2026-09-12T10:00:00.000Z"
    }
  ]
}
```

---

### 4.11 Revoke Invitation
- **Method / URL**: `DELETE /api/v1/companies/:id/invitations/:inviteId`
- **Auth**: `Bearer <token>` (Company Owner only)

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Invitation revoked successfully",
  "data": {
    "_id": "66b44a35e7b231123a8b45aa",
    "status": "revoked"
  }
}
```

---

### 4.12 Public Invitation Preview
Retrieve invitation details from token to render the accept invitation onboarding screen.

- **Method / URL**: `GET /api/v1/companies/invitations/:token`
- **Auth**: None (Public)

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Invitation retrieved successfully",
  "data": {
    "_id": "66b44a35e7b231123a8b45aa",
    "email": "sarah.hiringmanager@techcorp.io",
    "company": {
      "_id": "66b44a20e7b231123a8b4588",
      "name": "CloudScale Technologies Inc.",
      "logoUrl": "https://storage.hireengine.com/logos/cloudscale.png"
    },
    "permissions": ["view_applications", "manage_applications"],
    "expiresAt": "2026-09-19T10:00:00.000Z"
  }
}
```

---

### 4.13 Accept Invitation
Accept team invitation. If the invitee already has an account, they can accept logged in. If they are new, they supply their name and password to register and join simultaneously.

- **Method / URL**: `POST /api/v1/companies/invitations/:token/accept`
- **Auth**: None (Public) or `Bearer <token>` (if already logged in)

#### Request Body (For New Users)
```json
{
  "firstName": "Sarah",
  "lastName": "Taylor",
  "password": "SecurePassword123!"
}
```

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Invitation accepted successfully",
  "data": {
    "user": {
      "_id": "66b44a36e7b231123a8b45bb",
      "firstName": "Sarah",
      "lastName": "Taylor",
      "email": "sarah.hiringmanager@techcorp.io",
      "role": "employer"
    },
    "company": {
      "_id": "66b44a20e7b231123a8b4588",
      "name": "CloudScale Technologies Inc."
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

### 4.14 Upload Company Verification Document
Uploads a business verification document (e.g. GST Certificate or PAN Card for India; EIN Letter or Articles of Incorporation for US).

- **Method / URL**: `POST /api/v1/companies/:id/documents`
- **Auth**: `Bearer <token>`
- **Content-Type**: `multipart/form-data`

#### Request Form Data
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `document` | `File` | **Yes** | File binary (PDF, Word doc/docx, JPG, PNG). Max 10 MB. |
| `type` | `string` | **Yes** | Country-specific document type (`gst_certificate`, `pan_card`, `cin_certificate`, `ein_letter`, `articles_of_incorporation`, etc.) |
| `label` | `string` | No | Human-readable document label |

#### Response `(201 Created)`
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Company document uploaded successfully",
  "data": {
    "document": {
      "type": "gst_certificate",
      "label": "GST Registration Certificate",
      "fileUrl": "https://res.cloudinary.com/hire-engine/raw/upload/v1/documents/doc_gst_cert_123.pdf",
      "publicId": "doc_gst_cert_123.pdf",
      "uploadedAt": "2026-09-12T10:30:00.000Z"
    },
    "documents": [ ... ]
  }
}
```

---

### 4.15 Get Company Documents & Verification Checklist
Returns all uploaded documents and an automated verification checklist showing which required documents have been uploaded vs. are still pending, computed directly from the company's Country Plugin.

- **Method / URL**: `GET /api/v1/companies/:id/documents`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Company documents and verification checklist retrieved",
  "data": {
    "companyId": "66b44a20e7b231123a8b4588",
    "countryCode": "IN",
    "countryName": "India",
    "verificationStatus": "pending",
    "isComplete": false,
    "checklist": [
      {
        "type": "gst_certificate",
        "label": "GST Registration Certificate",
        "description": "Upload your GST registration certificate issued by the GST portal",
        "required": true,
        "isUploaded": true,
        "uploadedDocument": {
          "type": "gst_certificate",
          "label": "GST Registration Certificate",
          "fileUrl": "https://res.cloudinary.com/hire-engine/raw/upload/v1/documents/doc_gst_cert_123.pdf",
          "publicId": "doc_gst_cert_123.pdf",
          "uploadedAt": "2026-09-12T10:30:00.000Z"
        }
      },
      {
        "type": "pan_card",
        "label": "Company PAN Card",
        "description": "Upload a copy of your company PAN card",
        "required": true,
        "isUploaded": false,
        "uploadedDocument": null
      }
    ],
    "documents": [ ... ]
  }
}
```

---

### 4.16 Send Company Phone Verification OTP
Dispatches a 6-digit one-time password (OTP) via SMS to the specified mobile number. Valid for 5 minutes.

> [!IMPORTANT]
> This route is protected and requires an authenticated recruiter (`Bearer <token>`).

- **Method / URL**: `POST /api/v1/companies/phone/send-otp`
- **Auth**: `Bearer <token>`

#### Request Body
```json
{
  "phone": "+919876543210"
}
```

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP sent successfully to +919876543210. Valid for 5 minutes.",
  "data": {
    "success": true,
    "message": "OTP sent successfully to +919876543210. Valid for 5 minutes."
  }
}
```

---

### 4.17 Verify Company Phone OTP
Verifies the SMS OTP and marks the company's phone number as verified (`isPhoneVerified: true`).

- **Method / URL**: `POST /api/v1/companies/:id/phone/verify-otp`
- **Auth**: `Bearer <token>`

#### Request Body
```json
{
  "phone": "+919876543210",
  "otp": "492810"
}
```

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Company phone verified successfully",
  "data": {
    "_id": "66b44a20e7b231123a8b4588",
    "name": "CloudScale India Pvt Ltd",
    "phone": "+919876543210",
    "isPhoneVerified": true,
    "verifiedPhone": true,
    "verificationStatus": "pending"
  }
}
```

---

### 4.18 Employer Verification Lifecycle & Job Publishing Gate

All employers must undergo compliance verification before their job listings appear publicly to job seekers.

```
 [Register Company]
       │
       ▼
 ┌───────────┐         Admin requests docs          ┌────────────────────────┐
 │  pending  │ ────────────────────────────────────►│  information_required  │
 └─────┬─────┘                                      └───────────┬────────────┘
       │                                                        │
       │ Admin initiates                                        │ Employer uploads
       │ secondary review                                       │ requested documents
       ▼                                                        │
 ┌──────────────┐                                               │
 │ under_review │◄──────────────────────────────────────────────┘
 └─────┬────────┘
       │
       ├─────────────────────────┐
       ▼                         ▼
 ┌───────────┐             ┌──────────┐
 │ approved  │             │ rejected │
 └───────────┘             └──────────┘
 (Unlocks Active           (Requires support
  Job Posting)              appeal)
```

#### Status Transitions & Action Guide:

| Status | Recruiter UI Experience | Allowed Actions | Action to Complete |
| :--- | :--- | :--- | :--- |
| `pending` | Banner: *"Company profile pending verification. Review SLA: ~24-48 hours."* | Create draft jobs, configure hiring pipelines, invite team members. | Wait for admin review or upload additional compliance documents. |
| `under_review` | Banner: *"Your verification is under detailed compliance review."* | Create draft jobs, manage team. | Compliance team is verifying business documents. |
| `information_required` | Warning Banner: *"Action Required: Additional documentation requested by compliance team."* Displays `infoRequestedNotes`. | Upload missing documents via `POST /api/v1/companies/:id/documents`. | Review feedback notes and upload the requested certificates. |
| `approved` | Success Badge: *"Verified Employer"* | Full platform access: publish live jobs, search talent database. | Ready to hire. |
| `rejected` | Alert: *"Verification failed. Reason: [Notes]"* | View account settings; job publishing locked. | Contact compliance support with proof of business registration. |

> **Job Publishing Gate**:
> If a company is in `pending`, `under_review`, or `information_required` status, calling `POST /api/v1/jobs` with `publishNow: true` or updating an existing draft to `"active"` will return `403 Forbidden`:
> `"Company account is currently 'pending'. In India, company profile verification must be approved before publishing active job listings. You can save your job as a draft in the meantime."`
> Draft jobs can be saved anytime and published with 1 click once approved.

---

## 5. Job Postings Lifecycle Management

### 5.1 Create Detailed Job Posting
Creates a new job listing for the employer's company.

> [!IMPORTANT]
> **Active Subscription Required**:
> The backend enforces that the company must have an active subscription with remaining job quota (`subscription.hasJobPostQuota()`). If no active subscription exists, returns `403 Forbidden` (`"An active subscription is required to post jobs. Please subscribe to a plan."`).
> If `publishNow: true` or `status: "active"`, the company must also have `verificationStatus: "approved"`. Otherwise, jobs default to status `"draft"`.

- **Method / URL**: `POST /api/v1/jobs`
- **Auth**: `Bearer <token>` (Requires role `employer` & `manage_jobs` permission)

#### Request Body
```json
{
  "companyId": "66b44a20e7b231123a8b4588",
  "title": "Senior Full Stack Engineer (React / Node.js)",
  "description": "We are seeking an experienced Full Stack Engineer to lead architecture on our real-time analytics engine...",
  "responsibilities": "• Architect distributed services in Node.js and TypeScript\n• Build high performance UI in React\n• Mentor junior engineers",
  "qualifications": "• 5+ years of production experience with Node.js and React\n• Strong knowledge of MongoDB and Redis\n• Experience with AWS/Docker",
  "skills": ["React", "Node.js", "TypeScript", "MongoDB", "Redis", "Docker", "AWS"],
  "category": "Engineering",
  "employmentType": "full-time",
  "workplaceType": "hybrid",
  "location": {
    "address": "500 Howard St",
    "city": "San Francisco",
    "state": "CA",
    "country": "United States",
    "postalCode": "94105",
    "coordinates": {
      "type": "Point",
      "coordinates": [-122.398, 37.789]
    }
  },
  "salaryRange": {
    "min": 140000,
    "max": 180000,
    "currency": "USD",
    "period": "annually",
    "isVisible": true
  },
  "experienceLevel": "senior",
  "experienceYears": {
    "min": 5,
    "max": 10
  },
  "education": "bachelor",
  "benefits": ["Health, Dental & Vision", "401(k) Matching", "Flexible PTO", "Annual Learning Stipend"],
  "applicationDeadline": "2026-12-31T23:59:59.000Z",
  "publishNow": false,
  "screeningQuestions": [
    {
      "question": "Do you have at least 5 years of professional JavaScript / TypeScript experience?",
      "type": "yes_no",
      "required": true,
      "idealAnswer": "yes"
    },
    {
      "question": "Which cloud provider are you most experienced with?",
      "type": "multiple_choice",
      "required": true,
      "options": ["AWS", "GCP", "Azure", "None"],
      "idealAnswer": "AWS"
    }
  ]
}
```

| Field | Type | Required | Constraints |
| :--- | :--- | :--- | :--- |
| `companyId` | `string` | **Yes** | 24-char ObjectId of the recruiter's company |
| `title` | `string` | **Yes** | 3–200 characters |
| `description` | `string` | **Yes** | 50–10,000 characters |
| `skills` | `string[]` | **Yes** | 1–30 skill tags |
| `employmentType` | `string` | **Yes** | `'full-time'`, `'part-time'`, `'contract'`, `'internship'` |
| `workplaceType` | `string` | **Yes** | `'remote'`, `'hybrid'`, `'onsite'` |
| `location` | `object` | **Yes** | Requires `city` and `country`. Coordinates sanitized automatically |
| `publishNow` | `boolean` | No | Defaults to `false` (creates as `draft`). If `true`, attempts to publish directly |
| `screeningQuestions`| `array` | No | Up to 10 questions. Types: `'yes_no'`, `'multiple_choice'`, `'text'`, `'numeric'` |
| `salaryRange` | `object` | No | `{ min, max, currency, period: 'hourly'\|'monthly'\|'annually', isVisible }` |

#### Response `(201 Created)`
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Job posting created successfully",
  "data": {
    "_id": "66b44a50e7b231123a8b4610",
    "company": "66b44a20e7b231123a8b4588",
    "postedBy": "66b44a10e7b231123a8b4567",
    "title": "Senior Full Stack Engineer (React / Node.js)",
    "status": "draft",
    "skills": ["React", "Node.js", "TypeScript", "MongoDB", "Redis", "Docker", "AWS"],
    "viewCount": 0,
    "clickCount": 0,
    "applicationCount": 0,
    "isSponsored": false,
    "createdAt": "2026-09-12T10:20:00.000Z"
  }
}
```

---

### 5.2 List Recruiter's Job Postings
Fetches all jobs belonging to the recruiter's company with application counts and status filter.

- **Method / URL**: `GET /api/v1/jobs/employer/my-jobs`
- **Auth**: `Bearer <token>`

#### Query Parameters
| Param | Type | Description |
| :--- | :--- | :--- |
| `status` | `string` | Optional filter: `draft`, `active`, `paused`, `closed`, `expired` |
| `page` | `number` | Page number (default `1`) |
| `limit` | `number` | Items per page (default `20`) |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Employer jobs retrieved successfully",
  "data": [
    {
      "_id": "66b44a50e7b231123a8b4610",
      "title": "Senior Full Stack Engineer (React / Node.js)",
      "status": "active",
      "employmentType": "full-time",
      "workplaceType": "hybrid",
      "location": {
        "city": "San Francisco",
        "state": "CA",
        "country": "United States"
      },
      "salaryRange": {
        "min": 140000,
        "max": 180000,
        "currency": "USD",
        "period": "annually"
      },
      "viewCount": 432,
      "clickCount": 189,
      "applicationCount": 38,
      "isSponsored": true,
      "createdAt": "2026-09-12T10:20:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalDocs": 1,
      "limit": 20,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 5.3 Get Single Job Details
- **Method / URL**: `GET /api/v1/jobs/:id`
- **Auth**: Optional / Public or `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job details retrieved successfully",
  "data": {
    "_id": "66b44a50e7b231123a8b4610",
    "title": "Senior Full Stack Engineer (React / Node.js)",
    "description": "...",
    "skills": ["React", "Node.js", "TypeScript"],
    "company": {
      "_id": "66b44a20e7b231123a8b4588",
      "name": "CloudScale Technologies Inc.",
      "logoUrl": "https://storage.hireengine.com/logos/cloudscale.png"
    },
    "screeningQuestions": [ ... ],
    "status": "active",
    "applicationCount": 38
  }
}
```

---

### 5.4 Update Job Posting Details
- **Method / URL**: `PATCH /api/v1/jobs/:id`
- **Auth**: `Bearer <token>` (Employer team member)

#### Request Body
```json
{
  "title": "Staff Full Stack Engineer (React / Node.js / AI)",
  "salaryRange": {
    "min": 160000,
    "max": 200000,
    "currency": "USD",
    "period": "annually",
    "isVisible": true
  }
}
```

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job updated successfully",
  "data": {
    "_id": "66b44a50e7b231123a8b4610",
    "title": "Staff Full Stack Engineer (React / Node.js / AI)",
    "status": "active"
  }
}
```

---

### 5.5 Update Job Status (Publish / Pause / Close)
When a job transitions to `"active"` (publishing), the backend automatically triggers background AI vector embedding generation and matches candidate saved-search alerts.

- **Method / URL**: `PATCH /api/v1/jobs/:id/status`
- **Auth**: `Bearer <token>`

#### Request Body
```json
{
  "status": "active"
}
```
*(Valid status values in this endpoint: `"active"`, `"paused"`, `"closed"`)*

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job status updated to active",
  "data": {
    "_id": "66b44a50e7b231123a8b4610",
    "status": "active"
  }
}
```

---

### 5.6 Sponsor / Promote a Job Listing
Boost visibility of the job posting in candidate search feeds.

- **Method / URL**: `POST /api/v1/jobs/:id/promote`
- **Auth**: `Bearer <token>`

#### Request Body
```json
{
  "dailyBudget": 25,
  "totalBudget": 250,
  "durationDays": 10
}
```

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job promoted successfully",
  "data": {
    "_id": "66b44a50e7b231123a8b4610",
    "isSponsored": true,
    "sponsorBudget": {
      "dailyBudget": 25,
      "totalBudget": 250,
      "spent": 0,
      "currency": "USD",
      "startDate": "2026-09-12T10:30:00.000Z",
      "endDate": "2026-09-22T10:30:00.000Z"
    }
  }
}
```

---

## 6. Applicant Tracking System (ATS) & Candidate Pipeline

### 6.1 List Applicants for a Job
Retrieve candidate applications for a specific job posting with filtering and pagination.

- **Method / URL**: `GET /api/v1/applications/jobs/:jobId/applications`
- **Auth**: `Bearer <token>` (Employer team member)

#### Query Parameters
| Param | Type | Description |
| :--- | :--- | :--- |
| `status` | `string` | Filter by status: `submitted`, `viewed`, `screening`, `interview`, `offer`, `hired`, `rejected`, `withdrawn` |
| `stage` | `string` | Custom pipeline stage (e.g. `"Technical Interview"`) |
| `minRating` | `number` | Minimum rating filter `1`-`5` |
| `sort` | `string` | `rating` (sorts by `-rating -appliedAt`) or default (`-appliedAt`) |
| `page` | `number` | Page number |
| `limit` | `number` | Limit per page |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job applications retrieved successfully",
  "data": [
    {
      "_id": "66b44a60e7b231123a8b4633",
      "job": "66b44a50e7b231123a8b4610",
      "applicant": {
        "_id": "66b44a70e7b231123a8b4644",
        "firstName": "Michael",
        "lastName": "Chen",
        "email": "michael.chen@devmail.com",
        "phone": "+14155551234",
        "headline": "Senior Full-Stack JavaScript Developer",
        "location": {
          "city": "San Francisco",
          "state": "CA",
          "country": "United States"
        },
        "skills": ["React", "TypeScript", "Node.js", "Docker", "AWS"]
      },
      "resume": {
        "_id": "66b44a80e7b231123a8b4655",
        "title": "Michael_Chen_Senior_FullStack.pdf",
        "fileUrl": "https://storage.hireengine.com/resumes/66b44a80.pdf",
        "fileType": "pdf"
      },
      "coverLetter": "I have 6 years building high throughput SaaS platforms with Node.js and React...",
      "status": "screening",
      "pipelineStage": "Screening",
      "rating": 5,
      "isEasyApply": true,
      "screeningAnswers": [
        {
          "questionIndex": 0,
          "question": "Do you have at least 5 years of professional JavaScript experience?",
          "answer": "Yes, 6.5 years"
        }
      ],
      "appliedAt": "2026-09-12T09:15:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalDocs": 38,
      "limit": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 6.2 Get Single Candidate Application Details
Inspect complete application details including candidate contact info, populated resume, cover letter, screening Q&A answers, recruiter star rating, and audit status history.

- **Method / URL**: `GET /api/v1/applications/:id`
- **Auth**: `Bearer <token>` (Employer team member)

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Application retrieved successfully",
  "data": {
    "_id": "66b44a60e7b231123a8b4633",
    "job": {
      "_id": "66b44a50e7b231123a8b4610",
      "title": "Senior Full Stack Engineer (React / Node.js)",
      "company": "66b44a20e7b231123a8b4588"
    },
    "applicant": {
      "_id": "66b44a70e7b231123a8b4644",
      "firstName": "Michael",
      "lastName": "Chen",
      "email": "michael.chen@devmail.com",
      "phone": "+14155551234",
      "headline": "Senior Full-Stack JavaScript Developer",
      "skills": ["React", "TypeScript", "Node.js", "Docker", "AWS"]
    },
    "resume": {
      "_id": "66b44a80e7b231123a8b4655",
      "title": "Michael_Chen_Senior_FullStack.pdf",
      "fileUrl": "https://storage.hireengine.com/resumes/66b44a80.pdf",
      "parsedData": { ... }
    },
    "coverLetter": "...",
    "status": "screening",
    "pipelineStage": "Screening",
    "rating": 5,
    "isEasyApply": true,
    "screeningAnswers": [ ... ],
    "statusHistory": [
      {
        "status": "submitted",
        "changedAt": "2026-09-12T09:15:00.000Z"
      },
      {
        "status": "screening",
        "changedAt": "2026-09-12T10:00:00.000Z",
        "note": "Screening passed"
      }
    ],
    "appliedAt": "2026-09-12T09:15:00.000Z"
  }
}
```

---

### 6.3 AI Candidate Fit Score & Scorecard
Uses Google Gemini AI to analyze the candidate's parsed resume against the job requirements, providing an instant compatibility scorecard, strengths, and missing skills.

- **Method / URL**: `GET /api/v1/applications/:id/fit`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Candidate fit analysis calculated successfully",
  "data": {
    "applicationId": "66b44a60e7b231123a8b4633",
    "candidateName": "Michael Chen",
    "jobTitle": "Senior Full Stack Engineer (React / Node.js)",
    "overallMatchScore": 92,
    "skillScore": 95,
    "experienceScore": 90,
    "educationScore": 90,
    "matchedSkills": ["React", "Node.js", "TypeScript", "Docker", "AWS", "MongoDB"],
    "missingSkills": ["Redis"],
    "keyStrengths": [
      "Extensive 6+ years experience with React, Node.js, and TypeScript",
      "Demonstrated experience designing high-throughput distributed microservices",
      "Solid cloud infrastructure and Docker container orchestration skills"
    ],
    "areasForImprovement": [
      "Candidate has limited documented experience with Redis caching layer"
    ],
    "recommendation": "Strong candidate. Proceed to Technical Interview."
  }
}
```

---

### 6.4 Update Candidate Pipeline Stage & Status
Advance candidate through hiring stages (e.g. from `screening` to `interview` or `offer`). Optionally appends an internal recruiter note.

- **Method / URL**: `PATCH /api/v1/applications/:id/status`
- **Auth**: `Bearer <token>`

#### Request Body
```json
{
  "status": "interview",
  "pipelineStage": "Technical Interview",
  "note": "Candidate passed phone screening with 95% score. Scheduled for technical interview."
}
```

| Field | Type | Required | Values |
| :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | `'viewed'`, `'screening'`, `'interview'`, `'offer'`, `'hired'`, `'rejected'` |
| `pipelineStage` | `string` | No | Custom stage name (e.g. `"Technical Interview"`) |
| `note` | `string` | No | Optional note to add to candidate log |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Application status updated successfully",
  "data": {
    "_id": "66b44a60e7b231123a8b4633",
    "status": "interview",
    "pipelineStage": "Technical Interview"
  }
}
```

---

### 6.5 Add Internal Recruiter Note & Rating
Add internal comments, interview feedback, and score ratings visible only to team recruiters.

- **Method / URL**: `POST /api/v1/applications/:id/notes`
- **Auth**: `Bearer <token>`

#### Request Body
```json
{
  "content": "Superb coding interview. Demonstrated clean architecture and deep knowledge of event-driven concurrency.",
  "rating": 5,
  "isPrivate": false
}
```

#### Response `(201 Created)`
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Candidate note added successfully",
  "data": {
    "_id": "66b44a90e7b231123a8b4677",
    "application": "66b44a60e7b231123a8b4633",
    "author": "66b44a10e7b231123a8b4567",
    "content": "Superb coding interview. Demonstrated clean architecture and deep knowledge of event-driven concurrency.",
    "rating": 5,
    "isPrivate": false,
    "createdAt": "2026-09-12T11:00:00.000Z"
  }
}
```

---

### 6.6 List Candidate Application Notes
Retrieve internal notes and interview evaluations associated with a candidate application.
- **Privacy Enforcement**: Private notes (`isPrivate: true`) are **only returned to the user who authored them**.
- **Sorting**: Returned in reverse chronological order (newest first).

- **Method / URL**: `GET /api/v1/applications/:id/notes`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Candidate notes retrieved successfully",
  "data": [
    {
      "_id": "66b44a90e7b231123a8b4677",
      "application": "66b44a60e7b231123a8b4633",
      "author": {
        "_id": "66b44a10e7b231123a8b4567",
        "firstName": "Sarah",
        "lastName": "Jenkins",
        "email": "sarah.jenkins@cloudscale.io",
        "role": "employer"
      },
      "content": "Superb coding interview. Demonstrated clean architecture and deep knowledge of event-driven concurrency.",
      "rating": 5,
      "isPrivate": false,
      "createdAt": "2026-09-12T11:00:00.000Z",
      "updatedAt": "2026-09-12T11:00:00.000Z"
    }
  ]
}
```

---

### 6.7 Update Candidate Note
- **Authorization**: Only the original author of the note can update it (`403 Forbidden` otherwise).
- **Application Rating Sync**: If `rating` is included, the top-level application rating is automatically updated to stay in sync. Pass `rating: null` to unset.

- **Method / URL**: `PUT /api/v1/applications/:id/notes/:noteId`
- **Auth**: `Bearer <token>` (Author only)

#### Request Body *(At least one field required)*
```json
{
  "content": "Updated: Completed technical debrief. Highly recommended for offer.",
  "rating": 5,
  "isPrivate": true
}
```

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Candidate note updated successfully",
  "data": {
    "_id": "66b44a90e7b231123a8b4677",
    "application": "66b44a60e7b231123a8b4633",
    "author": "66b44a10e7b231123a8b4567",
    "content": "Updated: Completed technical debrief. Highly recommended for offer.",
    "rating": 5,
    "isPrivate": true,
    "createdAt": "2026-09-12T11:00:00.000Z",
    "updatedAt": "2026-09-12T11:30:00.000Z"
  }
}
```

---

### 6.8 Delete Candidate Note
- **Authorization**: Only the original author can delete their note.
- **Method / URL**: `DELETE /api/v1/applications/:id/notes/:noteId`
- **Auth**: `Bearer <token>` (Author only)

#### Response `(204 No Content)`
```http
HTTP/1.1 204 No Content
```
*(No response body returned on successful deletion)*

---

### 6.9 Rate Candidate (1–5 Stars)
Quickly set or update the candidate's star score (1–5) on the application.

- **Method / URL**: `POST /api/v1/applications/:id/rate`
- **Auth**: `Bearer <token>`

#### Request Body
```json
{
  "rating": 5
}
```

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Candidate rated successfully",
  "data": {
    "_id": "66b44a60e7b231123a8b4633",
    "rating": 5,
    "updatedAt": "2026-09-12T11:45:00.000Z"
  }
}
```

---

### 6.10 Clear Candidate Rating
Resets the candidate's star rating to `null`.

- **Method / URL**: `DELETE /api/v1/applications/:id/rate`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Candidate rating cleared successfully",
  "data": {
    "_id": "66b44a60e7b231123a8b4633",
    "rating": null
  }
}
```

---

### 6.11 Send Bulk Email to Applicants
Dispatch customized emails with dynamic placeholders (`{{candidateName}}`, `{{jobTitle}}`) to multiple candidates simultaneously.

- **Method / URL**: `POST /api/v1/applications/bulk-email`
- **Auth**: `Bearer <token>`

#### Request Body
```json
{
  "applicationIds": [
    "66b44a60e7b231123a8b4633",
    "66b44a61e7b231123a8b4634"
  ],
  "subject": "Update on your application for {{jobTitle}} at CloudScale",
  "body": "Hi {{candidateName}},\n\nThank you for applying for the {{jobTitle}} role. We would like to invite you for an introductory call.\n\nBest regards,\nCloudScale Recruiting Team"
}
```

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Bulk email process completed",
  "data": {
    "totalSent": 2,
    "successful": 2,
    "failed": 0
  }
}
```

---

## 7. Talent Sourcing, Resume Database & AI Semantic Match

### 7.1 Advanced Boolean & Hybrid Resume Search
Search candidate resume database using Boolean logic, skills, experience range, location, and AI semantic matching.
- **Privacy Enforcement**: Only active candidates with `profileVisibility: "public"` who have not requested account deletion are returned.
- **Search Modes**:
  - `keyword`: MongoDB text Boolean search (AND/OR/NOT operators).
  - `semantic`: Pure vector embedding search via MongoDB Atlas `$vectorSearch`.
  - `hybrid` *(default)*: Runs keyword and semantic in parallel, merges, deduplicates, and re-ranks with weighted scoring (`0.4 × keyword + 0.6 × semantic`).

- **Method / URL**: `GET /api/v1/search/resumes`
- **Auth**: `Bearer <token>` (Requires role `employer` or `admin`)

#### Query Parameters
| Param | Type | Required | Default | Example | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `q` | `string` | No | `""` | `(React OR Vue) AND Node.js` | Boolean search query string |
| `skills` | `string` | No | `""` | `TypeScript, Docker, AWS` | Comma-separated required skills |
| `location` | `string` | No | `""` | `San Francisco, CA` | Location string |
| `experienceMin` | `number` | No | — | `5` | Minimum years of experience |
| `experienceMax` | `number` | No | — | `12` | Maximum years of experience |
| `education` | `string` | No | `""` | `bachelor` | `high_school`, `associate`, `bachelor`, `master`, `doctorate`, `any` |
| `mode` | `string` | No | `hybrid` | `hybrid` | `keyword`, `semantic`, `hybrid` |
| `sort` | `string` | No | `relevance` | `relevance` | `relevance`, `experience`, `date` |
| `page` | `number` | No | `1` | `1` | Page number |
| `limit` | `number` | No | `20` | `20` | Max results per page (1–100) |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Resume search results retrieved",
  "data": [
    {
      "_id": "66b44a80e7b231123a8b4655",
      "user": {
        "_id": "66b44a70e7b231123a8b4644",
        "firstName": "Michael",
        "lastName": "Chen",
        "email": "michael.chen@devmail.com",
        "role": "jobseeker",
        "profileVisibility": "public",
        "status": "active"
      },
      "title": "Michael Chen - Senior Full Stack Engineer",
      "fileUrl": "https://res.cloudinary.com/hire-engine/resumes/michael_chen.pdf",
      "parsedData": {
        "personalInfo": {
          "name": "Michael Chen",
          "email": "michael.chen@devmail.com",
          "phone": "+14155551234",
          "location": "San Francisco, CA"
        },
        "headline": "Senior Full Stack Cloud Engineer",
        "skills": ["React", "TypeScript", "Node.js", "Docker", "AWS", "MongoDB"],
        "totalYearsOfExperience": 6.5
      },
      "relevanceScore": 0.9412,
      "createdAt": "2026-09-12T10:30:00.000Z"
    }
  ],
  "meta": {
    "searchMode": "hybrid",
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalDocs": 18,
      "limit": 20,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 7.2 Find Candidates Similar to a Top Candidate
Find candidate resumes in the database that have similar skills and background to a high-performing candidate using MongoDB Atlas vector similarity (`$vectorSearch`).
- **Source Filtering**: The target `resumeId` itself is automatically excluded from the similarity results.

- **Method / URL**: `GET /api/v1/search/resumes/similar/:resumeId?limit=10`
- **Auth**: `Bearer <token>` (Employer or Admin)

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Similar resumes retrieved",
  "data": [
    {
      "_id": "66b44ab0e7b231123a8b4699",
      "user": {
        "_id": "66b44a70e7b231123a8b4645",
        "firstName": "David",
        "lastName": "Miller",
        "email": "david.miller@devmail.com",
        "profileVisibility": "public"
      },
      "title": "David Miller - Full Stack Architect",
      "parsedData": {
        "skills": ["React", "Node.js", "TypeScript", "Next.js", "AWS"],
        "totalYearsOfExperience": 8
      },
      "semanticScore": 0.8921
    }
  ]
}
```

---

### 7.3 AI-Rank All Candidate Resumes Against a Job Posting
Ranks the candidate database against the exact job description using high-dimensional cosine similarity embeddings via MongoDB Atlas Vector Search.

- **Method / URL**: `GET /api/v1/search/resumes/rank-by-job/:jobId?page=1&limit=20`
- **Auth**: `Bearer <token>` (Employer or Admin)

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Resumes ranked by job fit",
  "data": [
    {
      "_id": "66b44a80e7b231123a8b4655",
      "user": {
        "_id": "66b44a70e7b231123a8b4644",
        "firstName": "Michael",
        "lastName": "Chen"
      },
      "title": "Michael Chen - Senior Full Stack Engineer",
      "semanticScore": 0.9412
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalDocs": 98,
      "limit": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 7.4 Save Talent Search Query & Candidate Alerts
Save recurring talent queries and receive email/SMS notifications when new matching resumes are added.

- **Method / URL**: `POST /api/v1/search/saved`
- **Auth**: `Bearer <token>`

#### Request Body
```json
{
  "name": "SF Senior React & Node Engineers",
  "searchType": "resumes",
  "filters": {
    "q": "React AND Node.js",
    "location": "San Francisco, CA",
    "experienceMin": 5
  },
  "emailAlert": true,
  "smsAlert": false,
  "frequency": "daily"
}
```

| Field | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | — | Name for this saved alert (1–100 chars) |
| `searchType` | `string` | No | `"jobs"` | Target search type: `"jobs"` or `"resumes"` |
| `filters` | `object` | **Yes** | — | Search criteria object |
| `emailAlert` | `boolean` | No | `true` | Send matching candidate updates via email |
| `smsAlert` | `boolean` | No | `false` | Send matching candidate updates via SMS |
| `frequency` | `string` | No | `"daily"` | Alert schedule: `"instant"`, `"daily"`, or `"weekly"` |

#### Response `(201 Created)`
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Search criteria saved successfully",
  "data": {
    "_id": "66b44ac0e7b231123a8b4711",
    "user": "66b44a10e7b231123a8b4567",
    "name": "SF Senior React & Node Engineers",
    "searchType": "resumes",
    "frequency": "daily",
    "createdAt": "2026-09-12T11:20:00.000Z"
  }
}
```

---

### 7.5 List Saved Searches
- **Method / URL**: `GET /api/v1/search/saved`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Saved searches retrieved successfully",
  "data": [
    {
      "_id": "66b44ac0e7b231123a8b4711",
      "name": "SF Senior React & Node Engineers",
      "searchType": "resumes",
      "frequency": "daily"
    }
  ]
}
```

---

### 7.6 Delete Saved Search
- **Method / URL**: `DELETE /api/v1/search/saved/:id`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Saved search deleted successfully",
  "data": null
}
```

---

## 8. Candidate Resume & AI Match Inspection

### 8.1 View Parsed Candidate Resume
Inspect full structured parsed resume details for a candidate.
- **Privacy Enforcement**:
  - `admin`: Full unrestricted access.
  - `employer`: Permitted if candidate profile is `public` and active, OR if candidate applied to any job posted by the employer's company. Private non-applicant resumes return `404 Not Found`.

- **Method / URL**: `GET /api/v1/resumes/:id`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Resume retrieved successfully",
  "data": {
    "_id": "66b44a80e7b231123a8b4655",
    "user": "66b44a70e7b231123a8b4644",
    "title": "Michael_Chen_Senior_FullStack.pdf",
    "fileUrl": "https://res.cloudinary.com/hire-engine/resumes/michael_chen.pdf",
    "fileType": "pdf",
    "parsedData": {
      "personalInfo": {
        "name": "Michael Chen",
        "email": "michael.chen@devmail.com",
        "phone": "+14155551234",
        "location": "San Francisco, CA",
        "linkedin": "https://linkedin.com/in/michaelchen"
      },
      "headline": "Senior Full Stack Cloud Engineer",
      "summary": "Full Stack Engineer with 6+ years experience...",
      "skills": ["React", "TypeScript", "Node.js", "AWS", "Docker", "MongoDB"],
      "experience": [
        {
          "company": "ScaleTech Systems",
          "title": "Senior Software Engineer",
          "startDate": "2022-01",
          "endDate": "Present",
          "current": true,
          "description": "Architected distributed microservices."
        }
      ],
      "education": [
        {
          "institution": "University of California, Berkeley",
          "degree": "Bachelor of Science",
          "field": "Computer Science",
          "graduationYear": 2020
        }
      ],
      "totalYearsOfExperience": 6.5
    }
  }
}
```

---

### 8.2 AI Resume Analysis & ATS Feedback
Generate AI-driven quality critique, ATS compatibility score, formatting feedback, and actionable coaching tips using Google Gemini AI.

- **Method / URL**: `GET /api/v1/resumes/:id/analysis`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Resume analysis and ATS feedback generated successfully",
  "data": {
    "resumeId": "66b44a80e7b231123a8b4655",
    "title": "Michael_Chen_Senior_FullStack.pdf",
    "atsScore": 88,
    "summary": "Resume structure and technical content are well-formed with clear professional progression.",
    "strengths": [
      "Clear technical skill stack and cloud architecture experience",
      "Consistent timeline across senior software engineering roles"
    ],
    "weaknesses": [
      "Add more quantified revenue, latency, or throughput metrics to microservice projects"
    ],
    "formattingFeedback": [
      "Clean section hierarchy and readable typography"
    ],
    "actionableTips": [
      "Include measurable impact for leadership roles"
    ]
  }
}
```

---

### 8.3 Direct Resume-to-Job Match Analysis
Compare any candidate resume in the database with a specific job posting to compute an AI match score, matching skills, missing skill gaps, and hiring recommendations.

- **Method / URL**: `GET /api/v1/resumes/:id/match/:jobId`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job match analysis calculated successfully",
  "data": {
    "resumeId": "66b44a80e7b231123a8b4655",
    "jobId": "66b44a50e7b231123a8b4610",
    "matchScore": 92,
    "summary": "Candidate matches 5 of 6 required skills with extensive cloud backend and distributed systems experience.",
    "matchedSkills": ["React", "Node.js", "TypeScript", "Docker", "AWS"],
    "missingSkills": ["Redis"],
    "recommendation": "Strong Match"
  }
}
```

---

## 9. Custom ATS Hiring Pipelines

### 9.1 Create Custom Hiring Pipeline
Customize stages and visual workflow per role or department.

- **Method / URL**: `POST /api/v1/pipelines`
- **Auth**: `Bearer <token>` (Employer team member)

#### Request Body
```json
{
  "companyId": "66b44a20e7b231123a8b4588",
  "name": "Engineering Hiring Pipeline",
  "isDefault": false,
  "stages": [
    { "name": "Application Review", "order": 1, "color": "#3B82F6", "description": "Initial resume screening" },
    { "name": "Take-home Challenge", "order": 2, "color": "#F59E0B", "description": "System design take-home" },
    { "name": "Live Coding Interview", "order": 3, "color": "#8B5CF6", "description": "1-hour paired live coding" },
    { "name": "Executive Bar Raiser", "order": 4, "color": "#EC4899", "description": "Culture and leadership fit" },
    { "name": "Offer Extended", "order": 5, "color": "#10B981", "description": "Formal offer package" },
    { "name": "Hired", "order": 6, "color": "#059669", "description": "Offer accepted" }
  ]
}
```

#### Response `(201 Created)`
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Pipeline created successfully",
  "data": {
    "_id": "66b44ad0e7b231123a8b4722",
    "company": "66b44a20e7b231123a8b4588",
    "name": "Engineering Hiring Pipeline",
    "isDefault": false,
    "stages": [ ... ]
  }
}
```

---

### 9.2 List Company Pipelines
Fetch all custom ATS pipelines for the employer's company.

> [!IMPORTANT]
> The backend filters pipelines by `companyId`. Always include `?companyId=<companyId>` in the query string.

- **Method / URL**: `GET /api/v1/pipelines?companyId=66b44a20e7b231123a8b4588`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Pipelines retrieved successfully",
  "data": [
    {
      "_id": "66b44ad0e7b231123a8b4722",
      "name": "Engineering Hiring Pipeline",
      "isDefault": false,
      "stages": [ ... ]
    },
    {
      "_id": "66b44ae0e7b231123a8b4733",
      "name": "Default Pipeline",
      "isDefault": true,
      "stages": [
        { "name": "New", "order": 1, "color": "#3B82F6" },
        { "name": "Screening", "order": 2, "color": "#F59E0B" },
        { "name": "Interview", "order": 3, "color": "#8B5CF6" },
        { "name": "Offer", "order": 4, "color": "#10B981" },
        { "name": "Hired", "order": 5, "color": "#059669" }
      ]
    }
  ]
}
```

---

### 9.3 Update Pipeline
- **Method / URL**: `PATCH /api/v1/pipelines/:id`
- **Auth**: `Bearer <token>`

#### Request Body
```json
{
  "name": "Engineering Hiring Pipeline v2",
  "isDefault": true
}
```

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Pipeline updated successfully",
  "data": {
    "_id": "66b44ad0e7b231123a8b4722",
    "name": "Engineering Hiring Pipeline v2",
    "isDefault": true
  }
}
```

---

### 9.4 Delete Pipeline
Default company pipelines cannot be deleted.

- **Method / URL**: `DELETE /api/v1/pipelines/:id`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Pipeline deleted successfully",
  "data": null
}
```

---

## 10. Subscriptions, Pricing Plans & Invoicing

### How Subscriptions & Payments Work
The billing architecture uses a robust **Two-Step Payment Flow** with cryptographic verification:
1. **Step 1 (Order Creation)**: Recruiter chooses a plan. Calling `POST /api/v1/subscriptions` creates an order via the country-appropriate payment gateway (Razorpay for India, Stripe for US) and records a `pending` transaction in the database.
2. **Client-Side Checkout**: The frontend opens the Stripe Elements or Razorpay Checkout modal using the returned `orderId` or `clientSecret`.
3. **Step 2 (Verification & Activation)**: Upon successful checkout, the frontend submits the gateway payment proofs (`razorpay_signature` or `paymentIntentId`) to `POST /api/v1/subscriptions/verify`. The backend cryptographically verifies the signature, activates the subscription, sets up quota tracking, and generates an official B2B tax invoice number.

---

### 10.1 Get Available Plans & Localized Pricing
Returns subscription tiers with localized currency and tax calculations (e.g. 18% GST for India, Sales Tax for US).

- **Method / URL**: `GET /api/v1/subscriptions/plans?countryCode=IN`
- **Auth**: None (Public)

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Available subscription plans retrieved",
  "data": {
    "country": "India",
    "currency": "INR",
    "paymentProvider": "razorpay",
    "plans": {
      "growth": {
        "id": "growth",
        "name": "Growth Recruiter",
        "description": "Up to 5 active job postings + Resume DB access",
        "price": 9999,
        "jobQuota": 5,
        "resumeQuota": 500,
        "hasResumeDB": true,
        "durationMonths": 1,
        "currency": "INR",
        "tax": [
          { "type": "CGST", "rate": 9, "amount": 899.91 },
          { "type": "SGST", "rate": 9, "amount": 899.91 }
        ],
        "totalPrice": 11798.82
      },
      "enterprise": {
        "id": "enterprise",
        "name": "Enterprise Talent Suite",
        "description": "Unlimited job postings, dedicated AI ranking, 5,000 resume downloads",
        "price": 89999,
        "jobQuota": 50,
        "resumeQuota": 5000,
        "hasResumeDB": true,
        "durationMonths": 12,
        "currency": "INR",
        "tax": [
          { "type": "CGST", "rate": 9, "amount": 8099.91 },
          { "type": "SGST", "rate": 9, "amount": 8099.91 }
        ],
        "totalPrice": 106198.82
      }
    }
  }
}
```

---

### 10.2 Step 1: Create Subscription Purchase Order
Creates an order with Stripe or Razorpay and records a `pending` transaction.

- **Method / URL**: `POST /api/v1/subscriptions`
- **Auth**: `Bearer <token>` (Requires `employer` and `manage_billing` permission)

#### Request Body
```json
{
  "companyId": "66b44a20e7b231123a8b4588",
  "planId": "growth"
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `planId` | `string` | **Yes** | Identifier of the selected plan (`"growth"`, `"enterprise"`, etc.) |
| `companyId` | `string` | No | Optional if user only belongs to one company |

#### Response `(201 Created)`
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Subscription order created successfully",
  "data": {
    "order": {
      "orderId": "order_razorpay_992381283",
      "clientSecret": null,
      "amount": 11798.82,
      "currency": "INR"
    },
    "transactionId": "66b44b00e7b231123a8b4788",
    "plan": {
      "id": "growth",
      "name": "Growth Recruiter",
      "basePrice": 9999,
      "taxAmount": 1799.82,
      "totalAmount": 11798.82,
      "currency": "INR",
      "taxBreakdown": [
        { "type": "CGST", "rate": 9, "amount": 899.91 },
        { "type": "SGST", "rate": 9, "amount": 899.91 }
      ]
    }
  }
}
```

---

### 10.3 Step 2: Cryptographic Payment Verification & Activation
Submit client checkout tokens from Razorpay or Stripe to cryptographically verify payment authenticity, activate subscription quotas, and finalize the invoice.

- **Method / URL**: `POST /api/v1/subscriptions/verify`
- **Auth**: `Bearer <token>`

#### Request Body (Razorpay Example)
```json
{
  "companyId": "66b44a20e7b231123a8b4588",
  "paymentProvider": "razorpay",
  "razorpay_order_id": "order_razorpay_992381283",
  "razorpay_payment_id": "pay_9876543210",
  "razorpay_signature": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

#### Request Body (Stripe Example)
```json
{
  "companyId": "66b44a20e7b231123a8b4588",
  "paymentProvider": "stripe",
  "paymentIntentId": "pi_3Mtwx2_secret_xyz"
}
```

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payment verified and subscription activated successfully",
  "data": {
    "subscription": {
      "_id": "66b44af0e7b231123a8b4755",
      "company": "66b44a20e7b231123a8b4588",
      "plan": "growth",
      "status": "active",
      "jobPostQuota": 5,
      "jobPostsUsed": 0,
      "resumeSearchQuota": 500,
      "resumeSearchesUsed": 0,
      "hasResumeDBAccess": true,
      "currentPeriodStart": "2026-09-12T11:30:00.000Z",
      "currentPeriodEnd": "2026-10-12T11:30:00.000Z"
    },
    "transaction": {
      "_id": "66b44b00e7b231123a8b4788",
      "invoiceNumber": "INV-202609-0001",
      "status": "succeeded",
      "amount": 11798.82,
      "currency": "INR",
      "externalPaymentId": "pay_9876543210"
    }
  }
}
```

---

### 10.4 Get Current Subscription & Quota Progress
Fetches the company's active subscription status, remaining validity in days, and real-time quota progress for job postings and candidate resume searches.

- **Method / URL**: `GET /api/v1/subscriptions/current?companyId=66b44a20e7b231123a8b4588`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Current subscription retrieved successfully",
  "data": {
    "active": true,
    "status": "active",
    "daysRemaining": 30,
    "subscription": {
      "_id": "66b44af0e7b231123a8b4755",
      "plan": "growth",
      "status": "active",
      "currentPeriodEnd": "2026-10-12T11:30:00.000Z"
    },
    "plan": {
      "name": "Growth Recruiter",
      "jobQuota": 5,
      "resumeQuota": 500
    },
    "quotas": {
      "jobs": {
        "total": 5,
        "used": 1,
        "remaining": 4,
        "percentageUsed": 20
      },
      "resumes": {
        "total": 500,
        "used": 42,
        "remaining": 458,
        "percentageUsed": 8
      },
      "hasResumeDBAccess": true
    }
  }
}
```

---

### 10.5 Cancel Active Subscription
Cancels recurring renewal. Quotas remain accessible until `currentPeriodEnd`.

- **Method / URL**: `DELETE /api/v1/subscriptions`
- **Auth**: `Bearer <token>`

#### Request Body
```json
{
  "companyId": "66b44a20e7b231123a8b4588",
  "reason": "Team hiring freeze for next quarter"
}
```

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscription cancelled successfully",
  "data": {
    "_id": "66b44af0e7b231123a8b4755",
    "status": "cancelled",
    "cancelledAt": "2026-09-12T11:35:00.000Z",
    "cancelReason": "Team hiring freeze for next quarter"
  }
}
```

---

### 10.6 Company Billing History & Transactions
- **Method / URL**: `GET /api/v1/subscriptions/transactions?companyId=66b44a20e7b231123a8b4588&page=1&limit=20`
- **Auth**: `Bearer <token>`

#### Query Parameters
| Param | Type | Description |
| :--- | :--- | :--- |
| `companyId` | `string` | Optional company ID |
| `status` | `string` | `pending`, `succeeded`, `failed`, `refunded` |
| `type` | `string` | `subscription`, `job_boost`, `refund` |
| `startDate` | `string` | ISO start date |
| `endDate` | `string` | ISO end date |
| `page` | `number` | Page number |
| `limit` | `number` | Limit per page |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Company transaction history retrieved",
  "data": [
    {
      "_id": "66b44b00e7b231123a8b4788",
      "invoiceNumber": "INV-202609-0001",
      "type": "subscription",
      "amount": 11798.82,
      "currency": "INR",
      "status": "succeeded",
      "paymentProvider": "razorpay",
      "externalPaymentId": "pay_9876543210",
      "description": "Subscription Order: Growth Recruiter",
      "taxAmount": 1799.82,
      "createdAt": "2026-09-12T11:30:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalDocs": 1,
      "limit": 20,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 10.7 Download B2B Tax Invoice
Retrieves structured B2B tax invoice breakdown including official seller details (GSTIN/CIN/EIN), buyer billing details, SAC codes, and line items.

- **Method / URL**: `GET /api/v1/subscriptions/transactions/:id/invoice`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Transaction tax invoice retrieved successfully",
  "data": {
    "invoiceNumber": "INV-202609-0001",
    "date": "2026-09-12T11:30:00.000Z",
    "status": "succeeded",
    "currency": "INR",
    "paymentProvider": "razorpay",
    "externalPaymentId": "pay_9876543210",
    "seller": {
      "legalEntity": "Hire Engine India Private Limited",
      "address": "Wirpo Circle, Hinjewadi, Pune, Maharashtra 411057, India",
      "state": "MH",
      "gstin": "06AAACH7409R1ZZ",
      "pan": "AAACH7409R",
      "sacCode": "998311"
    },
    "buyer": {
      "companyName": "CloudScale India Pvt Ltd",
      "address": "Outer Ring Road, Bellandur, Bengaluru, Karnataka, 560103",
      "state": "Karnataka",
      "gstin": "29AAAAA0000A1Z5",
      "pan": "AAAAA0000A"
    },
    "lineItems": [
      {
        "description": "Growth Recruiter - 1 Month Subscription",
        "sacCode": "998311",
        "baseAmount": 9999,
        "taxAmount": 1799.82,
        "totalAmount": 11798.82
      }
    ],
    "subtotal": 9999,
    "taxTotal": 1799.82,
    "grandTotal": 11798.82,
    "taxBreakdown": [
      { "type": "CGST", "rate": 9, "amount": 899.91 },
      { "type": "SGST", "rate": 9, "amount": 899.91 }
    ]
  }
}
```

---

### 10.8 Payment Webhook Integration
Endpoint for asynchronous webhook handling from payment gateways.

- **Method / URL**: `POST /api/v1/subscriptions/webhooks/:provider`
- **Provider Parameter**: `stripe` or `razorpay`
- **Auth**: Cryptographic signature verified from header (`stripe-signature` or `x-razorpay-signature`)

---

## 11. Recruitment Analytics & ROI Reporting

### 11.1 Company Overview ROI Dashboard
Aggregated hiring metrics across all jobs posted by the employer.

- **Method / URL**: `GET /api/v1/analytics/company/overview`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Company recruitment metrics overview retrieved",
  "data": {
    "companyId": "66b44a20e7b231123a8b4588",
    "name": "CloudScale Technologies Inc.",
    "totalApplications": 142,
    "jobStats": [
      {
        "_id": "active",
        "count": 4,
        "totalViews": 1840,
        "totalClicks": 720
      },
      {
        "_id": "closed",
        "count": 2,
        "totalViews": 950,
        "totalClicks": 380
      }
    ]
  }
}
```

---

### 11.2 Job Funnel & Conversion Analytics
View impressions, clicks, conversion rates, and budget spend for a specific job posting.

- **Method / URL**: `GET /api/v1/analytics/jobs/:jobId`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job performance analytics retrieved",
  "data": {
    "jobId": "66b44a50e7b231123a8b4610",
    "title": "Senior Full Stack Engineer (React / Node.js)",
    "views": 432,
    "clicks": 189,
    "applications": 38,
    "conversionRate": "8.80%",
    "clickThroughRate": "43.75%",
    "isSponsored": true,
    "sponsorBudget": {
      "dailyBudget": 25,
      "totalBudget": 250,
      "spent": 50,
      "currency": "USD",
      "startDate": "2026-09-12T10:30:00.000Z",
      "endDate": "2026-09-22T10:30:00.000Z"
    }
  }
}
```

---

### 11.3 Applicant Demographics & Skill Distribution
Breakdown of applicant locations and candidate top skills for a job posting.

- **Method / URL**: `GET /api/v1/analytics/jobs/:jobId/demographics`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Applicant demographics breakdown retrieved",
  "data": {
    "totalApplicants": 38,
    "locationBreakdown": {
      "San Francisco": 18,
      "New York": 8,
      "Austin": 6,
      "Remote": 6
    },
    "topSkills": {
      "React": 36,
      "Node.js": 34,
      "TypeScript": 30,
      "Docker": 24,
      "AWS": 22,
      "MongoDB": 19
    }
  }
}
```

---

## 12. Recruiter Notifications

### 12.1 List Recruiter Notifications
- **Method / URL**: `GET /api/v1/notifications?page=1&limit=20`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Notifications retrieved",
  "data": [
    {
      "_id": "66b44b10e7b231123a8b4811",
      "user": "66b44a10e7b231123a8b4567",
      "type": "application_received",
      "title": "New Job Application Received",
      "message": "Michael Chen has applied for Senior Full Stack Engineer (React / Node.js).",
      "relatedModel": "Application",
      "relatedId": "66b44a60e7b231123a8b4633",
      "actionUrl": "/employer/applications/66b44a60e7b231123a8b4633",
      "isRead": false,
      "createdAt": "2026-09-12T09:15:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalDocs": 1,
      "limit": 20,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 12.2 Mark Single Notification Read
- **Method / URL**: `PATCH /api/v1/notifications/:id/read`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Notification marked as read",
  "data": {
    "_id": "66b44b10e7b231123a8b4811",
    "isRead": true
  }
}
```

---

### 12.3 Mark All Notifications Read
- **Method / URL**: `PATCH /api/v1/notifications/read-all`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "All notifications marked as read",
  "data": null
}
```

---

## 13. Global Country Plugins & System Info

### 13.1 List Supported Countries & Metadata
Returns active country plugins, currency, locale, and payment provider configs.

- **Method / URL**: `GET /api/v1/countries`
- **Auth**: None (Public)

#### Response `(200 OK)`
```json
{
  "success": true,
  "data": [
    {
      "code": "IN",
      "name": "India",
      "currency": "INR",
      "locale": "en-IN",
      "paymentProvider": "razorpay"
    },
    {
      "code": "US",
      "name": "United States",
      "currency": "USD",
      "locale": "en-US",
      "paymentProvider": "stripe"
    }
  ]
}
```

---

### 13.2 API Health Check
- **Method / URL**: `GET /api/v1/health`
- **Auth**: None (Public)

#### Response `(200 OK)`
```json
{
  "status": "UP",
  "timestamp": "2026-09-12T10:00:00.000Z",
  "uptime": 86400
}
```

---

## 14. Frontend TypeScript Interfaces & Enums

Add these type definitions directly to your frontend project (e.g. `src/types/api.ts`):

```typescript
// ── Common Response Wrapper ──────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalDocs: number;
      limit: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
    type: string;
  }>;
}

// ── Enums ────────────────────────────────────────────────────────
export enum UserRole {
  JOB_SEEKER = 'jobseeker',
  EMPLOYER = 'employer',
  ADMIN = 'admin',
}

export enum JobStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
  EXPIRED = 'expired',
}

export enum EmploymentType {
  FULL_TIME = 'full-time',
  PART_TIME = 'part-time',
  CONTRACT = 'contract',
  INTERNSHIP = 'internship',
}

export enum WorkplaceType {
  REMOTE = 'remote',
  HYBRID = 'hybrid',
  ONSITE = 'onsite',
}

export enum ApplicationStatus {
  SUBMITTED = 'submitted',
  VIEWED = 'viewed',
  SCREENING = 'screening',
  INTERVIEW = 'interview',
  OFFER = 'offer',
  HIRED = 'hired',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export enum TeamPermission {
  MANAGE_JOBS = 'manage_jobs',
  VIEW_APPLICATIONS = 'view_applications',
  MANAGE_APPLICATIONS = 'manage_applications',
  MANAGE_TEAM = 'manage_team',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_BILLING = 'manage_billing',
}

export enum ScreeningQuestionType {
  YES_NO = 'yes_no',
  MULTIPLE_CHOICE = 'multiple_choice',
  TEXT = 'text',
  NUMERIC = 'numeric',
}

export enum PaymentProvider {
  STRIPE = 'stripe',
  RAZORPAY = 'razorpay',
}

// ── Recruiter & Company Models ───────────────────────────────────
export interface CompanySummary {
  _id: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  countryCode: string;
  verificationStatus: 'pending' | 'under_review' | 'information_required' | 'approved' | 'rejected';
  isVerified: boolean;
  isOwner: boolean;
  permissions: TeamPermission[];
}

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  headline?: string;
  summary?: string;
  countryCode?: string;
  profileVisibility?: 'public' | 'private' | 'anonymous';
  isEmailVerified: boolean;
  company?: CompanySummary | string;
  createdAt: string;
}

export interface CompanyTeamMember {
  user: User | string;
  role: 'owner' | 'member';
  permissions: TeamPermission[];
  joinedAt: string;
}

export interface Company {
  _id: string;
  name: string;
  owner: string;
  phone: string;
  contactName?: string;
  isPhoneVerified: boolean;
  verifiedPhone: boolean;
  reviewDeadlineAt?: string | null;
  infoRequestedAt?: string | null;
  infoRequestedNotes?: string;
  logoUrl?: string;
  website?: string;
  industry?: string;
  size?: string;
  description?: string;
  countryCode: string;
  verificationStatus: 'pending' | 'under_review' | 'information_required' | 'approved' | 'rejected';
  verificationNotes?: string;
  address?: {
    street?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  teamMembers: CompanyTeamMember[];
  createdAt: string;
}

export interface CompanyInvitation {
  _id: string;
  company: string | { _id: string; name: string; logoUrl?: string };
  email: string;
  permissions: TeamPermission[];
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  token: string;
  expiresAt: string;
  createdAt: string;
}

// ── Job Postings ─────────────────────────────────────────────────
export interface ScreeningQuestion {
  question: string;
  type: ScreeningQuestionType;
  required: boolean;
  options?: string[];
  idealAnswer?: string;
}

export interface SalaryRange {
  min?: number;
  max?: number;
  currency: string;
  period: 'hourly' | 'monthly' | 'annually';
  isVisible: boolean;
}

export interface Job {
  _id: string;
  company: Company | string;
  postedBy: User | string;
  title: string;
  description: string;
  responsibilities?: string;
  qualifications?: string;
  skills: string[];
  category?: string;
  salaryRange?: SalaryRange;
  employmentType: EmploymentType;
  workplaceType: WorkplaceType;
  location: {
    address?: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
    coordinates?: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
  screeningQuestions?: ScreeningQuestion[];
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  experienceYears?: { min?: number; max?: number };
  education?: string;
  benefits?: string[];
  applicationDeadline?: string;
  status: JobStatus;
  viewCount: number;
  clickCount: number;
  applicationCount: number;
  isSponsored: boolean;
  sponsorBudget?: {
    dailyBudget: number;
    totalBudget: number;
    spent: number;
    currency: string;
    startDate: string;
    endDate: string;
  };
  createdAt: string;
}

// ── ATS Application ──────────────────────────────────────────────
export interface Application {
  _id: string;
  job: Job | string;
  applicant: User;
  resume: {
    _id: string;
    title: string;
    fileUrl: string;
    fileType: string;
    parsedData?: any;
  };
  coverLetter?: string;
  status: ApplicationStatus;
  pipelineStage: string;
  rating?: number | null;
  isEasyApply: boolean;
  screeningAnswers: Array<{
    questionIndex: number;
    question: string;
    answer: string;
  }>;
  statusHistory?: Array<{
    status: ApplicationStatus;
    changedAt: string;
    note?: string;
  }>;
  appliedAt: string;
}

export interface CandidateFitScorecard {
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  overallMatchScore: number;
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  keyStrengths: string[];
  areasForImprovement: string[];
  recommendation: string;
}

// ── Pipeline ─────────────────────────────────────────────────────
export interface PipelineStage {
  name: string;
  order: number;
  color?: string;
  description?: string;
}

export interface Pipeline {
  _id: string;
  company: string;
  name: string;
  stages: PipelineStage[];
  isDefault: boolean;
}

// ── Candidate Notes & Ratings ────────────────────────────────────
export interface CandidateNote {
  _id: string;
  application: string;
  author: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | string;
  content: string;
  rating?: number | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Subscriptions & Invoicing ─────────────────────────────────────
export interface TaxBreakdown {
  type: string;
  rate: number;
  amount: number;
}

export interface SubscriptionPlanItem {
  id: string;
  name: string;
  description: string;
  price: number;
  jobQuota: number;
  resumeQuota: number;
  hasResumeDB: boolean;
  durationMonths: number;
  currency: string;
  tax: TaxBreakdown[];
  totalPrice: number;
}

export interface SubscriptionOrderResponse {
  order: {
    orderId: string;
    clientSecret?: string | null;
    amount: number;
    currency: string;
  };
  transactionId: string;
  plan: {
    id: string;
    name: string;
    basePrice: number;
    taxAmount: number;
    totalAmount: number;
    currency: string;
    taxBreakdown: TaxBreakdown[];
  };
}

export interface CurrentSubscriptionResponse {
  active: boolean;
  status: string;
  daysRemaining: number;
  subscription: {
    _id: string;
    plan: string;
    status: string;
    currentPeriodEnd: string;
  } | null;
  plan: {
    name: string;
    jobQuota: number;
    resumeQuota: number;
  } | null;
  quotas: {
    jobs: {
      total: number | 'unlimited';
      used: number;
      remaining: number | 'unlimited';
      percentageUsed: number;
    };
    resumes: {
      total: number | 'unlimited';
      used: number;
      remaining: number | 'unlimited';
      percentageUsed: number;
    };
    hasResumeDBAccess: boolean;
  };
}

export interface B2BInvoice {
  invoiceNumber: string;
  date: string;
  status: string;
  currency: string;
  paymentProvider: string;
  externalPaymentId: string;
  seller: {
    legalEntity: string;
    address: string;
    state: string;
    gstin?: string;
    pan?: string;
    ein?: string;
    sacCode?: string;
  };
  buyer: {
    companyName: string;
    address: string;
    state?: string;
    gstin?: string;
    pan?: string;
  };
  lineItems: Array<{
    description: string;
    sacCode?: string;
    baseAmount: number;
    taxAmount: number;
    totalAmount: number;
  }>;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  taxBreakdown: TaxBreakdown[];
}
```

---

## 15. Frontend Integration Best Practices (Axios Client Setup)

Here is a production-ready Axios client with automated **JWT Bearer attachment**, **automatic 401 token refresh retry queue**, and **country header handling**:

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Request Interceptor: Attach Access Token & Country Context Header
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const countryCode = localStorage.getItem('countryCode') || 'US';
  if (config.headers) {
    config.headers['X-Country-Code'] = countryCode;
  }

  return config;
});

// 2. Response Interceptor: Auto Refresh Token on 401 Unauthorized
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const newAccessToken = data.data.accessToken;
        const newRefreshToken = data.data.refreshToken;

        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

### Complete Feature Integration Snippets

```typescript
import { apiClient } from './apiClient';

// ── 1. Company Registration & Compliance Verification ───────

// Check domain match during registration
const { data: domainCheck } = await apiClient.get('/companies/lookup/domain', {
  params: { domain: 'techcorp.io' },
});

// Register new company
const { data: companyRes } = await apiClient.post('/companies', {
  name: 'CloudScale Technologies Inc.',
  countryCode: 'US',
  phone: '+14155550199',
  website: 'https://techcorp.io',
  industry: 'Software',
  size: '51-200',
  registrationDetails: {
    einNumber: '12-3456789',
  },
});

const companyId = companyRes.data._id;

// Send OTP to company phone
await apiClient.post('/companies/phone/send-otp', {
  phone: '+14155550199',
});

// Verify phone OTP
await apiClient.post(`/companies/${companyId}/phone/verify-otp`, {
  phone: '+14155550199',
  otp: '492810',
});

// Upload verification document
const formData = new FormData();
formData.append('type', 'ein_letter');
formData.append('label', 'IRS EIN Confirmation Letter');
formData.append('document', fileBlob, 'ein_letter.pdf');

await apiClient.post(`/companies/${companyId}/documents`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

// ── 2. Subscriptions & Billing Flow ─────────────────────────

// Fetch localized pricing plans
const { data: plansRes } = await apiClient.get('/subscriptions/plans', {
  params: { countryCode: 'US' },
});

// Step 1: Create purchase order
const { data: orderRes } = await apiClient.post('/subscriptions', {
  companyId,
  planId: 'growth',
});

// Step 2: After Stripe Elements / Razorpay Checkout succeeds, verify & activate:
const { data: activationRes } = await apiClient.post('/subscriptions/verify', {
  companyId,
  paymentProvider: 'stripe',
  paymentIntentId: 'pi_3Mtwx2_secret_xyz',
});

// Fetch active subscription & real-time quota progress
const { data: subStatus } = await apiClient.get('/subscriptions/current', {
  params: { companyId },
});

// ── 3. Jobs & ATS Application Flow ──────────────────────────

// Create job posting (Requires active subscription)
const { data: newJob } = await apiClient.post('/jobs', {
  companyId,
  title: 'Senior Full Stack Engineer',
  description: 'Full stack development with React, Node.js and TypeScript...',
  skills: ['React', 'Node.js', 'TypeScript'],
  employmentType: 'full-time',
  workplaceType: 'hybrid',
  location: {
    city: 'San Francisco',
    country: 'United States',
  },
  publishNow: false, // Save as draft first
});

// Publish job (when company verification is approved)
await apiClient.patch(`/jobs/${newJob.data._id}/status`, {
  status: 'active',
});

// Fetch applications for job
const { data: applications } = await apiClient.get(`/applications/jobs/${newJob.data._id}/applications`, {
  params: { page: 1, limit: 20 },
});

// Inspect single application with ATS notes
const { data: appDetails } = await apiClient.get(`/applications/${applicationId}`);

// Move applicant to interview stage with note
await apiClient.patch(`/applications/${applicationId}/status`, {
  status: 'interview',
  pipelineStage: 'Technical Interview',
  note: 'Candidate scored 92% on AI fit analysis. Scheduled for interview.',
});

// Add internal rating
await apiClient.post(`/applications/${applicationId}/rate`, {
  rating: 5,
});
```

---

## 🎯 Summary Checklist for Frontend Developers

When implementing the Recruiter & Employer portal:
- ✅ **Auth Flow**: Register with corporate email (`role: 'employer'`), login, store `accessToken` and `refreshToken`.
- ✅ **Onboarding Flow**: Check `user.company`. If null, check `GET /companies/lookup/domain`. Route to company creation (`POST /companies`) with mandatory `countryCode` and `phone`.
- ✅ **Phone & Doc Compliance**: Call `POST /companies/phone/send-otp` (with Bearer token) and verify with `/phone/verify-otp`. Upload compliance documents (`/documents`).
- ✅ **Billing Flow**: Load localized plans (`GET /subscriptions/plans`), call Step 1 (`POST /subscriptions`) to get order/clientSecret, complete gateway modal, then call Step 2 (`POST /subscriptions/verify`) to activate quotas.
- ✅ **Jobs Flow**: Ensure company has an active subscription before posting jobs (`POST /jobs`). Draft jobs anytime; publish (`PATCH /jobs/:id/status` with `status: 'active'`) once company profile is approved.
- ✅ **ATS Flow**: View job applicants (`GET /applications/jobs/:jobId/applications`), view detailed application (`GET /applications/:id`), generate AI fit scorecard (`/fit`), advance hiring stages with internal notes.
- ✅ **Talent Search**: Sourcing candidates via Boolean and hybrid semantic search (`GET /search/resumes`), AI similarity matching, and candidate alerts.
