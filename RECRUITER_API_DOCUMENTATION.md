# 💼 Hire Engine — Recruiter & Employer API Documentation

> **Complete Frontend Developer Integration Guide**  
> *Everything required to implement the Recruiter Portal / Employer Dashboard.*

---

## 📑 Table of Contents

1. [Architecture & Request Standards](#1-architecture--request-standards)
   - [Base URL & Environments](#11-base-url--environments)
   - [Authentication & JWT Headers](#12-authentication--jwt-headers)
   - [Multi-Country Context Headers](#13-multi-country-context-headers)
   - [Standard API Response Format](#14-standard-api-response-format)
   - [Standard API Error Format & Status Codes](#15-standard-api-error-format--status-codes)
   - [Pagination & Sorting Standards](#16-pagination--sorting-standards)
2. [Recruiter Authentication & Identity](#2-recruiter-authentication--identity)
   - `POST /api/v1/auth/register` (Register Recruiter)
   - `POST /api/v1/auth/login` (Login)
   - `POST /api/v1/auth/refresh-token` (Refresh Access Token)
   - `POST /api/v1/auth/logout` (Logout)
   - `POST /api/v1/auth/forgot-password` (Forgot Password)
   - `POST /api/v1/auth/reset-password` (Reset Password)
   - `POST /api/v1/auth/verify-email` (Verify Email)
   - `POST /api/v1/auth/send-otp` (Send SMS OTP)
   - `POST /api/v1/auth/verify-otp` (Verify SMS OTP)
   - `GET /api/v1/auth/google` & `GET /api/v1/auth/linkedin` (Social OAuth)
3. [Recruiter Profile Management](#3-recruiter-profile-management)
   - `GET /api/v1/users/me` (Get Current Profile)
   - `PATCH /api/v1/users/me` (Update Profile Details)
   - `DELETE /api/v1/users/me` (GDPR Account Deletion)
4. [Company Profile & Team Management](#4-company-profile--team-management)
   - `POST /api/v1/companies` (Register Company with Country Plugin Validation)
   - `GET /api/v1/companies/:id` (Get Company Details)
   - `PATCH /api/v1/companies/:id` (Update Company Profile)
   - `POST /api/v1/companies/:id/team` (Add Recruiter / Team Member)
   - `PATCH /api/v1/companies/:id/team/:userId` (Update Team Member Permissions)
   - `DELETE /api/v1/companies/:id/team/:userId` (Remove Team Member)
   - `POST /api/v1/companies/:id/documents` (Upload Verification Document)
   - `GET /api/v1/companies/:id/documents` (Get Company Documents & Verification Checklist)
   - `POST /api/v1/companies/phone/send-otp` (Send OTP to Company Business Phone)
   - `POST /api/v1/companies/:id/phone/verify-otp` (Verify Company Phone OTP)
   - [Employer Verification Lifecycle & Job Publishing Gate](#411-employer-verification-lifecycle--job-publishing-gate)
5. [Job Postings Lifecycle Management](#5-job-postings-lifecycle-management)
   - `POST /api/v1/jobs` (Create Job Posting)
   - `GET /api/v1/jobs/employer/my-jobs` (List Recruiter's Jobs)
   - `GET /api/v1/jobs/:id` (Get Single Job Details)
   - `PATCH /api/v1/jobs/:id` (Update Job Details)
   - `PATCH /api/v1/jobs/:id/status` (Publish / Pause / Close Job)
   - `POST /api/v1/jobs/:id/promote` (Sponsor / Boost Job)
6. [Applicant Tracking System (ATS) & Candidate Pipeline](#6-applicant-tracking-system-ats--candidate-pipeline)
   - `GET /api/v1/applications/jobs/:jobId/applications` (List Job Applicants)
   - `GET /api/v1/applications/:id/fit` (AI Candidate Fit Score & Scorecard)
   - `PATCH /api/v1/applications/:id/status` (Update Stage & Status)
   - `POST /api/v1/applications/:id/notes` (Add Recruiter Note & Rating)
   - `GET /api/v1/applications/:id/notes` (List Candidate Application Notes)
   - `PUT /api/v1/applications/:id/notes/:noteId` (Update Recruiter Note)
   - `DELETE /api/v1/applications/:id/notes/:noteId` (Delete Recruiter Note)
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
   - `GET /api/v1/pipelines` (List Company Pipelines)
   - `PATCH /api/v1/pipelines/:id` (Update Pipeline & Stages)
   - `DELETE /api/v1/pipelines/:id` (Delete Pipeline)
10. [Subscriptions, Pricing Plans & Invoicing](#10-subscriptions-pricing-plans--invoicing)
    - `GET /api/v1/subscriptions/plans` (Get Available Plans & Localized Pricing)
    - `POST /api/v1/subscriptions` (Subscribe Company to Plan)
    - `DELETE /api/v1/subscriptions` (Cancel Active Subscription)
    - `GET /api/v1/subscriptions/transactions` (Billing History & Invoices)
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
- **Refresh Token Lifetime**: 7 days (stored in secure `localStorage` or `HttpOnly` cookie)
- **Role Requirement**: Most recruiter endpoints require the user to have role `'employer'` or `'admin'`.

### 1.3 Multi-Country Context Headers

For multi-country compliance, tax calculation, and business verification rules, provide the country ISO alpha-2 code:

```http
X-Country-Code: IN
```
*(Defaults to `US` if omitted. Supported values: `IN`, `US`, etc.)*

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

### 1.5 Standard API Error Format & Status Codes

Errors return standard JSON containing error details:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "\"title\" is required",
      "type": "validation"
    }
  ]
}
```

#### Common HTTP Status Codes:
- `200 OK`: Request succeeded.
- `201 Created`: Resource created successfully.
- `204 No Content`: Resource deleted or action executed with no return body.
- `400 Bad Request`: Validation failure or malformed payload.
- `401 Unauthorized`: Missing, expired, or invalid Bearer token.
- `403 Forbidden`: Insufficient role or lack of company team permissions.
- `404 Not Found`: Resource ID does not exist.
- `409 Conflict`: Unique constraint violation (e.g. duplicate email, already applied).
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Server error.

### 1.6 Pagination & Sorting Standards

All list endpoints accept the following query parameters:
- `page`: Page number (integer >= 1, default `1`).
- `limit`: Items per page (integer 1-100, default `20`).
- `sort`: Sorting field name prefix with `-` for descending (e.g. `-createdAt`, `rating`).

---

## 2. Recruiter Authentication & Identity

### 2.1 Recruiter Registration
Create a new employer account.

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

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `firstName` | `string` | **Yes** | 1-50 characters |
| `lastName` | `string` | **Yes** | 1-50 characters |
| `email` | `string` | **Yes** | Valid corporate or personal email |
| `password` | `string` | **Yes** | Min 8 characters |
| `confirmPassword`| `string` | **Yes** | Must match `password` |
| `role` | `string` | **Yes** | Must be `"employer"` for recruiter accounts |
| `countryCode` | `string` | No | ISO 2-letter country code (e.g. `"US"`, `"IN"`) |

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
      "status": "active",
      "isEmailVerified": false,
      "countryCode": "US",
      "createdAt": "2026-08-21T10:00:00.000Z"
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
Authenticate recruiter and obtain JWT tokens.

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
      "countryCode": "US"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

### 2.3 Refresh Access Token
Obtain a fresh access token when the current 15-minute token expires.

- **Method / URL**: `POST /api/v1/auth/refresh-token`
- **Auth**: None

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
Invalidate current session on client.

- **Method / URL**: `POST /api/v1/auth/logout`
- **Auth**: Optional / Discard tokens on frontend

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

### 2.5 Password Recovery & Reset

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

### 2.6 Verify Email Address
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

### 2.7 SMS OTP Authentication

#### Step 1: Send OTP to Phone
- **Method / URL**: `POST /api/v1/auth/send-otp`
- **Request Body**:
```json
{
  "mobile": "+14155552671"
}
```
- **Response `(200 OK)`**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP sent successfully to +14155552671",
  "data": {
    "mobile": "+14155552671",
    "expiresIn": "5 minutes"
  }
}
```

#### Step 2: Verify OTP
- **Method / URL**: `POST /api/v1/auth/verify-otp`
- **Request Body**:
```json
{
  "mobile": "+14155552671",
  "otp": "492810"
}
```
- **Response `(200 OK)`**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Mobile number verified successfully",
  "data": {
    "isVerified": true
  }
}
```

---

### 2.8 Social OAuth (Google & LinkedIn)
To initiate OAuth redirect the browser to:
- Google: `GET /api/v1/auth/google`
- LinkedIn: `GET /api/v1/auth/linkedin`

Callbacks return redirect with access and refresh tokens.

---

## 3. Recruiter Profile Management

### 3.1 Get Recruiter Profile
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
    "mobile": "+14155552671",
    "avatar": "https://storage.hireengine.com/avatars/user-66b44a.jpg",
    "headline": "Head of Technical Talent Acquisition",
    "countryCode": "US",
    "status": "active",
    "isEmailVerified": true,
    "createdAt": "2026-08-21T10:00:00.000Z"
  }
}
```

---

### 3.2 Update Recruiter Profile
- **Method / URL**: `PATCH /api/v1/users/me`
- **Auth**: `Bearer <token>`

#### Request Body
```json
{
  "firstName": "Sarah",
  "lastName": "Jenkins-Smith",
  "mobile": "+14155559999",
  "headline": "VP of Talent Acquisition",
  "avatar": "https://storage.hireengine.com/avatars/user-66b44a-new.jpg"
}
```

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
    "mobile": "+14155559999",
    "headline": "VP of Talent Acquisition"
  }
}
```

---

## 4. Company Profile & Team Management

### 4.1 Register Company Profile
Registers the employer's company. Validates legal business registration fields, corporate contact phone, and duplicate business identifiers using the active Country Plugin.

- **Method / URL**: `POST /api/v1/companies`
- **Auth**: `Bearer <token>` (User must have verified their email address; `isEmailVerified: true`)
- **Header**: `X-Country-Code: US` or `X-Country-Code: IN`

#### Pre-requisites & Business Rules
1. **Email Verification Gate**: The user account must be verified before registering a company. If unverified, returns `403 Forbidden` (`"Please verify your email address before registering a company"`).
2. **Single Ownership**: A user account may only own one registered company profile.
3. **Duplicate Prevention**:
   - Company name is checked case-insensitively across all registered companies.
   - Country Plugin enforces uniqueness on official tax/incorporation identifiers (`gstNumber`, `panNumber`, `cinNumber` for India; `einNumber` for US).
4. **Corporate Phone Verification**:
   - Phone format is strictly validated according to the country plugin (e.g. 10-digit Indian mobile `[6-9]XXXXXXXXX` or US 10-digit phone).
   - In India, providing a business phone is mandatory.
   - Employers can pass `phoneOtp` during registration if they previously triggered `POST /api/v1/companies/phone/send-otp` to verify immediately.
5. **Review SLA Target**:
   - Automatically computes `reviewDeadlineAt` based on the country plugin SLA (e.g., 48 hours for India, 24 hours for US).

#### Request Body (US Company Example)
```json
{
  "name": "CloudScale Technologies Inc.",
  "website": "https://cloudscale.io",
  "industry": "Software & Internet",
  "size": "51-200",
  "description": "Leading cloud infrastructure and developer automation platform.",
  "countryCode": "US",
  "phone": "+14155550199",
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
    "businessType": "corporation",
    "registeredAddress": {
      "street": "1209 North Orange Street",
      "city": "Wilmington",
      "state": "DE",
      "zipCode": "19801"
    }
  }
}
```

#### Request Body (India Company Example with Instant Phone OTP Verification)
```json
{
  "name": "CloudScale India Pvt Ltd",
  "website": "https://cloudscale.in",
  "industry": "Software & Internet",
  "size": "51-200",
  "description": "India development center for CloudScale.",
  "countryCode": "IN",
  "phone": "+919876543210",
  "phoneOtp": "492810",
  "contactName": "Rajesh Sharma",
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
    "cinNumber": "U72200KA2020PTC123456",
    "registeredAddress": {
      "street": "100ft Road, Indiranagar",
      "city": "Bengaluru",
      "state": "Karnataka",
      "pincode": "560038"
    }
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
    "verificationStatus": "pending",
    "phone": "+919876543210",
    "contactName": "Rajesh Sharma",
    "isPhoneVerified": true,
    "verifiedPhone": true,
    "reviewDeadlineAt": "2026-09-06T10:05:00.000Z",
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
        "joinedAt": "2026-09-04T10:05:00.000Z"
      }
    ],
    "createdAt": "2026-09-04T10:05:00.000Z"
  }
}
```

---

### 4.2 Get Company Profile
- **Method / URL**: `GET /api/v1/companies/:id`
- **Auth**: None (Public) or Bearer

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
    "description": "Leading cloud infrastructure and developer automation platform.",
    "countryCode": "US",
    "verificationStatus": "approved",
    "address": {
      "city": "San Francisco",
      "state": "CA",
      "country": "United States"
    }
  }
}
```

---

### 4.3 Update Company Profile
- **Method / URL**: `PATCH /api/v1/companies/:id`
- **Auth**: `Bearer <token>` (Requires `employer` / team admin)

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

### 4.4 Add Sub-Account Team Member (Recruiter / Hiring Manager)
- **Method / URL**: `POST /api/v1/companies/:id/team`
- **Auth**: `Bearer <token>` (Company Owner only)

#### Available Team Permissions:
- `manage_jobs`: Create, update, pause, and close job postings.
- `view_applications`: View candidate applications & resumes.
- `manage_applications`: Change stages, rate candidates, add notes.
- `manage_team`: Invite and remove team members.
- `view_analytics`: Access company and job performance analytics.
- `manage_billing`: Manage subscription plans and view invoices.

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
        "permissions": ["manage_jobs", "view_applications", "manage_applications", "manage_team", "view_analytics", "manage_billing"]
      },
      {
        "user": {
          "_id": "66b44a30e7b231123a8b4599",
          "firstName": "Alex",
          "lastName": "Wong",
          "email": "alex.recruiter@techcorp.io"
        },
        "role": "member",
        "permissions": ["manage_jobs", "view_applications", "manage_applications", "view_analytics"],
        "joinedAt": "2026-08-21T10:15:00.000Z"
      }
    ]
  }
}
```

---

### 4.5 Update Team Member Permissions
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

### 4.6 Remove Team Member
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

### 4.7 Upload Company Verification Document
Uploads a business verification document (e.g., GST Certificate or PAN Card for India; EIN Letter or Articles of Incorporation for US). The document type is dynamically validated against the company's Country Plugin.

- **Method / URL**: `POST /api/v1/companies/:id/documents`
- **Auth**: `Bearer <token>` (Employer / Team member)
- **Content-Type**: `multipart/form-data`

#### Request Form Data

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `document` | `File` | **Yes** | File binary (PDF, Word doc/docx, JPG, PNG). Max 10 MB. |
| `type` | `string` | **Yes** | Country-specific document type (e.g. `gst_certificate`, `pan_card`, `cin_certificate` for IN; `ein_letter`, `articles_of_incorporation`, `w9_form` for US) |
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
      "uploadedAt": "2026-09-03T10:30:00.000Z"
    },
    "documents": [
      {
        "type": "gst_certificate",
        "label": "GST Registration Certificate",
        "fileUrl": "https://res.cloudinary.com/hire-engine/raw/upload/v1/documents/doc_gst_cert_123.pdf",
        "publicId": "doc_gst_cert_123.pdf",
        "uploadedAt": "2026-09-03T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 4.8 Get Company Documents & Verification Checklist
Returns all uploaded documents and an automated verification checklist showing which required documents have been uploaded vs. are still pending, computed directly from the company's Country Plugin.

- **Method / URL**: `GET /api/v1/companies/:id/documents`
- **Auth**: `Bearer <token>` (Employer / Team member)

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
          "uploadedAt": "2026-09-03T10:30:00.000Z"
        }
      },
      {
        "type": "pan_card",
        "label": "Company PAN Card",
        "description": "Upload a copy of your company PAN card",
        "required": true,
        "isUploaded": false,
        "uploadedDocument": null
      },
      {
        "type": "cin_certificate",
        "label": "Certificate of Incorporation (CIN)",
        "description": "Upload your Certificate of Incorporation from MCA",
        "required": false,
        "isUploaded": false,
        "uploadedDocument": null
      }
    ],
    "documents": [
      {
        "type": "gst_certificate",
        "label": "GST Registration Certificate",
        "fileUrl": "https://res.cloudinary.com/hire-engine/raw/upload/v1/documents/doc_gst_cert_123.pdf",
        "publicId": "doc_gst_cert_123.pdf",
        "uploadedAt": "2026-09-03T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 4.9 Send Company Phone Verification OTP
Dispatches a 6-digit one-time password (OTP) via SMS to the specified mobile number. Valid for 5 minutes.

- **Method / URL**: `POST /api/v1/companies/phone/send-otp`
- **Auth**: None / Public or Bearer
- **Rate Limit**: 5 requests per 15 minutes per IP/number

#### Request Body
```json
{
  "phone": "+919876543210"
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `phone` | `string` | **Yes** | Mobile number in international E.164 or national format (e.g. `+919876543210` or `9876543210`) |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP sent successfully to +919876543210",
  "data": {
    "phone": "+919876543210",
    "expiresIn": "5 minutes"
  }
}
```

---

### 4.10 Verify Company Phone OTP
Verifies the SMS OTP and marks the company's phone number as verified (`isPhoneVerified: true`).

- **Method / URL**: `POST /api/v1/companies/:id/phone/verify-otp`
- **Auth**: `Bearer <token>` (Company owner or authorized team member)

#### Request Body
```json
{
  "phone": "+919876543210",
  "otp": "492810"
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `phone` | `string` | **Yes** | Phone number the OTP was issued to |
| `otp` | `string` | **Yes** | 6-digit numeric OTP code |

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

### 4.11 Employer Verification Lifecycle & Job Publishing Gate

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
| `under_review` | Banner: *"Your verification is under detailed compliance review."* | Create draft jobs, manage team. | Our compliance team is verifying your business documents. |
| `information_required` | Warning Banner: *"Action Required: Additional documentation requested by compliance team."* Displays `infoRequestedNotes`. | Upload missing documents via `POST /api/v1/companies/:id/documents`. | Review feedback notes and upload the requested certificates/licenses. |
| `approved` | Success Badge: *"Verified Employer"* | Full platform access: publish live jobs, search talent database, view candidate contact details. | Ready to hire. |
| `rejected` | Alert: *"Verification failed. Reason: [Notes]"* | View account settings; job publishing locked. | Contact compliance support with proof of business ownership. |

> **Job Publishing Protection**:
> When a company is in `pending`, `under_review`, or `information_required` status, calling `POST /api/v1/jobs` with `status: "active"` or updating an existing draft to `"active"` will return `403 Forbidden` (`"Your company profile must be verified before you can publish active job postings"`). You can draft jobs anytime, which can be published with 1 click once approved.

---

## 5. Job Postings Lifecycle Management

### 5.1 Create Detailed Job Posting
Creates a new job listing for the employer's company. Status can start as `"draft"` or `"active"` (active publishing requires an approved company profile).

- **Method / URL**: `POST /api/v1/jobs`
- **Auth**: `Bearer <token>` (Requires role `employer` & `manage_jobs` permission)

#### Request Body
```json
{
  "companyId": "66b44a20e7b231123a8b4588",
  "title": "Senior Full Stack Engineer (React / Node.js)",
  "description": "We are seeking an experienced Full Stack Engineer to lead architecture on our real-time analytics engine...",
  "responsibilities": "• Architect distributed services in Node.js and TypeScript\n• Build high performance UI in React\n• Mentor engineers",
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
    },
    {
      "question": "How many years of microservices architecture experience do you have?",
      "type": "numeric",
      "required": false,
      "idealAnswer": "5"
    }
  ]
}
```

#### Field Specifications:
- `employmentType`: `'full-time'` | `'part-time'` | `'contract'` | `'internship'`
- `workplaceType`: `'remote'` | `'hybrid'` | `'onsite'`
- `experienceLevel`: `'entry'` | `'mid'` | `'senior'` | `'lead'` | `'executive'`
- `screeningQuestions[].type`: `'yes_no'` | `'multiple_choice'` | `'text'` | `'numeric'`

#### Response `(201 Created)`
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Job posting created successfully",
  "data": {
    "_id": "66b44a50e7b231123a8b4610",
    "company": "66b44a20e7b231123a8b4588",
    "creator": "66b44a10e7b231123a8b4567",
    "title": "Senior Full Stack Engineer (React / Node.js)",
    "status": "draft",
    "skills": ["React", "Node.js", "TypeScript", "MongoDB", "Redis", "Docker", "AWS"],
    "viewCount": 0,
    "clickCount": 0,
    "applicationCount": 0,
    "isSponsored": false,
    "createdAt": "2026-08-21T10:20:00.000Z"
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
      "createdAt": "2026-08-21T10:20:00.000Z"
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
- **Auth**: Optional / Public

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
*Note: Transitioning a job from `draft` to `active` automatically triggers background AI vector embedding generation and matches candidate saved-search alerts.*

- **Method / URL**: `PATCH /api/v1/jobs/:id/status`
- **Auth**: `Bearer <token>`

#### Request Body
```json
{
  "status": "active"
}
```
*(Valid status values: `"active"`, `"paused"`, `"closed"`)*

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
      "startDate": "2026-08-21T10:30:00.000Z",
      "endDate": "2026-08-31T10:30:00.000Z"
    }
  }
}
```

---

## 6. Applicant Tracking System (ATS) & Candidate Pipeline

### 6.1 List Applicants for a Job
Retrieve candidate applications for a specific job posting with filtering and pagination.

- **Method / URL**: `GET /api/v1/applications/jobs/:jobId/applications`
- **Auth**: `Bearer <token>`

#### Query Parameters
| Param | Type | Description |
| :--- | :--- | :--- |
| `status` | `string` | `submitted`, `viewed`, `screening`, `interview`, `offer`, `hired`, `rejected` |
| `stage` | `string` | Custom pipeline stage (e.g. `"Technical Interview"`, `"New"`) |
| `minRating` | `number` | Minimum rating filter `1`-`5` |
| `sort` | `string` | `rating` (descending rating) or `-appliedAt` (default) |
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
        "skills": ["React", "TypeScript", "Node.js", "Docker", "AWS", "GraphQL"]
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
          "question": "Do you have at least 5 years of professional JavaScript / TypeScript experience?",
          "answer": "Yes, 6.5 years"
        }
      ],
      "appliedAt": "2026-08-21T09:15:00.000Z"
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

### 6.2 AI Candidate Fit Score & Scorecard
Uses Google Gemini AI to analyze candidate's parsed resume against the job requirements, providing an instant compatibility scorecard, strengths, and missing skills.

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

### 6.3 Update Candidate Pipeline Stage & Status
Advance candidate through hiring stages (e.g. from `screening` to `interview` or `offer`).

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

### 6.4 Add Internal Recruiter Note & Rating
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
    "createdAt": "2026-08-21T11:00:00.000Z"
  }
}
```

