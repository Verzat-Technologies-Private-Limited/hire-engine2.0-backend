# 🛡️ Hire Engine — Admin Panel API Documentation

> **Complete Frontend Developer Integration Guide**  
> *Everything required to implement the Admin Dashboard — endpoints, payloads, responses, enums, and error codes.*

---

## 📑 Table of Contents

1. [Architecture & Request Standards](#1-architecture--request-standards)
   - [Base URL & Environments](#11-base-url--environments)
   - [Authentication & Authorization](#12-authentication--authorization)
   - [Standard API Response Format](#13-standard-api-response-format)
   - [Standard API Error Format & Status Codes](#14-standard-api-error-format--status-codes)
   - [Pagination & Sorting Standards](#15-pagination--sorting-standards)
2. [Employer Verification & User Compliance](#2-employer-verification--user-compliance)
   - `GET /api/v1/admin/employers/pending` (List Pending Employer Verifications)
   - `PATCH /api/v1/admin/employers/:id/verify` (Approve / Reject Employer)
   - `PATCH /api/v1/admin/users/:id/suspend` (Suspend / Ban / Reactivate User)
3. [Content Moderation & Flagged Content](#3-content-moderation--flagged-content)
   - `GET /api/v1/admin/flags` (List Flagged Content)
   - `PATCH /api/v1/admin/flags/:id` (Resolve Flag Report)
4. [Taxonomy Management](#4-taxonomy-management)
   - `GET /api/v1/admin/taxonomy` (List Taxonomy Entries)
   - `POST /api/v1/admin/taxonomy` (Create Taxonomy Entry)
   - `PATCH /api/v1/admin/taxonomy/:id` (Update Taxonomy Entry)
5. [System Configuration](#5-system-configuration)
   - `GET /api/v1/admin/config` (Get All System Configs)
   - `PATCH /api/v1/admin/config` (Update System Configuration)
6. [Executive Reports & Platform Insights](#6-executive-reports--platform-insights)
   - `GET /api/v1/admin/reports/overview` (Executive Report Dashboard)
7. [Financial Refunds & Transaction Management](#7-financial-refunds--transaction-management)
   - `POST /api/v1/admin/transactions/:id/refund` (Process Refund)
8. [Audit Logs](#8-audit-logs)
   - `GET /api/v1/admin/audit-logs` (List Admin Audit Trail)
9. [Subscription Plan Management (CRUD)](#9-subscription-plan-management-crud)
   - `GET /api/v1/admin/plans` (List All Plans)
   - `POST /api/v1/admin/plans` (Create Plan)
   - `PATCH /api/v1/admin/plans/:id` (Update Plan)
   - `DELETE /api/v1/admin/plans/:id` (Delete Plan)
10. [All Enums & Constants Reference](#10-all-enums--constants-reference)
11. [Frontend TypeScript Interfaces](#11-frontend-typescript-interfaces)
12. [Frontend Integration Best Practices (Axios Client Setup)](#12-frontend-integration-best-practices-axios-client-setup)

---

## 1. Architecture & Request Standards

### 1.1 Base URL & Environments

| Environment | Base URL |
| :--- | :--- |
| **Local Development** | `http://localhost:5000/api/v1` |
| **Production** | `https://api.hireengine.com/api/v1` |

> All admin endpoints are mounted under the `/admin` prefix, e.g. `POST /api/v1/admin/plans`.

### 1.2 Authentication & Authorization

**All admin endpoints** require two layers of protection:

1. **Bearer JWT Token** in the `Authorization` header:
```http
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

2. **Role Requirement**: The authenticated user **must** have role `"admin"`.  
   - Non-admin users receive a `403 Forbidden` response.
   - Missing/expired tokens receive a `401 Unauthorized` response.

| Token | Lifetime |
| :--- | :--- |
| Access Token | 15 minutes |
| Refresh Token | 7 days |

> **Tip**: Use the standard `POST /api/v1/auth/login` endpoint with an admin-role account. Use `POST /api/v1/auth/refresh-token` to rotate tokens silently.

### 1.3 Standard API Response Format

Every successful API response adheres to the `ApiResponse` envelope:

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

> `meta` is **only present** for paginated list endpoints. Non-paginated responses omit the `meta` key entirely.

### 1.4 Standard API Error Format & Status Codes

Errors return a standard JSON body:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "status",
      "message": "\"status\" must be one of [approved, rejected]",
      "type": "validation"
    }
  ]
}
```

#### Common HTTP Status Codes
| Code | Meaning | When |
| :--- | :--- | :--- |
| `200 OK` | Success | Standard success response |
| `201 Created` | Resource created | POST create operations |
| `400 Bad Request` | Validation error | Missing/invalid fields |
| `401 Unauthorized` | Auth failure | Missing, expired, or invalid token |
| `403 Forbidden` | Role mismatch | Non-admin user trying admin endpoints |
| `404 Not Found` | Resource missing | ID doesn't exist |
| `409 Conflict` | Duplicate/constraint | e.g. duplicate `planId`, can't delete active plan |
| `429 Too Many Requests` | Rate limited | Exceeded request quota |
| `500 Internal Server Error` | Server fault | Unexpected server-side error |

### 1.5 Pagination & Sorting Standards

All paginated list endpoints accept these **query parameters**:

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | `integer ≥ 1` | `1` | Page number |
| `limit` | `integer 1-100` | `20` | Items per page (max 100) |
| `sort` | `string` | `-createdAt` | Sort field. Prefix `-` for descending (e.g. `-createdAt`, `name`) |

---

## 2. Employer Verification & User Compliance

### 2.1 List Pending Employer Verifications

Fetches all companies awaiting admin verification review. Sorted by creation date (newest first).

- **Method / URL**: `GET /api/v1/admin/employers/pending`
- **Auth**: `Bearer <token>` (Admin only)

#### Query Parameters

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | `integer` | `1` | Page number |
| `limit` | `integer` | `20` | Items per page |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Pending employer verification list",
  "data": [
    {
      "_id": "66b44a20e7b231123a8b4588",
      "name": "CloudScale Technologies Inc.",
      "slug": "cloudscale-technologies-inc-lnk3x7f",
      "website": "https://cloudscale.io",
      "industry": "Software & Internet",
      "size": "51-200",
      "description": "Leading cloud infrastructure and developer automation platform.",
      "logoUrl": "",
      "countryCode": "US",
      "verificationStatus": "pending",
      "verificationNotes": "",
      "verifiedAt": null,
      "verifiedBy": null,
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
      },
      "documents": [
        {
          "type": "ein_letter",
          "label": "EIN Confirmation Letter",
          "fileUrl": "https://storage.hireengine.com/docs/ein-letter-66b44a.pdf",
          "publicId": "docs/ein-letter-66b44a",
          "uploadedAt": "2026-08-21T10:05:00.000Z"
        }
      ],
      "address": {
        "street": "500 Howard Street, Suite 400",
        "city": "San Francisco",
        "state": "CA",
        "postalCode": "94105",
        "country": "United States"
      },
      "owner": {
        "_id": "66b44a10e7b231123a8b4567",
        "firstName": "Sarah",
        "lastName": "Jenkins",
        "email": "sarah.jenkins@techcorp.io",
        "role": "employer",
        "status": "active"
      },
      "createdAt": "2026-08-21T10:05:00.000Z",
      "updatedAt": "2026-08-21T10:05:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalDocs": 47,
      "limit": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 2.2 Approve or Reject Employer Verification

Admin reviews company registration and approves or rejects the application. Creates an audit log entry.

- **Method / URL**: `PATCH /api/v1/admin/employers/:id/verify`
- **Auth**: `Bearer <token>` (Admin only)

#### URL Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | MongoDB ObjectId of the company (24-char hex) |

#### Request Body
```json
{
  "status": "approved",
  "notes": "All registration documents verified. Business registration confirmed via state records."
}
```

| Field | Type | Required | Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | `"approved"` or `"rejected"` | Verification decision |
| `notes` | `string` | No | Max 1000 chars, can be empty | Admin notes explaining the decision |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Employer verification decision recorded",
  "data": {
    "_id": "66b44a20e7b231123a8b4588",
    "name": "CloudScale Technologies Inc.",
    "slug": "cloudscale-technologies-inc-lnk3x7f",
    "website": "https://cloudscale.io",
    "industry": "Software & Internet",
    "size": "51-200",
    "countryCode": "US",
    "verificationStatus": "approved",
    "verificationNotes": "All registration documents verified. Business registration confirmed via state records.",
    "verifiedAt": "2026-08-22T14:30:00.000Z",
    "verifiedBy": "66b44a00e7b231123a8b4500",
    "createdAt": "2026-08-21T10:05:00.000Z",
    "updatedAt": "2026-08-22T14:30:00.000Z"
  }
}
```

#### Error Responses
| Status | Cause |
| :--- | :--- |
| `400` | Invalid `status` value (must be `approved` or `rejected`) |
| `404` | Company with given `:id` not found |

---

### 2.3 Suspend, Ban, or Reactivate a User

Admin manages user account status — suspend, permanently ban, or reactivate a previously suspended/banned user. Creates an audit log entry.

- **Method / URL**: `PATCH /api/v1/admin/users/:id/suspend`
- **Auth**: `Bearer <token>` (Admin only)

#### URL Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | MongoDB ObjectId of the user (24-char hex) |

#### Request Body
```json
{
  "action": "suspend",
  "reason": "Multiple reports of posting fraudulent job listings. Pending investigation."
}
```

| Field | Type | Required | Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `action` | `string` | **Yes** | `"suspend"`, `"ban"`, or `"reactivate"` | Action to perform |
| `reason` | `string` | **Conditional** | Max 500 chars. **Required** when `action` is `"suspend"` or `"ban"`. Optional for `"reactivate"`. | Reason for the action |

#### Action → Status Mapping
| Action | Resulting `user.status` |
| :--- | :--- |
| `suspend` | `"suspended"` |
| `ban` | `"banned"` |
| `reactivate` | `"active"` |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User status updated successfully",
  "data": {
    "_id": "66b44a10e7b231123a8b4567",
    "firstName": "Sarah",
    "lastName": "Jenkins",
    "email": "sarah.jenkins@techcorp.io",
    "role": "employer",
    "status": "suspended",
    "isEmailVerified": true,
    "countryCode": "US",
    "createdAt": "2026-08-21T10:00:00.000Z",
    "updatedAt": "2026-08-22T15:00:00.000Z"
  }
}
```

#### Error Responses
| Status | Cause |
| :--- | :--- |
| `400` | Invalid `action` value; or missing `reason` when action is `suspend`/`ban` |
| `404` | User with given `:id` not found |

---

## 3. Content Moderation & Flagged Content

### 3.1 List Flagged Content Reports

Retrieve flagged/reported content items from the community or AI-based moderation. Supports filtering by status.

- **Method / URL**: `GET /api/v1/admin/flags`
- **Auth**: `Bearer <token>` (Admin only)

#### Query Parameters

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | `integer` | `1` | Page number |
| `limit` | `integer` | `20` | Items per page |
| `status` | `string` | *(all)* | Filter by flag status: `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"` |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Flagged content list retrieved",
  "data": [
    {
      "_id": "66c11a30e7b231123a8bff01",
      "targetModel": "Job",
      "targetId": "66b44a50e7b231123a8b9001",
      "reportedBy": {
        "_id": "66b44a10e7b231123a8b4570",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@email.com"
      },
      "reason": "scam",
      "description": "This job posting asks for upfront payment from candidates. Likely a scam.",
      "status": "pending",
      "resolvedBy": null,
      "resolvedAt": null,
      "resolutionNote": "",
      "actionTaken": "",
      "createdAt": "2026-08-22T09:15:00.000Z",
      "updatedAt": "2026-08-22T09:15:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalDocs": 28,
      "limit": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Flag Reason Enum Values
| Value | Description |
| :--- | :--- |
| `spam` | Spam content |
| `misleading` | Misleading or false information |
| `duplicate` | Duplicate posting |
| `inappropriate` | Inappropriate or offensive content |
| `scam` | Suspected scam or fraud |
| `other` | Other reason (see description) |

#### Flag Status Enum Values
| Value | Description |
| :--- | :--- |
| `pending` | Awaiting admin review |
| `reviewed` | Reviewed but no action taken yet |
| `resolved` | Resolved with action |
| `dismissed` | Dismissed as invalid report |

---

### 3.2 Resolve a Flag Report

Admin reviews a flagged content report and decides on action. If `actionTaken` is `"removed"` and the target is a `Job`, the job is automatically closed.

- **Method / URL**: `PATCH /api/v1/admin/flags/:id`
- **Auth**: `Bearer <token>` (Admin only)

#### URL Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | MongoDB ObjectId of the flag (24-char hex) |

#### Request Body
```json
{
  "status": "resolved",
  "resolutionNote": "Confirmed scam posting. Job listing removed and employer account flagged for review.",
  "actionTaken": "removed"
}
```

| Field | Type | Required | Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | `"resolved"` or `"dismissed"` | Resolution decision |
| `resolutionNote` | `string` | No | Max 1000 chars, can be empty | Admin's resolution notes |
| `actionTaken` | `string` | No | `"none"`, `"removed"`, `"suspended"`, `"warned"`. Default: `"none"` | Action taken on the flagged content |

#### Action Taken Side Effects
| `actionTaken` | Auto Side Effect |
| :--- | :--- |
| `removed` | If `targetModel === "Job"`, the job's status is set to `"closed"` |
| `suspended` | No automatic side effect (handle user suspension separately via 2.3) |
| `warned` | No automatic side effect |
| `none` | No side effect |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Flag resolved successfully",
  "data": {
    "_id": "66c11a30e7b231123a8bff01",
    "targetModel": "Job",
    "targetId": "66b44a50e7b231123a8b9001",
    "reportedBy": "66b44a10e7b231123a8b4570",
    "reason": "scam",
    "description": "This job posting asks for upfront payment from candidates. Likely a scam.",
    "status": "resolved",
    "resolvedBy": "66b44a00e7b231123a8b4500",
    "resolvedAt": "2026-08-22T16:45:00.000Z",
    "resolutionNote": "Confirmed scam posting. Job listing removed and employer account flagged for review.",
    "actionTaken": "removed",
    "createdAt": "2026-08-22T09:15:00.000Z",
    "updatedAt": "2026-08-22T16:45:00.000Z"
  }
}
```

#### Error Responses
| Status | Cause |
| :--- | :--- |
| `400` | Invalid `status` or `actionTaken` value |
| `404` | Flag report with given `:id` not found |

---

## 4. Taxonomy Management

Manage platform-wide taxonomies: skills, job categories, industries, and job titles. These feed into dropdowns, autocomplete, and search filters across the platform.

### 4.1 List Taxonomy Entries

Retrieve taxonomy entries, optionally filtered by type. Results are sorted by `sortOrder` ascending, then `name` ascending.

- **Method / URL**: `GET /api/v1/admin/taxonomy`
- **Auth**: `Bearer <token>` (Admin only)

#### Query Parameters

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `type` | `string` | *(all)* | Filter by taxonomy type: `"skill"`, `"category"`, `"industry"`, `"job_title"` |

> ⚠️ **Note**: This endpoint returns **all matching entries** (not paginated). Use the `type` filter to avoid large payloads.

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Taxonomy entries retrieved",
  "data": [
    {
      "_id": "66d11b10e7b231123a8c0001",
      "type": "skill",
      "name": "React.js",
      "slug": "react-js",
      "parentId": null,
      "aliases": ["ReactJS", "React", "React.js"],
      "isActive": true,
      "sortOrder": 0,
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z"
    },
    {
      "_id": "66d11b10e7b231123a8c0002",
      "type": "skill",
      "name": "Node.js",
      "slug": "node-js",
      "parentId": null,
      "aliases": ["NodeJS", "Node"],
      "isActive": true,
      "sortOrder": 1,
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z"
    },
    {
      "_id": "66d11b10e7b231123a8c0003",
      "type": "industry",
      "name": "Software & Internet",
      "slug": "software-internet",
      "parentId": null,
      "aliases": [],
      "isActive": true,
      "sortOrder": 0,
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z"
    }
  ]
}
```

#### Taxonomy Type Enum Values
| Value | Description |
| :--- | :--- |
| `skill` | Technical or soft skill (e.g. "React.js", "Leadership") |
| `category` | Job category (e.g. "Engineering", "Marketing") |
| `industry` | Industry vertical (e.g. "Software & Internet", "Healthcare") |
| `job_title` | Standardized job title (e.g. "Software Engineer", "Product Manager") |

---

### 4.2 Create Taxonomy Entry

Add a new taxonomy item to the platform. Slug is auto-generated from `name`.

- **Method / URL**: `POST /api/v1/admin/taxonomy`
- **Auth**: `Bearer <token>` (Admin only)

#### Request Body
```json
{
  "type": "skill",
  "name": "TypeScript",
  "parentId": null,
  "aliases": ["TS", "Typescript"],
  "isActive": true,
  "sortOrder": 5
}
```

| Field | Type | Required | Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | `"skill"`, `"category"`, `"industry"`, `"job_title"` | Taxonomy type |
| `name` | `string` | **Yes** | 1-100 chars, trimmed | Display name |
| `parentId` | `string\|null` | No | 24-char hex ObjectId or `null` | Parent taxonomy entry (for hierarchical categories) |
| `aliases` | `string[]` | No | Max 10 items, each trimmed | Alternative names for matching/search |
| `isActive` | `boolean` | No | Default: `true` | Whether this entry is active |
| `sortOrder` | `integer` | No | `≥ 0`, default: `0` | Display sort order |

#### Response `(201 Created)`
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Taxonomy entry created",
  "data": {
    "_id": "66d11b10e7b231123a8c0010",
    "type": "skill",
    "name": "TypeScript",
    "slug": "typescript",
    "parentId": null,
    "aliases": ["TS", "Typescript"],
    "isActive": true,
    "sortOrder": 5,
    "createdAt": "2026-08-22T17:00:00.000Z",
    "updatedAt": "2026-08-22T17:00:00.000Z"
  }
}
```

#### Error Responses
| Status | Cause |
| :--- | :--- |
| `400` | Missing required fields or invalid `type` value |
| `409` | Duplicate: an entry with the same `type` + `name` combination already exists |

---

### 4.3 Update Taxonomy Entry

Update an existing taxonomy entry. All fields are optional (only the fields sent will be updated).

- **Method / URL**: `PATCH /api/v1/admin/taxonomy/:id`
- **Auth**: `Bearer <token>` (Admin only)

#### URL Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | MongoDB ObjectId of the taxonomy entry (24-char hex) |

#### Request Body
```json
{
  "name": "TypeScript (TS)",
  "aliases": ["TS", "Typescript", "TypeScript"],
  "isActive": true,
  "sortOrder": 3
}
```

| Field | Type | Required | Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | `"skill"`, `"category"`, `"industry"`, `"job_title"` | Taxonomy type |
| `name` | `string` | **Yes** | 1-100 chars | Updated display name |
| `parentId` | `string\|null` | No | 24-char hex or `null` | Updated parent |
| `aliases` | `string[]` | No | Max 10 items | Updated aliases |
| `isActive` | `boolean` | No | — | Toggle active status |
| `sortOrder` | `integer` | No | `≥ 0` | Updated sort order |

> ⚠️ The taxonomy update validator requires **both** `type` and `name` fields because the same schema is used for creation and updates.

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Taxonomy entry updated",
  "data": {
    "_id": "66d11b10e7b231123a8c0010",
    "type": "skill",
    "name": "TypeScript (TS)",
    "slug": "typescript-ts",
    "parentId": null,
    "aliases": ["TS", "Typescript", "TypeScript"],
    "isActive": true,
    "sortOrder": 3,
    "createdAt": "2026-08-22T17:00:00.000Z",
    "updatedAt": "2026-08-22T18:30:00.000Z"
  }
}
```

#### Error Responses
| Status | Cause |
| :--- | :--- |
| `400` | Validation failure |
| `404` | Taxonomy entry with given `:id` not found |

---

## 5. System Configuration

Manage platform-wide runtime configuration — rate limits, feature flags, thresholds, and general settings. Configurations are key-value pairs with upsert behavior.

### 5.1 Get All System Configs

Retrieve all system configuration entries.

- **Method / URL**: `GET /api/v1/admin/config`
- **Auth**: `Bearer <token>` (Admin only)

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "System configurations retrieved",
  "data": [
    {
      "_id": "66e22c10e7b231123a8d0001",
      "key": "max_jobs_per_employer",
      "value": 50,
      "description": "Maximum number of active job postings per employer account",
      "category": "thresholds",
      "updatedBy": "66b44a00e7b231123a8b4500",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-20T12:00:00.000Z"
    },
    {
      "_id": "66e22c10e7b231123a8d0002",
      "key": "enable_ai_resume_matching",
      "value": true,
      "description": "Feature flag: Enable AI-powered resume-to-job matching",
      "category": "features",
      "updatedBy": "66b44a00e7b231123a8b4500",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-15T09:00:00.000Z"
    },
    {
      "_id": "66e22c10e7b231123a8d0003",
      "key": "auth_rate_limit_per_15min",
      "value": 20,
      "description": "Maximum authentication attempts per IP per 15 minutes",
      "category": "rate_limits",
      "updatedBy": null,
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z"
    }
  ]
}
```

---

### 5.2 Update System Configuration

Create or update a system configuration entry. If the key doesn't exist, it's created (upsert behavior).

- **Method / URL**: `PATCH /api/v1/admin/config`
- **Auth**: `Bearer <token>` (Admin only)

#### Request Body
```json
{
  "key": "max_jobs_per_employer",
  "value": 100,
  "description": "Maximum number of active job postings per employer account",
  "category": "thresholds"
}
```

| Field | Type | Required | Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `string` | **Yes** | Non-empty string | Unique configuration key |
| `value` | `any` | **Yes** | Any JSON value (string, number, boolean, object, array) | Configuration value |
| `description` | `string` | No | Max 500 chars, can be empty | Human-readable description |
| `category` | `string` | No | `"rate_limits"`, `"thresholds"`, `"features"`, `"general"` | Configuration category for grouping |

#### Config Category Enum Values
| Value | Description |
| :--- | :--- |
| `rate_limits` | Rate limiting configuration |
| `thresholds` | Numerical thresholds (quotas, limits) |
| `features` | Feature flags (boolean toggles) |
| `general` | General system configuration |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "System configuration updated",
  "data": {
    "_id": "66e22c10e7b231123a8d0001",
    "key": "max_jobs_per_employer",
    "value": 100,
    "description": "Maximum number of active job postings per employer account",
    "category": "thresholds",
    "updatedBy": "66b44a00e7b231123a8b4500",
    "createdAt": "2026-08-01T00:00:00.000Z",
    "updatedAt": "2026-08-22T19:00:00.000Z"
  }
}
```

#### Error Responses
| Status | Cause |
| :--- | :--- |
| `400` | Missing `key` or `value` field; invalid `category` value |

---

## 6. Executive Reports & Platform Insights

### 6.1 Executive Report Dashboard

Returns aggregated platform-wide KPI metrics for the admin dashboard. No query parameters required.

- **Method / URL**: `GET /api/v1/admin/reports/overview`
- **Auth**: `Bearer <token>` (Admin only)

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Executive report metrics generated",
  "data": {
    "metrics": {
      "totalUsers": 12450,
      "totalEmployers": 834,
      "totalJobs": 5672,
      "activeJobs": 2341,
      "totalApplications": 89234,
      "totalRevenue": 1548750.50
    }
  }
}
```

#### Metrics Reference

| Metric | Type | Description |
| :--- | :--- | :--- |
| `totalUsers` | `integer` | Total registered jobseeker accounts |
| `totalEmployers` | `integer` | Total **approved/verified** companies |
| `totalJobs` | `integer` | Total job postings (all statuses) |
| `activeJobs` | `integer` | Currently active (published) jobs |
| `totalApplications` | `integer` | Total job applications received |
| `totalRevenue` | `number` | Sum of all succeeded transactions (in base currency units) |

---

## 7. Financial Refunds & Transaction Management

### 7.1 Process Refund

Issue a full or partial refund for a completed transaction. The refund is processed via the original payment provider (Stripe / Razorpay). Only transactions with status `"succeeded"` are eligible.

- **Method / URL**: `POST /api/v1/admin/transactions/:id/refund`
- **Auth**: `Bearer <token>` (Admin only)

#### URL Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | MongoDB ObjectId of the transaction (24-char hex) |

#### Request Body
```json
{
  "amount": 49.99,
  "reason": "Customer disputed charge. Job posting was not published due to system error."
}
```

| Field | Type | Required | Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `amount` | `number\|null` | No | `≥ 0` or `null`. `null` = full refund | Refund amount. Set to `null` or omit for a full refund |
| `reason` | `string` | **Yes** | Max 500 chars | Reason for the refund (stored in audit log) |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Refund processed successfully",
  "data": {
    "_id": "66f33d10e7b231123a8e0001",
    "company": "66b44a20e7b231123a8b4588",
    "type": "subscription",
    "amount": 299.00,
    "currency": "USD",
    "status": "refunded",
    "paymentProvider": "stripe",
    "externalPaymentId": "pi_3PxAbCdEfGhIjKlM",
    "providerMetadata": {},
    "description": "Monthly Professional Plan - August 2026",
    "refundReason": "Customer disputed charge. Job posting was not published due to system error.",
    "refundedTransactionId": null,
    "taxAmount": 0,
    "taxBreakdown": {},
    "invoiceNumber": "INV-2026-0847",
    "processedBy": null,
    "createdAt": "2026-08-01T00:00:00.000Z",
    "updatedAt": "2026-08-22T19:30:00.000Z"
  }
}
```

#### Error Responses
| Status | Cause |
| :--- | :--- |
| `400` | Transaction status is not `"succeeded"` (already refunded, pending, or failed) |
| `400` | Missing `reason` field |
| `404` | Transaction with given `:id` not found |

#### Transaction Type Enum Values
| Value | Description |
| :--- | :--- |
| `subscription` | Subscription plan payment |
| `job_promotion` | Job boost / sponsoring payment |
| `refund` | Refund transaction |

#### Transaction Status Enum Values
| Value | Description |
| :--- | :--- |
| `succeeded` | Payment completed successfully |
| `pending` | Payment in progress |
| `failed` | Payment failed |
| `refunded` | Payment refunded |

#### Payment Provider Enum Values
| Value | Description |
| :--- | :--- |
| `stripe` | Stripe (US/International) |
| `razorpay` | Razorpay (India) |

---

## 8. Audit Logs

### 8.1 List Admin Audit Trail

Retrieve the complete audit trail of all admin actions. Sorted by newest first. The `performedBy` field is populated with admin user details.

- **Method / URL**: `GET /api/v1/admin/audit-logs`
- **Auth**: `Bearer <token>` (Admin only)

#### Query Parameters

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | `integer` | `1` | Page number |
| `limit` | `integer` | `20` | Items per page |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Audit logs retrieved",
  "data": [
    {
      "_id": "66f44e10e7b231123a8f0001",
      "performedBy": {
        "_id": "66b44a00e7b231123a8b4500",
        "firstName": "Admin",
        "lastName": "User",
        "email": "admin@hireengine.com"
      },
      "action": "company.verified",
      "targetModel": "Company",
      "targetId": "66b44a20e7b231123a8b4588",
      "details": {
        "status": "approved",
        "notes": "All registration documents verified."
      },
      "ipAddress": "203.0.113.42",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0",
      "createdAt": "2026-08-22T14:30:00.000Z"
    },
    {
      "_id": "66f44e10e7b231123a8f0002",
      "performedBy": {
        "_id": "66b44a00e7b231123a8b4500",
        "firstName": "Admin",
        "lastName": "User",
        "email": "admin@hireengine.com"
      },
      "action": "user.suspended",
      "targetModel": "User",
      "targetId": "66b44a10e7b231123a8b4567",
      "details": {
        "reason": "Multiple reports of fraud",
        "action": "suspend"
      },
      "ipAddress": "203.0.113.42",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0",
      "createdAt": "2026-08-22T15:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 15,
      "totalDocs": 294,
      "limit": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Audit Log Action Enum Values

| Action | Description | Target Model |
| :--- | :--- | :--- |
| `user.created` | New user registered | `User` |
| `user.updated` | User profile updated | `User` |
| `user.suspended` | User account suspended | `User` |
| `user.banned` | User account banned | `User` |
| `user.deleted` | User account deleted (GDPR) | `User` |
| `company.created` | New company registered | `Company` |
| `company.verified` | Employer approved | `Company` |
| `company.rejected` | Employer rejected | `Company` |
| `job.created` | Job posting created | `Job` |
| `job.updated` | Job posting updated | `Job` |
| `job.closed` | Job posting closed | `Job` |
| `job.flagged` | Job posting flagged | `Job` |
| `job.removed` | Job posting removed by admin | `Job` |
| `subscription.created` | Subscription created | `Subscription` |
| `subscription.cancelled` | Subscription cancelled | `Subscription` |
| `refund.processed` | Refund processed | `Transaction` |
| `config.updated` | System config changed | `SystemConfig` |
| `taxonomy.created` | Taxonomy entry created | `Taxonomy` |
| `taxonomy.updated` | Taxonomy entry updated | `Taxonomy` |
| `flag.resolved` | Flag report resolved | `Flag` |
| `plan.created` | Subscription plan created | `Plan` |
| `plan.updated` | Subscription plan updated | `Plan` |
| `plan.deleted` | Subscription plan deleted | `Plan` |
| `gdpr.deletion_requested` | GDPR deletion requested | `User` |
| `gdpr.deletion_completed` | GDPR deletion completed | `User` |
| `admin.login` | Admin login event | — |

---

## 9. Subscription Plan Management (CRUD)

Full CRUD for managing subscription plans offered to employers.

### 9.1 List All Subscription Plans

Retrieve all subscription plans, optionally filtered by active status. Sorted by price ascending.

- **Method / URL**: `GET /api/v1/admin/plans`
- **Auth**: `Bearer <token>` (Admin only)

#### Query Parameters

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `active` | `string` | *(all)* | Filter by active status: `"true"` or `"false"` |

> ⚠️ **Note**: This endpoint returns **all matching plans** (not paginated). The number of plans is expected to be small.

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscription plans retrieved",
  "data": [
    {
      "_id": "66a11a10e7b231123a8a0001",
      "planId": "pay-per-job",
      "name": "Pay Per Job",
      "description": "Post individual job listings without a subscription commitment.",
      "price": 49.99,
      "jobQuota": 1,
      "resumeQuota": 0,
      "hasResumeDB": false,
      "durationMonths": 1,
      "isActive": true,
      "createdAt": "2026-07-01T00:00:00.000Z",
      "updatedAt": "2026-07-01T00:00:00.000Z"
    },
    {
      "_id": "66a11a10e7b231123a8a0002",
      "planId": "monthly-professional",
      "name": "Professional Monthly",
      "description": "10 active job postings per month with resume database access.",
      "price": 299.00,
      "jobQuota": 10,
      "resumeQuota": 100,
      "hasResumeDB": true,
      "durationMonths": 1,
      "isActive": true,
      "createdAt": "2026-07-01T00:00:00.000Z",
      "updatedAt": "2026-07-01T00:00:00.000Z"
    },
    {
      "_id": "66a11a10e7b231123a8a0003",
      "planId": "annual-enterprise",
      "name": "Enterprise Annual",
      "description": "Unlimited job postings, full resume database, priority support, and dedicated account manager.",
      "price": 4999.00,
      "jobQuota": 0,
      "resumeQuota": 0,
      "hasResumeDB": true,
      "durationMonths": 12,
      "isActive": true,
      "createdAt": "2026-07-01T00:00:00.000Z",
      "updatedAt": "2026-07-01T00:00:00.000Z"
    }
  ]
}
```

> **Quota Note**: A quota value of `0` means **unlimited**.

---

### 9.2 Create Subscription Plan

Create a new pricing plan for the platform.

- **Method / URL**: `POST /api/v1/admin/plans`
- **Auth**: `Bearer <token>` (Admin only)

#### Request Body
```json
{
  "planId": "starter-monthly",
  "name": "Starter Monthly",
  "description": "Perfect for small businesses. 3 active job postings per month.",
  "price": 99.00,
  "jobQuota": 3,
  "resumeQuota": 25,
  "hasResumeDB": false,
  "durationMonths": 1,
  "isActive": true
}
```

| Field | Type | Required | Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `planId` | `string` | **Yes** | 2-50 chars, lowercase alphanumeric + hyphens only (`/^[a-z0-9-]+$/`) | Unique machine-readable plan identifier |
| `name` | `string` | **Yes** | 1-200 chars, trimmed | Display name of the plan |
| `description` | `string` | No | Max 2000 chars, can be empty. Default: `""` | Plan description |
| `price` | `number` | **Yes** | `≥ 0` | Price in base currency (e.g. USD) |
| `jobQuota` | `integer` | No | `≥ 0`, default: `0` | Active job posting limit (`0` = unlimited) |
| `resumeQuota` | `integer` | No | `≥ 0`, default: `0` | Resume database search quota (`0` = unlimited) |
| `hasResumeDB` | `boolean` | No | Default: `false` | Whether this plan includes resume database access |
| `durationMonths` | `integer` | **Yes** | `1-120` | Plan duration in months |
| `isActive` | `boolean` | No | Default: `true` | Whether the plan is available for purchase |

#### Response `(201 Created)`
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Subscription plan created",
  "data": {
    "_id": "66a11a10e7b231123a8a0010",
    "planId": "starter-monthly",
    "name": "Starter Monthly",
    "description": "Perfect for small businesses. 3 active job postings per month.",
    "price": 99.00,
    "jobQuota": 3,
    "resumeQuota": 25,
    "hasResumeDB": false,
    "durationMonths": 1,
    "isActive": true,
    "createdAt": "2026-08-22T20:00:00.000Z",
    "updatedAt": "2026-08-22T20:00:00.000Z"
  }
}
```

#### Error Responses
| Status | Cause |
| :--- | :--- |
| `400` | Validation failure (missing required fields, invalid `planId` format, etc.) |
| `409` | A plan with the same `planId` already exists |

---

### 9.3 Update Subscription Plan

Update an existing plan. At least one field must be provided. The `planId` (machine identifier) cannot be changed after creation.

- **Method / URL**: `PATCH /api/v1/admin/plans/:id`
- **Auth**: `Bearer <token>` (Admin only)

#### URL Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | MongoDB ObjectId of the plan (24-char hex) |

#### Request Body
```json
{
  "name": "Starter Monthly (Updated)",
  "price": 79.00,
  "jobQuota": 5,
  "isActive": true
}
```

| Field | Type | Required | Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | No | 1-200 chars | Updated plan name |
| `description` | `string` | No | Max 2000 chars | Updated description |
| `price` | `number` | No | `≥ 0` | Updated price |
| `jobQuota` | `integer` | No | `≥ 0` | Updated job quota |
| `resumeQuota` | `integer` | No | `≥ 0` | Updated resume quota |
| `hasResumeDB` | `boolean` | No | — | Updated resume DB access |
| `durationMonths` | `integer` | No | `1-120` | Updated duration |
| `isActive` | `boolean` | No | — | Toggle plan availability |

> **Important**: At least one field must be provided in the request body (enforced by `.min(1)` on the Joi schema).

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscription plan updated",
  "data": {
    "_id": "66a11a10e7b231123a8a0010",
    "planId": "starter-monthly",
    "name": "Starter Monthly (Updated)",
    "description": "Perfect for small businesses. 3 active job postings per month.",
    "price": 79.00,
    "jobQuota": 5,
    "resumeQuota": 25,
    "hasResumeDB": false,
    "durationMonths": 1,
    "isActive": true,
    "createdAt": "2026-08-22T20:00:00.000Z",
    "updatedAt": "2026-08-22T21:00:00.000Z"
  }
}
```

#### Error Responses
| Status | Cause |
| :--- | :--- |
| `400` | Validation failure or empty body |
| `404` | Plan with given `:id` not found |

---

### 9.4 Delete Subscription Plan

Permanently delete a subscription plan. **Blocked** if any active or past-due subscriptions reference this plan.

- **Method / URL**: `DELETE /api/v1/admin/plans/:id`
- **Auth**: `Bearer <token>` (Admin only)

#### URL Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | MongoDB ObjectId of the plan (24-char hex) |

#### Response `(200 OK)`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Plan \"Starter Monthly\" deleted successfully",
  "data": null
}
```

#### Error Responses
| Status | Cause |
| :--- | :--- |
| `404` | Plan with given `:id` not found |
| `409` | Cannot delete — active/past-due subscriptions are using this plan. Deactivate it via `PATCH` with `isActive: false` instead |

#### 409 Conflict Response Example
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Cannot delete plan \"Starter Monthly\". 12 active subscription(s) are using it. Deactivate the plan instead."
}
```

> **Best Practice**: Instead of deleting, set `isActive: false` via the `PATCH` endpoint. This hides the plan from new subscriptions while preserving existing subscriber data.

---

## 10. All Enums & Constants Reference

This section consolidates every enum value used across admin API requests and responses.

### User Roles
| Value | Description |
| :--- | :--- |
| `jobseeker` | Job seeker account |
| `employer` | Employer / recruiter account |
| `admin` | Platform administrator |

### User Status
| Value | Description |
| :--- | :--- |
| `active` | Normal active account |
| `suspended` | Temporarily suspended (can be reactivated) |
| `banned` | Permanently banned |

### Company Verification Status
| Value | Description |
| :--- | :--- |
| `pending` | Awaiting admin review |
| `approved` | Verified and approved |
| `rejected` | Rejected by admin |

### Company Size Options
| Value |
| :--- |
| `1-10` |
| `11-50` |
| `51-200` |
| `201-500` |
| `501-1000` |
| `1001-5000` |
| `5000+` |

### Flag Reason
| Value | Description |
| :--- | :--- |
| `spam` | Spam content |
| `misleading` | Misleading or false information |
| `duplicate` | Duplicate posting |
| `inappropriate` | Inappropriate or offensive content |
| `scam` | Suspected scam or fraud |
| `other` | Other reason |

### Flag Status
| Value | Description |
| :--- | :--- |
| `pending` | Awaiting admin review |
| `reviewed` | Reviewed, no action yet |
| `resolved` | Resolved with action |
| `dismissed` | Dismissed as invalid report |

### Flag Action Taken
| Value | Description |
| :--- | :--- |
| `none` | No action taken |
| `removed` | Content removed |
| `suspended` | User suspended |
| `warned` | User warned |

### Taxonomy Type
| Value | Description |
| :--- | :--- |
| `skill` | Technical or soft skill |
| `category` | Job category |
| `industry` | Industry vertical |
| `job_title` | Standardized job title |

### System Config Category
| Value | Description |
| :--- | :--- |
| `rate_limits` | Rate limiting configuration |
| `thresholds` | Numerical thresholds |
| `features` | Feature flags |
| `general` | General configuration |

### Transaction Type
| Value | Description |
| :--- | :--- |
| `subscription` | Subscription plan payment |
| `job_promotion` | Job boost / sponsoring |
| `refund` | Refund transaction |

### Transaction Status
| Value | Description |
| :--- | :--- |
| `succeeded` | Payment completed |
| `pending` | Payment in progress |
| `failed` | Payment failed |
| `refunded` | Payment refunded |

### Payment Provider
| Value | Description |
| :--- | :--- |
| `stripe` | Stripe (US/International) |
| `razorpay` | Razorpay (India) |

### Audit Log Actions
| Value | Description |
| :--- | :--- |
| `user.created` | User registered |
| `user.updated` | User profile updated |
| `user.suspended` | User suspended |
| `user.banned` | User banned |
| `user.deleted` | User deleted (GDPR) |
| `company.created` | Company registered |
| `company.verified` | Company approved |
| `company.rejected` | Company rejected |
| `job.created` | Job created |
| `job.updated` | Job updated |
| `job.closed` | Job closed |
| `job.flagged` | Job flagged |
| `job.removed` | Job removed by admin |
| `subscription.created` | Subscription created |
| `subscription.cancelled` | Subscription cancelled |
| `refund.processed` | Refund processed |
| `config.updated` | Config changed |
| `taxonomy.created` | Taxonomy created |
| `taxonomy.updated` | Taxonomy updated |
| `flag.resolved` | Flag resolved |
| `plan.created` | Plan created |
| `plan.updated` | Plan updated |
| `plan.deleted` | Plan deleted |
| `gdpr.deletion_requested` | GDPR deletion requested |
| `gdpr.deletion_completed` | GDPR deletion completed |
| `admin.login` | Admin login |

---

## 11. Frontend TypeScript Interfaces

Copy-paste ready TypeScript types for your admin frontend.

```typescript
// ── API Response Envelope ──────────────────────────

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    pagination: PaginationMeta;
  };
}

interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalDocs: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
    type: string;
  }>;
}

// ── Enums ──────────────────────────────────────────

enum UserRole {
  JOBSEEKER = 'jobseeker',
  EMPLOYER = 'employer',
  ADMIN = 'admin',
}

enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

enum FlagReason {
  SPAM = 'spam',
  MISLEADING = 'misleading',
  DUPLICATE = 'duplicate',
  INAPPROPRIATE = 'inappropriate',
  SCAM = 'scam',
  OTHER = 'other',
}

enum FlagStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

enum FlagActionTaken {
  NONE = 'none',
  REMOVED = 'removed',
  SUSPENDED = 'suspended',
  WARNED = 'warned',
}

enum TaxonomyType {
  SKILL = 'skill',
  CATEGORY = 'category',
  INDUSTRY = 'industry',
  JOB_TITLE = 'job_title',
}

enum ConfigCategory {
  RATE_LIMITS = 'rate_limits',
  THRESHOLDS = 'thresholds',
  FEATURES = 'features',
  GENERAL = 'general',
}

enum TransactionType {
  SUBSCRIPTION = 'subscription',
  JOB_PROMOTION = 'job_promotion',
  REFUND = 'refund',
}

enum TransactionStatus {
  SUCCEEDED = 'succeeded',
  PENDING = 'pending',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

enum PaymentProvider {
  STRIPE = 'stripe',
  RAZORPAY = 'razorpay',
}

enum SuspendAction {
  SUSPEND = 'suspend',
  BAN = 'ban',
  REACTIVATE = 'reactivate',
}

type AuditAction =
  | 'user.created' | 'user.updated' | 'user.suspended' | 'user.banned' | 'user.deleted'
  | 'company.created' | 'company.verified' | 'company.rejected'
  | 'job.created' | 'job.updated' | 'job.closed' | 'job.flagged' | 'job.removed'
  | 'subscription.created' | 'subscription.cancelled'
  | 'refund.processed'
  | 'config.updated'
  | 'taxonomy.created' | 'taxonomy.updated'
  | 'flag.resolved'
  | 'plan.created' | 'plan.updated' | 'plan.deleted'
  | 'gdpr.deletion_requested' | 'gdpr.deletion_completed'
  | 'admin.login';

// ── Entity Interfaces ──────────────────────────────

interface IUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  avatar: string;
  phone: string;
  headline: string;
  countryCode: string;
  createdAt: string;
  updatedAt: string;
}

interface ICompanyAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface ICompanyDocument {
  type: string;
  label: string;
  fileUrl: string;
  publicId: string;
  uploadedAt: string;
}

interface ICompany {
  _id: string;
  name: string;
  slug: string;
  website: string;
  industry: string;
  size: string;
  description: string;
  logoUrl: string;
  countryCode: string;
  verificationStatus: VerificationStatus;
  verificationNotes: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
  registrationDetails: Record<string, any>;
  documents: ICompanyDocument[];
  address: ICompanyAddress;
  owner: string | IUser;
  createdAt: string;
  updatedAt: string;
}

interface IFlag {
  _id: string;
  targetModel: 'Job' | 'User' | 'Company';
  targetId: string;
  reportedBy: string | IUser;
  reason: FlagReason;
  description: string;
  status: FlagStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNote: string;
  actionTaken: FlagActionTaken | '';
  createdAt: string;
  updatedAt: string;
}

interface ITaxonomy {
  _id: string;
  type: TaxonomyType;
  name: string;
  slug: string;
  parentId: string | null;
  aliases: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ISystemConfig {
  _id: string;
  key: string;
  value: any;
  description: string;
  category: ConfigCategory;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ITransaction {
  _id: string;
  company: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentProvider: PaymentProvider;
  externalPaymentId: string;
  providerMetadata: Record<string, any>;
  description: string;
  refundReason: string;
  refundedTransactionId: string | null;
  taxAmount: number;
  taxBreakdown: Record<string, any>;
  invoiceNumber: string;
  processedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface IAuditLog {
  _id: string;
  performedBy: string | IUser;
  action: AuditAction;
  targetModel: string;
  targetId: string | null;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

interface IPlan {
  _id: string;
  planId: string;
  name: string;
  description: string;
  price: number;
  jobQuota: number;
  resumeQuota: number;
  hasResumeDB: boolean;
  durationMonths: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IExecutiveReport {
  metrics: {
    totalUsers: number;
    totalEmployers: number;
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    totalRevenue: number;
  };
}

// ── Request Payload Interfaces ─────────────────────

interface VerifyEmployerPayload {
  status: 'approved' | 'rejected';
  notes?: string;
}

interface SuspendUserPayload {
  action: SuspendAction;
  reason?: string; // Required when action is 'suspend' or 'ban'
}

interface ResolveFlagPayload {
  status: 'resolved' | 'dismissed';
  resolutionNote?: string;
  actionTaken?: FlagActionTaken;
}

interface CreateTaxonomyPayload {
  type: TaxonomyType;
  name: string;
  parentId?: string | null;
  aliases?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

interface UpdateTaxonomyPayload {
  type: TaxonomyType;
  name: string;
  parentId?: string | null;
  aliases?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

interface UpdateConfigPayload {
  key: string;
  value: any;
  description?: string;
  category?: ConfigCategory;
}

interface ProcessRefundPayload {
  amount?: number | null; // null = full refund
  reason: string;
}

interface CreatePlanPayload {
  planId: string;
  name: string;
  description?: string;
  price: number;
  jobQuota?: number;
  resumeQuota?: number;
  hasResumeDB?: boolean;
  durationMonths: number;
  isActive?: boolean;
}

interface UpdatePlanPayload {
  name?: string;
  description?: string;
  price?: number;
  jobQuota?: number;
  resumeQuota?: number;
  hasResumeDB?: boolean;
  durationMonths?: number;
  isActive?: boolean;
}
```

---

## 12. Frontend Integration Best Practices (Axios Client Setup)

### Admin API Client with Axios

```typescript
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// ── Create Axios Instance ─────────────────────────

const adminApi: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor: Attach JWT ───────────────

adminApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Auto Token Refresh ──────

let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) promise.reject(error);
    else promise.resolve(token);
  });
  failedQueue = [];
};

adminApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return adminApi(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
        const newToken = data.data.accessToken;

        localStorage.setItem('accessToken', newToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);

        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return adminApi(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/admin/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default adminApi;
```

### Usage Examples

```typescript
import adminApi from './adminApi';

// ── Employer Verification ─────────────────────────

// List pending employers
const { data } = await adminApi.get('/employers/pending', {
  params: { page: 1, limit: 20 },
});

// Approve employer
await adminApi.patch(`/employers/${companyId}/verify`, {
  status: 'approved',
  notes: 'Documents verified.',
});

// ── User Management ───────────────────────────────

// Suspend user
await adminApi.patch(`/users/${userId}/suspend`, {
  action: 'suspend',
  reason: 'Policy violation.',
});

// ── Flagged Content ───────────────────────────────

// Get pending flags
const flags = await adminApi.get('/flags', {
  params: { status: 'pending', page: 1, limit: 20 },
});

// Resolve flag
await adminApi.patch(`/flags/${flagId}`, {
  status: 'resolved',
  resolutionNote: 'Confirmed scam.',
  actionTaken: 'removed',
});

// ── Taxonomy ──────────────────────────────────────

// Get all skills
const skills = await adminApi.get('/taxonomy', {
  params: { type: 'skill' },
});

// Create taxonomy entry
await adminApi.post('/taxonomy', {
  type: 'skill',
  name: 'GraphQL',
  aliases: ['GQL'],
  isActive: true,
});

// ── System Config ─────────────────────────────────

// Get all configs
const configs = await adminApi.get('/config');

// Update config
await adminApi.patch('/config', {
  key: 'max_jobs_per_employer',
  value: 100,
  category: 'thresholds',
});

// ── Executive Reports ─────────────────────────────

const report = await adminApi.get('/reports/overview');

// ── Refunds ───────────────────────────────────────

// Process full refund
await adminApi.post(`/transactions/${transactionId}/refund`, {
  amount: null,
  reason: 'Customer dispute.',
});

// ── Audit Logs ────────────────────────────────────

const logs = await adminApi.get('/audit-logs', {
  params: { page: 1, limit: 50 },
});

// ── Plan Management ───────────────────────────────

// List all plans
const plans = await adminApi.get('/plans');

// List active plans only
const activePlans = await adminApi.get('/plans', {
  params: { active: 'true' },
});

// Create plan
await adminApi.post('/plans', {
  planId: 'growth-quarterly',
  name: 'Growth Quarterly',
  description: 'Ideal for growing teams.',
  price: 699.00,
  jobQuota: 25,
  resumeQuota: 500,
  hasResumeDB: true,
  durationMonths: 3,
  isActive: true,
});

// Update plan
await adminApi.patch(`/plans/${planId}`, {
  price: 599.00,
  isActive: true,
});

// Delete plan
await adminApi.delete(`/plans/${planId}`);
```

---

## Quick Reference — Admin Endpoints Summary

| # | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| 2.1 | `GET` | `/admin/employers/pending` | List pending employer verifications |
| 2.2 | `PATCH` | `/admin/employers/:id/verify` | Approve / reject employer |
| 2.3 | `PATCH` | `/admin/users/:id/suspend` | Suspend / ban / reactivate user |
| 3.1 | `GET` | `/admin/flags` | List flagged content |
| 3.2 | `PATCH` | `/admin/flags/:id` | Resolve flag report |
| 4.1 | `GET` | `/admin/taxonomy` | List taxonomy entries |
| 4.2 | `POST` | `/admin/taxonomy` | Create taxonomy entry |
| 4.3 | `PATCH` | `/admin/taxonomy/:id` | Update taxonomy entry |
| 5.1 | `GET` | `/admin/config` | Get all system configs |
| 5.2 | `PATCH` | `/admin/config` | Update system config |
| 6.1 | `GET` | `/admin/reports/overview` | Executive report metrics |
| 7.1 | `POST` | `/admin/transactions/:id/refund` | Process refund |
| 8.1 | `GET` | `/admin/audit-logs` | List audit trail |
| 9.1 | `GET` | `/admin/plans` | List all plans |
| 9.2 | `POST` | `/admin/plans` | Create plan |
| 9.3 | `PATCH` | `/admin/plans/:id` | Update plan |
| 9.4 | `DELETE` | `/admin/plans/:id` | Delete plan |

---

*Last updated: August 2026.*
