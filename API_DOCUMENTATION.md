# 📖 Hire Engine Backend — Core API Documentation

This document details the core API endpoints of the Hire Engine platform, grouped by actor (**Candidate / Job Seeker**, **Employer / Recruiter**, **System Administrator**, and **System & Country Plugins**). All successful API responses follow a standardized response wrapper format defined by `ApiResponse`.

---

## 📋 Standardized Response Format

Every API endpoint returns JSON matching the standard wrapper:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Human readable response summary",
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

---

## 📋 Table of Contents
1. [Candidate (Job Seeker) APIs](#1-candidate-job-seeker-apis)
   - [1.1 Candidate Registration](#11-candidate-registration)
   - [1.2 User Login](#12-user-login)
   - [1.3 Refresh Access Token](#13-refresh-access-token)
   - [1.4 Mobile SMS OTP Authentication](#14-mobile-sms-otp-authentication)
   - [1.5 Upload & Auto-Parse Resume](#15-upload--auto-parse-resume)
   - [1.6 Get & Update Candidate Profile](#16-get--update-candidate-profile)
   - [1.7 Toggle Profile Visibility](#17-toggle-profile-visibility)
   - [1.8 Job Search & Filtering](#18-job-search--filtering)
   - [1.9 Apply to a Job ("Easy Apply")](#19-apply-to-a-job-easy-apply)
   - [1.10 View Centralized Application History](#110-view-centralized-application-history)
   - [1.11 Save Search Criteria & Alerts](#111-save-search-criteria--alerts)
   - [1.12 GDPR Account Deletion](#112-gdpr-account-deletion)
2. [Recruiter / Employer APIs](#2-recruiter--employer-apis)
   - [2.1 Register Company (Country Plugin Validated)](#21-register-company-country-plugin-validated)
   - [2.2 Add Sub-Account Team Member](#22-add-sub-account-team-member)
   - [2.3 Create Detailed Job Posting](#23-create-detailed-job-posting)
   - [2.4 Sponsor / Promote a Job Listing](#24-sponsor--promote-a-job-listing)
   - [2.5 Talent Sourcing (Boolean Resume Search)](#25-talent-sourcing-boolean-resume-search)
   - [2.6 View Job Applicants (ATS Dashboard)](#26-view-job-applicants-ats-dashboard)
   - [2.7 Update Candidate Pipeline Stage & Status](#27-update-candidate-pipeline-stage--status)
   - [2.8 Add Candidate Internal Note & Rating](#28-add-candidate-internal-note--rating)
   - [2.9 Bulk Email Candidates](#29-bulk-email-candidates)
   - [2.10 Subscribe to Billing Plan](#210-subscribe-to-billing-plan)
   - [2.11 Job Performance & Demographics Analytics](#211-job-performance--demographics-analytics)
3. [System Administrator APIs](#3-system-administrator-apis)
   - [3.1 List Pending Employer Verifications](#31-list-pending-employer-verifications)
   - [3.2 Approve / Reject Employer Account](#32-approve--reject-employer-account)
   - [3.3 Suspend, Ban, or Reactivate User](#33-suspend-ban-or-reactivate-user)
   - [3.4 Review Flagged Content & Moderation](#34-review-flagged-content--moderation)
   - [3.5 Configure System Thresholds & Configs](#35-configure-system-thresholds--configs)
   - [3.6 Executive Reports & Audit Logs](#36-executive-reports--audit-logs)
4. [System & Country Plugin APIs](#4-system--country-plugin-apis)
   - [4.1 System Health Check](#41-system-health-check)
   - [4.2 Supported Country Plugins Info](#42-supported-country-plugins-info)

---

## 1. Candidate (Job Seeker) APIs

### 1.1 Candidate Registration
- **Endpoint**: `POST /api/v1/auth/register`
- **Auth**: None (Public)
- **Rate Limit**: Auth limiter
- **Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "CandidatePass123!",
  "confirmPassword": "CandidatePass123!",
  "role": "jobseeker",
  "countryCode": "US"
}
```
*Note: `role` is optional (defaults to `jobseeker`, valid values: `jobseeker`, `employer`). `countryCode` is optional 2-letter uppercase ISO code.*

- **Response** `(201 Created)`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user": {
      "_id": "66b44a10e7b231123a8b4567",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "jobseeker",
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

### 1.2 User Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Auth**: None (Public)
- **Rate Limit**: Auth limiter
- **Request Body**:
```json
{
  "email": "john.doe@example.com",
  "password": "CandidatePass123!"
}
```
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "66b44a10e7b231123a8b4567",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "jobseeker",
      "authProvider": "local",
      "isEmailVerified": true,
      "status": "active",
      "profileVisibility": "public",
      "avatar": "",
      "phone": "",
      "headline": "",
      "summary": "",
      "skills": [],
      "location": {
        "address": "",
        "city": "",
        "state": "",
        "country": "",
        "postalCode": "",
        "coordinates": {
          "type": "Point",
          "coordinates": [0, 0]
        }
      },
      "countryCode": "US",
      "company": null,
      "lastLoginAt": "2026-08-12T10:00:00.000Z",
      "createdAt": "2026-08-01T10:00:00.000Z",
      "updatedAt": "2026-08-12T10:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

### 1.3 Refresh Access Token
- **Endpoint**: `POST /api/v1/auth/refresh-token`
- **Auth**: None (Public)
- **Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Response** `(200 OK)`:
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

### 1.4 Mobile SMS OTP Authentication
- **Send OTP Endpoint**: `POST /api/v1/auth/send-otp`
  - **Request Body**: `{ "mobile": "+919876543210" }`
  - **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP sent successfully to mobile number",
  "data": {
    "message": "OTP sent successfully to mobile number"
  }
}
```

- **Verify OTP Endpoint**: `POST /api/v1/auth/verify-otp`
  - **Request Body**: `{ "mobile": "+919876543210", "otp": "123456" }`
  - **Response** `(200 OK)`:
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

### 1.5 Upload & Auto-Parse Resume
- **Endpoint**: `POST /api/v1/resumes/upload`
- **Auth**: Bearer Token (`jobseeker` / logged-in user)
- **Content-Type**: `multipart/form-data`
- **Rate Limit**: Upload limiter
- **Form Data**:
  - `resume`: File (Required; PDF, DOCX, DOC, TXT up to 5MB)
  - `title`: `"Software Engineer Resume 2026"` (Optional)
- **Response** `(201 Created)`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Resume uploaded and parsed successfully",
  "data": {
    "_id": "66b44b20e7b231123a8b4568",
    "user": "66b44a10e7b231123a8b4567",
    "title": "Software Engineer Resume 2026",
    "fileUrl": "https://res.cloudinary.com/hire-engine/raw/upload/v12345/resume_john_123.pdf",
    "publicId": "hire-engine/resumes/resume_john_123",
    "fileType": "pdf",
    "fileSize": 245000,
    "originalFileName": "john_doe_resume.pdf",
    "isDefault": true,
    "parsedData": {
      "personalInfo": {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "+15551234567",
        "location": "San Francisco, CA"
      },
      "experience": [
        {
          "company": "Tech Solutions",
          "title": "Software Engineer",
          "startDate": "2022-01-01",
          "endDate": "2025-12-31",
          "description": "Built Node.js microservices",
          "current": false
        }
      ],
      "education": [
        {
          "institution": "University of California",
          "degree": "Bachelor of Science",
          "field": "Computer Science",
          "graduationYear": 2021
        }
      ],
      "skills": ["Node.js", "Express.js", "MongoDB", "Python"],
      "totalYearsOfExperience": 4,
      "rawText": "John Doe Software Engineer Node.js Express.js...",
      "_parserMeta": {
        "engine": "stub",
        "version": "1.0.0",
        "parsedAt": "2026-08-12T10:05:00.000Z",
        "confidence": 0.95
      }
    },
    "createdAt": "2026-08-12T10:05:00.000Z",
    "updatedAt": "2026-08-12T10:05:00.000Z"
  }
}
```

---

### 1.6 Get & Update Candidate Profile
- **Get Profile Endpoint**: `GET /api/v1/users/me`
- **Auth**: Bearer Token
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile retrieved successfully",
  "data": {
    "_id": "66b44a10e7b231123a8b4567",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "role": "jobseeker",
    "status": "active",
    "profileVisibility": "public",
    "headline": "Senior Backend Developer",
    "summary": "Full stack engineer with 5+ years of experience...",
    "skills": ["Node.js", "MongoDB", "Docker"],
    "phone": "+15551234567",
    "countryCode": "US",
    "createdAt": "2026-08-01T10:00:00.000Z",
    "updatedAt": "2026-08-12T10:00:00.000Z"
  }
}
```

- **Update Profile Endpoint**: `PATCH /api/v1/users/me`
- **Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "headline": "Lead Software Architect",
  "summary": "Passionate backend engineer building distributed systems",
  "skills": ["Node.js", "System Design", "MongoDB", "Redis"],
  "phone": "+15559876543",
  "location": {
    "city": "San Francisco",
    "state": "CA",
    "country": "United States"
  }
}
```

---

### 1.7 Toggle Profile Visibility
- **Endpoint**: `PATCH /api/v1/users/me/visibility`
- **Auth**: Bearer Token (`jobseeker`)
- **Request Body**:
```json
{
  "visibility": "private"
}
```
*Note: Valid values are `"public"` or `"private"`.*

- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile visibility set to private",
  "data": {
    "_id": "66b44a10e7b231123a8b4567",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "role": "jobseeker",
    "profileVisibility": "private",
    "headline": "Senior Backend Developer",
    "skills": ["Node.js", "MongoDB"],
    "countryCode": "US",
    "updatedAt": "2026-08-12T10:10:00.000Z"
  }
}
```

---

### 1.8 Job Search & Filtering
- **Endpoint**: `GET /api/v1/search/jobs`
- **Auth**: None / Optional
- **Rate Limit**: Search limiter
- **Query Parameters**:
  - `q`: Search keywords (e.g. `"Backend Developer"`)
  - `title`: Filter by job title keyword
  - `company`: Filter by company name
  - `location`: Filter by location (`"San Francisco"`)
  - `radius`: Radius in miles (e.g. `25`, requires `lat` and `lng`)
  - `lat` / `lng`: Latitude / Longitude for geospatial proximity search
  - `salaryMin` / `salaryMax`: Minimum and maximum salary range filter
  - `employmentType`: `full-time`, `part-time`, `contract`, `internship` (comma-separated or single)
  - `workplaceType`: `remote`, `hybrid`, `onsite` (comma-separated or single)
  - `experienceLevel`: `entry`, `mid`, `senior`, `lead`, `executive`
  - `datePosted`: `today`, `3days`, `7days`, `14days`, `30days`
  - `skills`: Comma-separated required skills
  - `sort`: `relevance`, `date`, `salary_asc`, `salary_desc` (default: `relevance`)
  - `page`: Page number (default `1`)
  - `limit`: Items per page (default `20`, max `100`)
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job search results retrieved",
  "data": [
    {
      "_id": "66b44c30e7b231123a8b4569",
      "company": {
        "_id": "66b44d40e7b231123a8b4570",
        "name": "Cyberdyne Systems Inc",
        "logoUrl": "https://res.cloudinary.com/hire-engine/image/upload/v123/logo.png"
      },
      "title": "Senior Backend Developer (Node.js)",
      "slug": "senior-backend-developer-nodejs-12345",
      "description": "We are seeking an experienced Backend Developer...",
      "employmentType": "full-time",
      "workplaceType": "remote",
      "salaryRange": {
        "min": 140000,
        "max": 180000,
        "currency": "USD",
        "period": "annually",
        "isVisible": true
      },
      "location": {
        "city": "San Francisco",
        "state": "CA",
        "country": "United States"
      },
      "skills": ["Node.js", "Express.js", "MongoDB"],
      "isSponsored": true,
      "viewCount": 450,
      "clickCount": 120,
      "applicationCount": 35,
      "status": "active",
      "createdAt": "2026-08-07T10:00:00.000Z"
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

### 1.9 Apply to a Job ("Easy Apply")
- **Endpoint**: `POST /api/v1/applications/jobs/:jobId/apply`
- **Auth**: Bearer Token (`jobseeker`)
- **Rate Limit**: Application limiter
- **Request Body**:
```json
{
  "resumeId": "66b44b20e7b231123a8b4568",
  "coverLetter": "Extremely excited about this role and my skills match your requirements.",
  "screeningAnswers": [
    {
      "questionIndex": 0,
      "question": "Do you have 5+ years in Python?",
      "answer": "Yes"
    }
  ],
  "isEasyApply": true
}
```
*Note: `resumeId` must be a valid 24-character hexadecimal ObjectId.*

- **Response** `(201 Created)`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Application submitted successfully",
  "data": {
    "_id": "66b44e50e7b231123a8b4571",
    "job": "66b44c30e7b231123a8b4569",
    "applicant": "66b44a10e7b231123a8b4567",
    "resume": "66b44b20e7b231123a8b4568",
    "coverLetter": "Extremely excited about this role...",
    "screeningAnswers": [
      {
        "questionIndex": 0,
        "question": "Do you have 5+ years in Python?",
        "answer": "Yes"
      }
    ],
    "status": "submitted",
    "pipelineStage": "New",
    "rating": null,
    "statusHistory": [],
    "isEasyApply": true,
    "viewedAt": null,
    "appliedAt": "2026-08-08T12:00:00.000Z",
    "createdAt": "2026-08-08T12:00:00.000Z",
    "updatedAt": "2026-08-08T12:00:00.000Z"
  }
}
```

---

### 1.10 View Centralized Application History
- **Endpoint**: `GET /api/v1/applications/me`
- **Auth**: Bearer Token (`jobseeker`)
- **Query Parameters**: `status=submitted&page=1&limit=10`
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Submitted applications retrieved successfully",
  "data": [
    {
      "_id": "66b44e50e7b231123a8b4571",
      "job": {
        "_id": "66b44c30e7b231123a8b4569",
        "title": "Senior Backend Developer (Node.js)",
        "company": {
          "_id": "66b44d40e7b231123a8b4570",
          "name": "Cyberdyne Systems Inc",
          "logoUrl": "https://res.cloudinary.com/hire-engine/image/upload/v123/logo.png",
          "city": "San Francisco",
          "state": "CA",
          "country": "United States"
        }
      },
      "resume": {
        "_id": "66b44b20e7b231123a8b4568",
        "title": "Software Engineer Resume 2026",
        "fileUrl": "https://res.cloudinary.com/hire-engine/raw/upload/v12345/resume_john_123.pdf",
        "fileType": "pdf"
      },
      "status": "screening",
      "pipelineStage": "Screening",
      "isEasyApply": true,
      "appliedAt": "2026-08-08T12:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalDocs": 1,
      "limit": 10,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 1.11 Save Search Criteria & Alerts
- **Create Saved Search**: `POST /api/v1/search/saved`
- **Auth**: Bearer Token (`jobseeker`)
- **Request Body**:
```json
{
  "name": "Remote Node.js Roles",
  "searchType": "jobs",
  "filters": {
    "keywords": "Node.js",
    "workplaceType": ["remote"],
    "salaryMin": 120000
  },
  "emailAlert": true,
  "smsAlert": false,
  "frequency": "daily"
}
```
*Note: `searchType` valid values: `"jobs"`, `"resumes"`. `frequency` valid values: `"instant"`, `"daily"`, `"weekly"`, `"never"`.*

- **Response** `(201 Created)`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Search criteria saved successfully",
  "data": {
    "_id": "66b44f60e7b231123a8b4572",
    "user": "66b44a10e7b231123a8b4567",
    "name": "Remote Node.js Roles",
    "searchType": "jobs",
    "filters": {
      "keywords": "Node.js",
      "workplaceType": ["remote"],
      "salaryMin": 120000
    },
    "emailAlert": true,
    "smsAlert": false,
    "frequency": "daily",
    "createdAt": "2026-08-12T10:15:00.000Z",
    "updatedAt": "2026-08-12T10:15:00.000Z"
  }
}
```

---

### 1.12 GDPR Account Deletion
- **Endpoint**: `DELETE /api/v1/users/me`
- **Auth**: Bearer Token
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "GDPR deletion request processed successfully. Your account data has been anonymized/removed.",
  "data": {
    "message": "GDPR deletion request processed successfully. Your account data has been anonymized/removed.",
    "deletionDate": "2026-08-12T10:20:00.000Z"
  }
}
```

---

## 2. Recruiter / Employer APIs

### 2.1 Register Company (Country Plugin Validated)
- **Endpoint**: `POST /api/v1/companies`
- **Auth**: Bearer Token (`employer` / `jobseeker`)
- **Header / Body**: Header `x-country-code` or `countryCode` in body
- **Request Body** (India Example - GST, PAN, PIN required by IN Country Plugin):
```json
{
  "name": "TechCorp India Pvt Ltd",
  "countryCode": "IN",
  "website": "https://techcorp.in",
  "industry": "Software Services",
  "size": "51-200",
  "description": "Leading software development firm",
  "address": {
    "street": "123 MG Road",
    "city": "Bengaluru",
    "state": "Karnataka",
    "postalCode": "560001",
    "country": "India"
  },
  "registrationDetails": {
    "gstNumber": "22AAAAA0000A1Z5",
    "panNumber": "ABCDE1234F",
    "registeredAddress": {
      "street": "123 MG Road",
      "city": "Bengaluru",
      "state": "Karnataka",
      "pincode": "560001"
    }
  }
}
```
*Note: Valid `size` values: `"1-10"`, `"11-50"`, `"51-200"`, `"201-500"`, `"501-1000"`, `"1001-5000"`, `"5000+"`.*

- **Response** `(201 Created)`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Company registered successfully. Pending business verification.",
  "data": {
    "_id": "66b44d40e7b231123a8b4570",
    "owner": "66b44a10e7b231123a8b4567",
    "name": "TechCorp India Pvt Ltd",
    "slug": "techcorp-india-pvt-ltd-12345",
    "website": "https://techcorp.in",
    "industry": "Software Services",
    "size": "51-200",
    "countryCode": "IN",
    "verificationStatus": "pending",
    "verificationNotes": "",
    "registrationDetails": {
      "gstNumber": "22AAAAA0000A1Z5",
      "panNumber": "ABCDE1234F"
    },
    "documents": [],
    "teamMembers": [],
    "createdAt": "2026-08-08T10:00:00.000Z",
    "updatedAt": "2026-08-08T10:00:00.000Z"
  }
}
```

---

### 2.2 Add Sub-Account Team Member
- **Endpoint**: `POST /api/v1/companies/:id/team`
- **Auth**: Bearer Token (Company Owner only)
- **Request Body**:
```json
{
  "email": "hr.assistant@techcorp.in",
  "permissions": ["view_applications", "manage_applications"]
}
```
*Note: Valid `permissions` values: `"manage_jobs"`, `"view_applications"`, `"manage_applications"`, `"manage_team"`, `"view_analytics"`, `"manage_billing"`.*

- **Response** `(201 Created)`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Team member added successfully",
  "data": {
    "_id": "66b44d40e7b231123a8b4570",
    "name": "TechCorp India Pvt Ltd",
    "teamMembers": [
      {
        "user": "66b45010e7b231123a8b4573",
        "permissions": ["view_applications", "manage_applications"],
        "addedAt": "2026-08-08T11:00:00.000Z"
      }
    ]
  }
}
```

---

### 2.3 Create Detailed Job Posting
- **Endpoint**: `POST /api/v1/jobs`
- **Auth**: Bearer Token (`employer` / `admin`)
- **Request Body**:
```json
{
  "companyId": "66b44d40e7b231123a8b4570",
  "title": "Lead Software Architect",
  "description": "Designing high-scale distributed systems and Node.js microservices architecture.",
  "skills": ["Node.js", "System Design", "MongoDB", "Redis"],
  "employmentType": "full-time",
  "workplaceType": "hybrid",
  "salaryRange": {
    "min": 180000,
    "max": 240000,
    "currency": "USD",
    "period": "annually",
    "isVisible": true
  },
  "location": {
    "city": "New York",
    "state": "NY",
    "country": "United States"
  },
  "screeningQuestions": [
    {
      "question": "Do you have 8+ years of backend engineering experience?",
      "type": "yes_no",
      "required": true
    }
  ],
  "experienceLevel": "lead",
  "education": "bachelor"
}
```
*Note: `employmentType` values: `"full-time"`, `"part-time"`, `"contract"`, `"internship"`. `workplaceType` values: `"remote"`, `"hybrid"`, `"onsite"`.*

- **Response** `(201 Created)`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Job posting created successfully",
  "data": {
    "_id": "66b45120e7b231123a8b4574",
    "company": "66b44d40e7b231123a8b4570",
    "postedBy": "66b44a10e7b231123a8b4567",
    "title": "Lead Software Architect",
    "slug": "lead-software-architect-66b45120",
    "description": "Designing high-scale distributed systems...",
    "skills": ["Node.js", "System Design", "MongoDB", "Redis"],
    "employmentType": "full-time",
    "workplaceType": "hybrid",
    "status": "active",
    "isSponsored": false,
    "viewCount": 0,
    "clickCount": 0,
    "applicationCount": 0,
    "createdAt": "2026-08-08T12:30:00.000Z",
    "updatedAt": "2026-08-08T12:30:00.000Z"
  }
}
```

---

### 2.4 Sponsor / Promote a Job Listing
- **Endpoint**: `POST /api/v1/jobs/:id/promote`
- **Auth**: Bearer Token (`employer`)
- **Request Body**:
```json
{
  "dailyBudget": 50,
  "totalBudget": 350,
  "durationDays": 7
}
```
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job promoted successfully",
  "data": {
    "_id": "66b45120e7b231123a8b4574",
    "title": "Lead Software Architect",
    "isSponsored": true,
    "sponsorBudget": {
      "dailyBudget": 50,
      "totalBudget": 350,
      "spent": 0,
      "currency": "USD",
      "startDate": "2026-08-08T12:35:00.000Z",
      "endDate": "2026-08-15T12:35:00.000Z"
    }
  }
}
```

---

### 2.5 Talent Sourcing (Boolean Resume Search)
- **Endpoint**: `GET /api/v1/search/resumes`
- **Auth**: Bearer Token (`employer` / `admin`)
- **Rate Limit**: Search limiter
- **Query Parameters**:
  - `q`: Boolean search query (e.g. `"Node.js AND (MongoDB OR PostgreSQL) NOT PHP"`)
  - `skills`: Comma-separated skills filter
  - `location`: Location string
  - `experienceMin` / `experienceMax`: Years of experience range
  - `education`: `high_school`, `associate`, `bachelor`, `master`, `doctorate`, `any`
  - `sort`: `relevance`, `experience`, `date` (default: `relevance`)
  - `page`: Page number (default `1`)
  - `limit`: Results per page (default `20`)
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Resume search results retrieved",
  "data": [
    {
      "_id": "66b44b20e7b231123a8b4568",
      "user": {
        "_id": "66b44a10e7b231123a8b4567",
        "firstName": "John",
        "lastName": "Doe",
        "headline": "Full Stack Engineer"
      },
      "title": "Software Engineer Resume 2026",
      "parsedData": {
        "skills": ["Node.js", "MongoDB", "Express.js"],
        "totalYearsOfExperience": 4
      }
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

### 2.6 View Job Applicants (ATS Dashboard)
- **Endpoint**: `GET /api/v1/jobs/:jobId/applications`
- **Auth**: Bearer Token (`employer` / `admin`)
- **Query Parameters**: `stage=New&status=submitted&minRating=3&sort=rating&page=1&limit=10`
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job applications retrieved successfully",
  "data": [
    {
      "_id": "66b44e50e7b231123a8b4571",
      "applicant": {
        "_id": "66b44a10e7b231123a8b4567",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "phone": "+15551234567",
        "headline": "Senior Backend Developer",
        "skills": ["Node.js", "MongoDB"]
      },
      "resume": {
        "_id": "66b44b20e7b231123a8b4568",
        "title": "Software Engineer Resume 2026",
        "fileUrl": "https://res.cloudinary.com/hire-engine/raw/upload/v12345/resume_john_123.pdf"
      },
      "status": "submitted",
      "pipelineStage": "New",
      "rating": 4,
      "appliedAt": "2026-08-08T12:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalDocs": 1,
      "limit": 10,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 2.7 Update Candidate Pipeline Stage & Status
- **Endpoint**: `PATCH /api/v1/applications/:id/status`
- **Auth**: Bearer Token (`employer` / `admin`)
- **Request Body**:
```json
{
  "status": "interview",
  "pipelineStage": "Interview",
  "note": "Candidate passed initial screening. Scheduled technical round."
}
```
*Note: Valid `status` values: `"viewed"`, `"screening"`, `"interview"`, `"offer"`, `"hired"`, `"rejected"`.*

- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Application status updated successfully",
  "data": {
    "_id": "66b44e50e7b231123a8b4571",
    "status": "interview",
    "pipelineStage": "Interview",
    "statusHistory": [
      {
        "status": "interview",
        "changedAt": "2026-08-09T09:00:00.000Z"
      }
    ],
    "updatedAt": "2026-08-09T09:00:00.000Z"
  }
}
```

---

### 2.8 Add Candidate Internal Note & Rating
- **Add Note Endpoint**: `POST /api/v1/applications/:id/notes`
- **Auth**: Bearer Token (`employer` / `admin`)
- **Request Body**:
```json
{
  "content": "Strong system design skills demonstrated in interview.",
  "rating": 5,
  "isPrivate": false
}
```
- **Response** `(201 Created)`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Candidate note added successfully",
  "data": {
    "_id": "66b45230e7b231123a8b4575",
    "application": "66b44e50e7b231123a8b4571",
    "author": "66b44a10e7b231123a8b4567",
    "content": "Strong system design skills demonstrated in interview.",
    "rating": 5,
    "isPrivate": false,
    "createdAt": "2026-08-09T10:00:00.000Z"
  }
}
```

- **Rate Candidate Endpoint**: `POST /api/v1/applications/:id/rate`
- **Request Body**: `{ "rating": 5 }`

---

### 2.9 Bulk Email Candidates
- **Endpoint**: `POST /api/v1/applications/bulk-email`
- **Auth**: Bearer Token (`employer` / `admin`)
- **Request Body**:
```json
{
  "applicationIds": ["66b44e50e7b231123a8b4571"],
  "subject": "Invitation for Interview - {{jobTitle}}",
  "body": "Hi {{candidateName}},\n\nWe would like to invite you for an interview for the {{jobTitle}} position."
}
```
*Note: `templateId` (24-char ObjectId) can be provided instead of raw `subject` and `body`.*

- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Bulk email process completed",
  "data": {
    "sent": 1,
    "failed": 0,
    "details": [
      {
        "email": "john.doe@example.com",
        "status": "sent"
      }
    ]
  }
}
```

---

### 2.10 Subscribe to Billing Plan
- **List Plans Endpoint**: `GET /api/v1/subscriptions/plans?countryCode=IN`
- **Create Subscription Endpoint**: `POST /api/v1/subscriptions`
- **Auth**: Bearer Token (`employer` / `admin`)
- **Request Body**:
```json
{
  "companyId": "66b44d40e7b231123a8b4570",
  "planId": "monthly"
}
```
*Note: Valid `planId` values: `"pay-per-job"`, `"monthly"`, `"annual"`, `"enterprise"`.*

- **Response** `(201 Created)`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Subscription order created successfully",
  "data": {
    "subscription": {
      "_id": "66b45300e7b231123a8b4580",
      "company": "66b44d40e7b231123a8b4570",
      "plan": "monthly",
      "status": "active",
      "paymentProvider": "razorpay",
      "externalSubscriptionId": "order_MN123456",
      "jobPostQuota": 10,
      "jobPostsUsed": 0,
      "resumeSearchQuota": 100,
      "resumeSearchesUsed": 0,
      "hasResumeDBAccess": true,
      "currentPeriodStart": "2026-08-12T10:00:00.000Z",
      "currentPeriodEnd": "2026-09-11T10:00:00.000Z"
    },
    "order": {
      "orderId": "order_MN123456",
      "providerData": {
        "id": "order_MN123456",
        "amount": 35282,
        "currency": "INR",
        "keyId": "rzp_test_key"
      }
    }
  }
}
```

---

### 2.11 Job Performance & Demographics Analytics
- **Job Analytics Endpoint**: `GET /api/v1/analytics/jobs/:jobId`
- **Auth**: Bearer Token (`employer` / `admin`)
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job performance analytics retrieved",
  "data": {
    "jobId": "66b44c30e7b231123a8b4569",
    "title": "Senior Backend Developer (Node.js)",
    "views": 450,
    "clicks": 120,
    "applications": 35,
    "conversionRate": "7.78%",
    "clickThroughRate": "26.67%",
    "isSponsored": true,
    "sponsorBudget": {
      "dailyBudget": 50,
      "totalBudget": 350,
      "spent": 150
    }
  }
}
```

- **Demographics Breakdown Endpoint**: `GET /api/v1/analytics/jobs/:jobId/demographics`
- **Company Overview Endpoint**: `GET /api/v1/analytics/company/overview`

---

## 3. System Administrator APIs

### 3.1 List Pending Employer Verifications
- **Endpoint**: `GET /api/v1/admin/employers/pending`
- **Auth**: Bearer Token (`admin`)
- **Query Parameters**: `page=1&limit=20`
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Pending employer verification list",
  "data": [
    {
      "_id": "66b44d40e7b231123a8b4570",
      "name": "TechCorp India Pvt Ltd",
      "countryCode": "IN",
      "verificationStatus": "pending",
      "registrationDetails": {
        "gstNumber": "22AAAAA0000A1Z5",
        "panNumber": "ABCDE1234F"
      },
      "owner": {
        "_id": "66b44a10e7b231123a8b4567",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com"
      }
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

### 3.2 Approve / Reject Employer Account
- **Endpoint**: `PATCH /api/v1/admin/employers/:id/verify`
- **Auth**: Bearer Token (`admin`)
- **Request Body**:
```json
{
  "status": "approved",
  "notes": "GSTIN and business registration documents verified."
}
```
*Note: Valid `status` values: `"approved"`, `"rejected"`.*

- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Employer verification decision recorded",
  "data": {
    "_id": "66b44d40e7b231123a8b4570",
    "name": "TechCorp India Pvt Ltd",
    "verificationStatus": "approved",
    "verificationNotes": "GSTIN and business registration documents verified.",
    "verifiedAt": "2026-08-12T10:30:00.000Z"
  }
}
```

---

### 3.3 Suspend, Ban, or Reactivate User
- **Endpoint**: `PATCH /api/v1/admin/users/:id/suspend`
- **Auth**: Bearer Token (`admin`)
- **Request Body**:
```json
{
  "action": "suspend",
  "reason": "Repeated violations of terms of service."
}
```
*Note: Valid `action` values: `"suspend"`, `"ban"`, `"reactivate"`. `reason` is required for `"suspend"` and `"ban"`.*

- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User status updated successfully",
  "data": {
    "_id": "66b44a10e7b231123a8b4567",
    "email": "baduser@example.com",
    "status": "suspended",
    "updatedAt": "2026-08-12T10:32:00.000Z"
  }
}
```

---

### 3.4 Review Flagged Content & Moderation
- **Endpoint**: `PATCH /api/v1/admin/flags/:id`
- **Auth**: Bearer Token (`admin`)
- **Request Body**:
```json
{
  "status": "resolved",
  "resolutionNote": "Confirmed job was misleading scam. Job post closed.",
  "actionTaken": "removed"
}
```
*Note: Valid `status` values: `"resolved"`, `"dismissed"`. Valid `actionTaken` values: `"none"`, `"removed"`, `"suspended"`, `"warned"`.*

- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Flag resolved successfully",
  "data": {
    "_id": "66b45340e7b231123a8b4576",
    "status": "resolved",
    "resolutionNote": "Confirmed job was misleading scam. Job post closed.",
    "actionTaken": "removed",
    "resolvedAt": "2026-08-12T10:35:00.000Z"
  }
}
```

---

### 3.5 Configure System Thresholds & Configs
- **Endpoint**: `PATCH /api/v1/admin/config`
- **Auth**: Bearer Token (`admin`)
- **Request Body**:
```json
{
  "key": "max_daily_applications_per_candidate",
  "value": 50,
  "description": "Maximum job applications a candidate can submit per 24 hours",
  "category": "thresholds"
}
```
*Note: Valid `category` values: `"rate_limits"`, `"thresholds"`, `"features"`, `"general"`.*

- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "System configuration updated",
  "data": {
    "_id": "66b45400e7b231123a8b4590",
    "key": "max_daily_applications_per_candidate",
    "value": 50,
    "category": "thresholds",
    "description": "Maximum job applications a candidate can submit per 24 hours"
  }
}
```

---

### 3.6 Executive Reports & Audit Logs
- **Executive Report Endpoint**: `GET /api/v1/admin/reports/overview`
- **Auth**: Bearer Token (`admin`)
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Executive report metrics generated",
  "data": {
    "metrics": {
      "totalUsers": 12500,
      "totalEmployers": 840,
      "totalJobs": 3200,
      "activeJobs": 2100,
      "totalApplications": 45000,
      "totalRevenue": 284500
    }
  }
}
```

- **Audit Logs Endpoint**: `GET /api/v1/admin/audit-logs?page=1&limit=20`

---

## 4. System & Country Plugin APIs

### 4.1 System Health Check
- **Endpoint**: `GET /api/v1/health`
- **Auth**: None (Public)
- **Response** `(200 OK)`:
```json
{
  "status": "UP",
  "timestamp": "2026-08-12T10:40:00.000Z",
  "uptime": 86400.12
}
```

---

### 4.2 Supported Country Plugins Info
- **Endpoint**: `GET /api/v1/countries`
- **Auth**: None (Public)
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "data": [
    {
      "code": "US",
      "name": "United States",
      "currency": "USD",
      "paymentProvider": "stripe",
      "taxType": "Sales Tax",
      "privacyLaw": "CCPA / CPRA"
    },
    {
      "code": "IN",
      "name": "India",
      "currency": "INR",
      "paymentProvider": "razorpay",
      "taxType": "GST",
      "privacyLaw": "DPDP Act 2023"
    }
  ]
}
```