---

### 6.5 List Candidate Application Notes
Retrieve all internal notes and interview evaluations associated with a candidate application.
- **Privacy Enforcement**: Private notes (`isPrivate: true`) are **only returned to the user who authored them**. Other team members will only receive non-private notes.
- **Sorting**: Returned in reverse chronological order (newest first).

- **Method / URL**: `GET /api/v1/applications/:id/notes`
- **Auth**: `Bearer <token>` (Requires role `employer` or `admin`)

#### URL Parameters
| Param | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | MongoDB ObjectId of the application (24-char hex) |

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
      "createdAt": "2026-08-21T11:00:00.000Z",
      "updatedAt": "2026-08-21T11:00:00.000Z"
    }
  ]
}
```

---

### 6.6 Update Candidate Note
Update the content, rating, or privacy status of an existing candidate note.
- **Authorization**: Only the **original author** of the note can update it (`403 Forbidden` if attempted by another team member).
- **Application Rating Sync**: If `rating` is included, the top-level application rating is automatically updated to stay in sync. Pass `rating: null` to unset the rating.

- **Method / URL**: `PUT /api/v1/applications/:id/notes/:noteId`
- **Auth**: `Bearer <token>` (Author only)

#### URL Parameters
| Param | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | Application ObjectId |
| `noteId` | `string` | **Yes** | Note ObjectId |

#### Request Body *(At least one field required)*
```json
{
  "content": "Updated: Completed technical debrief. Highly recommended for offer.",
  "rating": 5,
  "isPrivate": true
}
```

| Field | Type | Required | Constraints |
| :--- | :--- | :--- | :--- |
| `content` | `string` | No | 1–2,000 characters |
| `rating` | `number \| null` | No | Integer `1`–`5`, or `null` to clear |
| `isPrivate` | `boolean` | No | `true` or `false` |

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
    "createdAt": "2026-08-21T11:00:00.000Z",
    "updatedAt": "2026-08-21T11:30:00.000Z"
  }
}
```

---

### 6.7 Delete Candidate Note
Permanently delete an internal candidate note.
- **Authorization**: Only the **original author** of the note can delete it (`403 Forbidden` otherwise).

- **Method / URL**: `DELETE /api/v1/applications/:id/notes/:noteId`
- **Auth**: `Bearer <token>` (Author only)

#### URL Parameters
| Param | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | Application ObjectId |
| `noteId` | `string` | **Yes** | Note ObjectId |

#### Response `(204 No Content)`
```
HTTP/1.1 204 No Content
```
*(No response body returned on successful deletion)*

---

### 6.8 Rate Candidate (1–5 Stars)
Quickly set or update the candidate's star score (1–5) on the application.

- **Method / URL**: `POST /api/v1/applications/:id/rate`
- **Auth**: `Bearer <token>` (Employer or Admin)

#### Request Body
```json
{
  "rating": 5
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rating` | `integer` | **Yes** | Candidate star score between `1` and `5` |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Candidate rated successfully",
  "data": {
    "_id": "66b44a60e7b231123a8b4633",
    "job": "66b44a50e7b231123a8b4610",
    "applicant": "66b44a70e7b231123a8b4644",
    "status": "screening",
    "pipelineStage": "Technical Interview",
    "rating": 5,
    "appliedAt": "2026-08-21T09:15:00.000Z",
    "createdAt": "2026-08-21T09:15:00.000Z",
    "updatedAt": "2026-08-21T11:45:00.000Z"
  }
}
```

---

### 6.9 Clear Candidate Rating
Resets the candidate's star rating to `null`.

- **Method / URL**: `DELETE /api/v1/applications/:id/rate`
- **Auth**: `Bearer <token>` (Employer or Admin)

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Candidate rating cleared successfully",
  "data": {
    "_id": "66b44a60e7b231123a8b4633",
    "job": "66b44a50e7b231123a8b4610",
    "applicant": "66b44a70e7b231123a8b4644",
    "status": "screening",
    "pipelineStage": "Technical Interview",
    "rating": null,
    "appliedAt": "2026-08-21T09:15:00.000Z",
    "createdAt": "2026-08-21T09:15:00.000Z",
    "updatedAt": "2026-08-21T12:00:00.000Z"
  }
}
```

---

### 6.10 Send Bulk Email to Applicants
Dispatch template-based or customized emails with dynamic placeholders (`{{candidateName}}`, `{{jobTitle}}`) to multiple candidates simultaneously.

- **Method / URL**: `POST /api/v1/applications/bulk-email`
- **Auth**: `Bearer <token>`

#### Request Body
```json
{
  "applicationIds": [
    "66b44a60e7b231123a8b4633",
    "66b44a61e7b231123a8b4634",
    "66b44a62e7b231123a8b4635"
  ],
  "subject": "Update on your application for {{jobTitle}} at CloudScale",
  "body": "Hi {{candidateName}},\n\nThank you for applying for the {{jobTitle}} role. We were very impressed with your background and would like to invite you for an introductory call.\n\nPlease pick a time here: https://calendly.com/cloudscale-talent\n\nBest regards,\nCloudScale Recruiting Team"
}
```

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Bulk email process completed",
  "data": {
    "totalSent": 3,
    "successful": 3,
    "failed": 0
  }
}
```

---

## 7. Talent Sourcing, Resume Database & AI Semantic Match

##
# 7.1 Advanced Boolean & Hybrid Resume Search
Search candidate resume database using Boolean logic, skills, experience range, location, and AI semantic matching.
- **Privacy Enforcement**: Only active candidates with `profileVisibility: "public"` who have not requested account deletion are returned.
- **Search Modes**:
  - `keyword`: MongoDB `$text` Boolean search (AND/OR/NOT operators, phrase matching).
  - `semantic`: Pure Gemini vector embedding search via MongoDB Atlas `$vectorSearch`.
  - `hybrid` *(default)*: Runs keyword and semantic in parallel, merges, deduplicates, and re-ranks with weighted scoring (`0.4 × keyword + 0.6 × semantic`).

- **Method / URL**: `GET /api/v1/search/resumes`
- **Auth**: `Bearer <token>` (Requires role `employer` or `admin`)

#### Query Parameters
| Param | Type | Required | Default | Example | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `q` | `string` | No | `""` | `(React OR Vue) AND Node.js NOT Angular` | Boolean search query string |
| `skills` | `string` | No | `""` | `TypeScript, Docker, AWS` | Comma-separated required skills |
| `location` | `string` | No | `""` | `San Francisco, CA` | City, State or Country (matches parsed location & experience) |
| `experienceMin`| `number` | No | — | `5` | Minimum years of total experience |
| `experienceMax`| `number` | No | — | `12` | Maximum years of total experience |
| `education` | `string` | No | `""` | `bachelor` | `high_school`, `associate`, `bachelor`, `master`, `doctorate`, `any` |
| `mode` | `string` | No | `hybrid` | `hybrid` | `keyword`, `semantic`, `hybrid` |
| `sort` | `string` | No | `relevance` | `relevance` | `relevance`, `experience`, `date` |
| `page` | `number` | No | `1` | `1` | Page number (minimum: 1) |
| `limit` | `number` | No | `20` | `20` | Items per page (min: 1, max: 100) |

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
      "publicId": "resumes/michael_chen_1789106000",
      "fileType": "pdf",
      "fileSize": 1048576,
      "originalFileName": "Michael_Chen_Resume.pdf",
      "isDefault": true,
      "parsedData": {
        "personalInfo": {
          "name": "Michael Chen",
          "email": "michael.chen@devmail.com",
          "phone": "+14155551234",
          "location": "San Francisco, CA",
          "linkedin": "https://linkedin.com/in/michaelchen",
          "github": "https://github.com/michaelchen",
          "portfolio": "https://michaelchen.dev"
        },
        "headline": "Senior Full Stack Cloud Engineer",
        "summary": "Full Stack Software Engineer with 6+ years building microservices and web applications...",
        "experience": [
          {
            "company": "ScaleTech Systems",
            "title": "Senior Software Engineer",
            "location": "San Francisco, CA",
            "startDate": "2022-01-01",
            "endDate": null,
            "current": true,
            "description": "Led backend architecture for payments service processing $50M/year.",
            "highlights": [
              "Designed microservices with Node.js, MongoDB, and Redis",
              "Reduced API latency by 40% using optimized vector search indexing"
            ]
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
        "skills": ["React", "TypeScript", "Node.js", "Docker", "AWS", "MongoDB", "GraphQL"],
        "certifications": [
          {
            "name": "AWS Certified Solutions Architect",
            "issuer": "Amazon Web Services",
            "year": 2023
          }
        ],
        "languages": ["English"],
        "totalYearsOfExperience": 6.5
      },
      "relevanceScore": 0.9412,
      "createdAt": "2026-08-21T10:30:00.000Z",
      "updatedAt": "2026-08-21T10:30:00.000Z"
    }
  ],
  "meta": {
    "searchMode": "hybrid",
    "keywordResults": 14,
    "semanticResults": 10,
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
- **Privacy Enforcement**: Only candidates with `profileVisibility: "public"` and `status: "active"` are returned.
- **Source Filtering**: The target `resumeId` itself is automatically excluded from the similarity results.

- **Method / URL**: `GET /api/v1/search/resumes/similar/:resumeId`
- **Auth**: `Bearer <token>` (Requires role `employer` or `admin`)

#### URL Parameters & Query Parameters
| Param | In | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `resumeId` | path | `string` | **Yes** | — | MongoDB ObjectId of the source candidate resume |
| `limit` | query | `number` | No | `10` | Maximum similar candidates to return (min: 1, max: 50) |

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
        "profileVisibility": "public",
        "status": "active"
      },
      "title": "David Miller - Full Stack Architect",
      "fileUrl": "https://res.cloudinary.com/hire-engine/resumes/david_miller.pdf",
      "fileType": "pdf",
      "parsedData": {
        "personalInfo": {
          "name": "David Miller",
          "location": "Austin, TX"
        },
        "headline": "Lead Frontend / Full Stack Architect",
        "skills": ["React", "Node.js", "TypeScript", "Next.js", "AWS"],
        "totalYearsOfExperience": 8
      },
      "semanticScore": 0.8921,
      "createdAt": "2026-08-15T09:12:00.000Z"
    }
  ]
}
```

---

### 7.3 AI-Rank All Candidate Resumes Against a Job Posting
Ranks the candidate database against the exact job description using high-dimensional cosine similarity embeddings via MongoDB Atlas Vector Search.
- **Privacy Enforcement**: Only candidates with `profileVisibility: "public"` and `status: "active"` are returned.
- **Query Vector**: Uses the pre-computed job embedding vector or synthesizes a dynamic query embedding from the job title, description, skills, and qualifications.

- **Method / URL**: `GET /api/v1/search/resumes/rank-by-job/:jobId`
- **Auth**: `Bearer <token>` (Requires role `employer` or `admin`)

#### URL Parameters & Query Parameters
| Param | In | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `jobId` | path | `string` | **Yes** | — | MongoDB ObjectId of the job posting |
| `page` | query | `number` | No | `1` | Pagination page number |
| `limit` | query | `number` | No | `20` | Max results per page (min: 1, max: 100) |

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
        "lastName": "Chen",
        "email": "michael.chen@devmail.com",
        "profileVisibility": "public",
        "status": "active"
      },
      "title": "Michael Chen - Senior Full Stack Engineer",
      "fileUrl": "https://res.cloudinary.com/hire-engine/resumes/michael_chen.pdf",
      "fileType": "pdf",
      "parsedData": {
        "headline": "Senior Full Stack Cloud Engineer",
        "skills": ["React", "TypeScript", "Node.js", "AWS", "MongoDB"],
        "totalYearsOfExperience": 6.5,
        "personalInfo": {
          "location": "San Francisco, CA"
        }
      },
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
| `filters` | `object` | **Yes** | — | Search criteria (supports `q`, `skills`, `location`, `experienceMin`, etc.) |
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
    "user": "66b44a20e7b231123a8b4588",
    "name": "SF Senior React & Node Engineers",
    "searchType": "resumes",
    "filters": {
      "q": "React AND Node.js",
      "location": "San Francisco, CA",
      "experienceMin": 5
    },
    "emailAlert": true,
    "smsAlert": false,
    "frequency": "daily",
    "lastAlertSentAt": null,
    "createdAt": "2026-08-21T11:20:00.000Z",
    "updatedAt": "2026-08-21T11:20:00.000Z"
  }
}
```

---

### 7.5 List Saved Searches
Retrieve all saved search queries and alert configs for the authenticated recruiter.

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
      "user": "66b44a20e7b231123a8b4588",
      "name": "SF Senior React & Node Engineers",
      "searchType": "resumes",
      "filters": {
        "q": "React AND Node.js",
        "location": "San Francisco, CA",
        "experienceMin": 5
      },
      "emailAlert": true,
      "smsAlert": false,
      "frequency": "daily",
      "lastAlertSentAt": null,
      "createdAt": "2026-08-21T11:20:00.000Z",
      "updatedAt": "2026-08-21T11:20:00.000Z"
    }
  ]
}
```

---

### 7.6 Delete Saved Search
Remove a saved candidate search query.

- **Method / URL**: `DELETE /api/v1/search/saved/:id`
- **Auth**: `Bearer <token>`

#### URL Parameters
| Param | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | MongoDB ObjectId of the saved search |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Saved search deleted successfully"
}
```

---

## 8. Candidate Resume & AI Match Inspection

### 8.1 View Parsed Candidate Resume
Inspect full structured parsed resume details for a candidate.
- **Privacy Enforcement**:
  - `admin`: Full unrestricted access.
  - `employer`: Allowed if candidate profile is `public` and active, OR if candidate applied to any job posted by the employer's company. Private non-applicant resumes return `404 Not Found`.
  - `jobseeker`: Only permitted to view their own resumes.

- **Method / URL**: `GET /api/v1/resumes/:id`
- **Auth**: `Bearer <token>`

#### URL Parameters
| Param | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | MongoDB ObjectId of the resume |

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
    "publicId": "resumes/michael_chen_1789106000",
    "fileType": "pdf",
    "fileSize": 1048576,
    "originalFileName": "Michael_Chen_Resume.pdf",
    "isDefault": false,
    "parsedData": {
      "personalInfo": {
        "name": "Michael Chen",
        "email": "michael.chen@devmail.com",
        "phone": "+14155551234",
        "location": "San Francisco, CA",
        "linkedin": "https://linkedin.com/in/michaelchen",
        "github": "https://github.com/michaelchen",
        "portfolio": "https://michaelchen.dev"
      },
      "headline": "Senior Full Stack Cloud Engineer",
      "summary": "Full Stack Engineer with 6+ years experience building cloud-native microservices...",
      "skills": ["React", "TypeScript", "Node.js", "AWS", "Docker", "MongoDB", "GraphQL"],
      "experience": [
        {
          "company": "ScaleTech Systems",
          "title": "Senior Software Engineer",
          "location": "San Francisco, CA",
          "startDate": "2022-01",
          "endDate": "Present",
          "current": true,
          "description": "Architected distributed node microservices.",
          "highlights": ["Processed $50M/year payments", "40% latency reduction"]
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
      "certifications": [
        {
          "name": "AWS Solutions Architect Associate",
          "issuer": "Amazon Web Services",
          "year": 2023
        }
      ],
      "languages": ["English"],
      "totalYearsOfExperience": 6.5
    },
    "createdAt": "2026-08-21T10:30:00.000Z",
    "updatedAt": "2026-08-21T10:30:00.000Z"
  }
}
```

---

### 8.2 AI Resume Analysis & ATS Feedback
Generate AI-driven quality critique, ATS compatibility score, formatting feedback, and actionable coaching tips for a candidate resume using Google Gemini AI.

- **Method / URL**: `GET /api/v1/resumes/:id/analysis`
- **Auth**: `Bearer <token>`

#### URL Parameters
| Param | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | MongoDB ObjectId of the resume |

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
      "Clean section hierarchy and readable typography",
      "Contact information and portfolio links easily identifiable by ATS scanners"
    ],
    "actionableTips": [
      "Include measurable impact (e.g., 'reduced API latency by 40%') for leadership roles",
      "Tailor summary keywords to match the target job description"
    ]
  }
}
```

---

### 8.3 Direct Resume-to-Job Match Analysis
Compare any candidate resume in the database with a specific job posting to compute an AI match score, matching skills, missing skill gaps, and hiring recommendations.

- **Method / URL**: `GET /api/v1/resumes/:id/match/:jobId`
- **Auth**: `Bearer <token>`

#### URL Parameters
| Param | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | MongoDB ObjectId of the resume |
| `jobId` | `string` | **Yes** | MongoDB ObjectId of the target job posting |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job match analysis calculated successfully",
  "data": {
    "resumeId": "66b44a80e7b231123a8b4655",
    "jobId": "66b44a50e7b231123a8b4611",
    "jobTitle": "Senior Full Stack Engineer (Node.js & React)",
    "company": "66b44a20e7b231123a8b4588",
    "matchScore": 92,
    "summary": "Candidate matches 5 of 6 required skills with extensive cloud backend and distributed systems experience.",
    "matchedSkills": ["React", "Node.js", "TypeScript", "Docker", "AWS"],
    "missingSkills": ["Redis"],
    "strengths": [
      "Strong domain experience in microservices and distributed systems",
      "Proven track record with Node.js, TypeScript, and AWS cloud architecture"
    ],
    "improvements": [
      "Lacks documented experience in Redis caching clusters"
    ],
    "recommendation": "Strong Match"
  }
}
```

---

## 9. Custom ATS Hiring Pipelines

### 9.1 Create Custom Hiring Pipeline
Customize stages and visual workflow per role or department.

- **Method / URL**: `POST /api/v1/pipelines`
- **Auth**: `Bearer <token>`

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

### 10.1 Get Available Plans & Localized Pricing
Returns subscription tiers with localized tax calculations (e.g. GST for India, Sales Tax for US).

- **Method / URL**: `GET /api/v1/subscriptions/plans?countryCode=US`
- **Auth**: None / Public

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Available subscription plans retrieved",
  "data": {
    "country": "United States",
    "currency": "USD",
    "paymentProvider": "stripe",
    "plans": {
      "monthly": {
        "id": "monthly",
        "name": "Growth Recruiter",
        "description": "Up to 5 active job postings + Resume DB access",
        "price": 299,
        "jobQuota": 5,
        "resumeQuota": 500,
        "hasResumeDB": true,
        "durationMonths": 1,
        "currency": "USD",
        "tax": [],
        "totalPrice": 299
      },
      "annual": {
        "id": "annual",
        "name": "Enterprise Talent Suite",
        "description": "Unlimited job postings, dedicated AI ranking, 5,000 resume downloads",
        "price": 2999,
        "jobQuota": 50,
        "resumeQuota": 5000,
        "hasResumeDB": true,
        "durationMonths": 12,
        "currency": "USD",
        "tax": [],
        "totalPrice": 2999
      }
    }
  }
}
```

---

### 10.2 Subscribe Company to Plan
Creates a payment order with Stripe or Razorpay and upgrades the company subscription tier.

- **Method / URL**: `POST /api/v1/subscriptions`
- **Auth**: `Bearer <token>` (Requires `manage_billing` permission)

#### Request Body
```json
{
  "companyId": "66b44a20e7b231123a8b4588",
  "planId": "monthly"
}
```

#### Response `(201 Created)`
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Subscription order created successfully",
  "data": {
    "subscription": {
      "_id": "66b44af0e7b231123a8b4755",
      "company": "66b44a20e7b231123a8b4588",
      "plan": "monthly",
      "status": "active",
      "paymentProvider": "stripe",
      "jobPostQuota": 5,
      "resumeSearchQuota": 500,
      "hasResumeDBAccess": true,
      "currentPeriodStart": "2026-08-21T11:30:00.000Z",
      "currentPeriodEnd": "2026-09-20T11:30:00.000Z"
    },
    "order": {
      "orderId": "order_stripe_992381283",
      "clientSecret": "pi_3Mtwx2_secret_xyz"
    }
  }
}
```

---

### 10.3 Cancel Active Subscription
- **Method / URL**: `DELETE /api/v1/subscriptions`
- **Auth**: `Bearer <token>`

#### Request Body
```json
{
  "companyId": "66b44a20e7b231123a8b4588"
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
    "cancelledAt": "2026-08-21T11:35:00.000Z"
  }
}
```

---

### 10.4 Company Billing History & Invoices
- **Method / URL**: `GET /api/v1/subscriptions/transactions?companyId=66b44a20e7b231123a8b4588`
- **Auth**: `Bearer <token>`

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Company transaction history retrieved",
  "data": [
    {
      "_id": "66b44b00e7b231123a8b4788",
      "type": "subscription",
      "amount": 299,
      "currency": "USD",
      "status": "succeeded",
      "paymentProvider": "stripe",
      "externalPaymentId": "ch_3Mtww82eZvKYlo2C",
      "description": "Subscribed to Growth Recruiter",
      "createdAt": "2026-08-21T11:30:00.000Z"
    }
  ]
}
```

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
      "startDate": "2026-08-21T10:30:00.000Z",
      "endDate": "2026-08-31T10:30:00.000Z"
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
      "MongoDB": 19,
      "GraphQL": 16,
      "Redis": 12
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
      "createdAt": "2026-08-21T09:15:00.000Z"
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
- **Auth**: None / Public

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
- **Auth**: None / Public

#### Response `(200 OK)`
```json
{
  "status": "UP",
  "timestamp": "2026-08-21T10:00:00.000Z",
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

// ── Recruiter & Company Models ───────────────────────────────────
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  mobile?: string;
  avatar?: string;
  headline?: string;
  countryCode?: string;
  isEmailVerified: boolean;
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
  phone?: string;
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
  creator: User | string;
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
  };
  coverLetter?: string;
  status: ApplicationStatus;
  pipelineStage: string;
  rating?: number;
  isEasyApply: boolean;
  screeningAnswers: Array<{
    questionIndex: number;
    question: string;
    answer: string;
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

export interface CreateNotePayload {
  content: string;
  rating?: number | null;
  isPrivate?: boolean;
}

export interface UpdateNotePayload {
  content?: string;
  rating?: number | null;
  isPrivate?: boolean;
}

export interface RateCandidatePayload {
  rating: number; // 1-5
}

export interface BulkEmailPayload {
  applicationIds: string[];
  subject: string;
  body: string;
}

// ── Company Compliance & Documents ───────────────────────────────
export interface CompanyDocument {
  type: string;
  label: string;
  fileUrl: string;
  publicId: string;
  uploadedAt: string;
}

export interface VerificationChecklistItem {
  type: string;
  label: string;
  description: string;
  required: boolean;
  isUploaded: boolean;
  uploadedDocument: CompanyDocument | null;
}

export interface CompanyVerificationChecklist {
  companyId: string;
  countryCode: string;
  countryName: string;
  verificationStatus: 'pending' | 'under_review' | 'information_required' | 'approved' | 'rejected';
  isComplete: boolean;
  checklist: VerificationChecklistItem[];
  documents: CompanyDocument[];
}

// ── Analytics & Dashboards ───────────────────────────────────────
export interface JobAnalytics {
  jobId: string;
  title: string;
  views: number;
  clicks: number;
  applications: number;
  conversionRate: string;
  clickThroughRate: string;
  isSponsored: boolean;
  sponsorBudget?: {
    dailyBudget: number;
    totalBudget: number;
    spent: number;
    currency: string;
    startDate: string;
    endDate: string;
  };
}

export interface ApplicantDemographics {
  totalApplicants: number;
  locationBreakdown: Record<string, number>;
  topSkills: Record<string, number>;
}

export interface CompanyOverviewMetrics {
  companyId: string;
  name: string;
  totalApplications: number;
  jobStats: Array<{
    _id: string;
    count: number;
    totalViews: number;
    totalClicks: number;
  }>;
}

// ── Notifications ────────────────────────────────────────────────
export interface RecruiterNotification {
  _id: string;
  user: string;
  type: string;
  title: string;
  message: string;
  relatedModel?: string;
  relatedId?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}
```

---

## 15. Frontend Integration Best Practices (Axios Client Setup)

Here is a production-ready Axios client with automated **JWT Bearer attachment**, **automatic 401 token refresh retry**, and **country header handling**:

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Request Interceptor: Attach Access Token & Country Header
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

### Practical Usage Examples with Axios

```typescript
import { apiClient } from './apiClient';

// ── 1. Company Compliance & Phone Verification ───────

// Send OTP to company phone
await apiClient.post('/companies/phone/send-otp', {
  phone: '+919876543210',
});

// Verify OTP on registered company
await apiClient.post(`/companies/${companyId}/phone/verify-otp`, {
  phone: '+919876543210',
  otp: '492810',
});

// Fetch verification document checklist
const { data: checklistData } = await apiClient.get(`/companies/${companyId}/documents`);

// Upload a compliance document (multipart/form-data)
const formData = new FormData();
formData.append('type', 'gst_certificate');
formData.append('label', 'GST Registration Certificate');
formData.append('document', fileBlob, 'gst_certificate.pdf');

await apiClient.post(`/companies/${companyId}/documents`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

// ── 2. Candidate Notes & Star Ratings ────────────────

// Add note with star rating
const { data: newNote } = await apiClient.post(`/applications/${applicationId}/notes`, {
  content: 'Strong cultural fit and system design knowledge.',
  rating: 5,
  isPrivate: false,
});

// List all notes for candidate (private notes filtered automatically by server)
const { data: notes } = await apiClient.get(`/applications/${applicationId}/notes`);

// Update note
await apiClient.put(`/applications/${applicationId}/notes/${noteId}`, {
  content: 'Updated: Excellent technical interview, strong hire.',
  rating: 5,
  isPrivate: true,
});

// Delete note
await apiClient.delete(`/applications/${applicationId}/notes/${noteId}`);

// Rate candidate directly
await apiClient.post(`/applications/${applicationId}/rate`, {
  rating: 4,
});

// Clear candidate rating
await apiClient.delete(`/applications/${applicationId}/rate`);

// ── 3. Recruitment Analytics & ROI ───────────────────

// Company-wide dashboard
const { data: companyOverview } = await apiClient.get('/analytics/company/overview');

// Job-specific funnel & conversion rates
const { data: jobStats } = await apiClient.get(`/analytics/jobs/${jobId}`);

// Applicant demographics and top skills
const { data: demographics } = await apiClient.get(`/analytics/jobs/${jobId}/demographics`);

// ── 4. Notifications ─────────────────────────────────

// List unread notifications
const { data: notifications } = await apiClient.get('/notifications', {
  params: { page: 1, limit: 20 },
});

// Mark all as read
await apiClient.patch('/notifications/read-all');
```

---

## 🎯 Summary Checklist for Frontend Developers

When implementing the Recruiter/Employer portal:
- ✅ **Auth Flow**: Register (`role: 'employer'`), Login, Store `accessToken` and `refreshToken`.
- ✅ **Company Flow**: Verify if user has a company (`GET /api/v1/users/me`). If not, route to Onboarding (`POST /api/v1/companies`).
- ✅ **Jobs Flow**: Manage job statuses (`draft` -> `active` -> `paused` -> `closed`).
- ✅ **ATS Flow**: Load applications by job (`GET /api/v1/applications/jobs/:jobId/applications`), view AI scorecard (`/api/v1/applications/:id/fit`), change stages with notes.
- ✅ **Talent Search**: Use Boolean & hybrid search (`GET /api/v1/search/resumes`), check similar profiles, rank candidate database against job descriptions.
- ✅ **Billing Flow**: Load localized plans (`GET /api/v1/subscriptions/plans`), initiate payment order with Stripe/Razorpay.
- ✅ **Analytics**: Render charts for views, clicks, applications, conversion rates, and demographic breakdowns.
