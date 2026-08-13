# Student Progress Calculation & API Integration Guide

This document provides a comprehensive guide for frontend developers on how student progress is calculated, tracked, and synchronized with the backend in **zatAcademy**. It details the mathematical formulas, completion criteria, API endpoints, request payloads, responses, error codes, and frontend implementation guidelines.

---

## 1. Overview & Core Concept

### Is Frontend Tracking & Backend Synchronization True?
**Yes.** The frontend is responsible for capturing raw student engagement metrics (such as video watch percentage, time spent in seconds, or scroll depth percentage for PDFs/documents) and sending them to the backend via dedicated endpoints.

**However, to prevent progress and certificate spoofing:**
- The **backend autonomously calculates and derives material completion status** (`"not_started"`, `"started"`, `"completed"`, `"reviewed"`).
- Any client-supplied `status` or `quizScore` values sent in standard material update calls are **ignored by the backend**.
- Quizzes are evaluated and graded strictly server-side through a dedicated quiz attempt workflow.

---

## 2. Progress Calculation Formulas

### 2.1 Overall Batch Progress Formula
Student overall progress for a batch is a weighted average of three core components:

$$\text{Overall Progress} = (\text{Material Completion \%} \times 0.40) + (\text{Live Session Attendance \%} \times 0.20) + (\text{Assignment Submission \%} \times 0.40)$$

| Component | Weight | Calculation Method | Criteria |
| :--- | :--- | :--- | :--- |
| **Learning Materials** | **40%** | $\frac{\text{Completed Materials}}{\text{Total Published Materials}} \times 100$ | Derived status is `"completed"` or `"reviewed"`. |
| **Live Sessions** | **20%** | $\frac{\text{Attended Sessions}}{\text{Total Completed/Ongoing Sessions}} \times 100$ | Attendance status is `"present"` or `"late"`. |
| **Assignments** | **40%** | $\frac{\text{Submitted Assignments}}{\text{Total Published Assignments}} \times 100$ | Submission status is $\neq$ `"not_started"` (`"submitted"` or `"graded"`). |

---

### 2.2 Material Completion Criteria (Backend Derived)

When updating progress for a material, the backend applies the following rules:

1. **Video Materials**:
   - Status = `"completed"` if `progress >= 90` **OR** `timeSpent >= (0.9 * video_duration)`.
   - Status = `"started"` if `progress > 0` or `timeSpent > 0`.
   - Status = `"not_started"` otherwise.

2. **PDF / Document / Article / Presentation / Code Materials**:
   - Status = `"completed"` if `progress >= 90` (where `progress` represents scroll depth or read percentage, 0-100).
   - Status = `"started"` if `progress > 0`.
   - Status = `"not_started"` otherwise.

3. **Quiz Materials**:
   - Status = `"completed"` if the student's highest `quizScore >= minScore` (default `minScore = 60%`).
   - Status = `"started"` if `quizScore != null` or `progress > 0`.
   - *Note: Quiz scores can ONLY be updated through the Server-Graded Quiz Endpoints (see Section 3.2).*

---

### 2.3 Module Progress Formula
For each published module in a batch:

$$\text{Module Completion \%} = \frac{\text{Completed Required Items in Module}}{\text{Total Required Items in Module}} \times 100$$

- Required items include live sessions (attended), assignments (submitted), learning materials, quizzes, and assessments (completed).

---

### 2.4 Automatic Certificate Trigger
When `overallProgress >= 90%`:
- The backend automatically generates a verifiable PDF certificate.
- The certificate is stored on Cloudinary.
- The student's enrollment status automatically transitions from `"active"` to `"completed"`.

---

## 3. Backend Endpoints for Frontend Developers

Base API Route: `/api/v1/progress`  
Authentication: Requires Header `Authorization: Bearer <jwt_token>`  
Write Authorization: Users must have phone verification satisfied (if applicable).

---

### 3.1 Update Learning Material Progress (Video, PDF, Document, Article)

Use this endpoint whenever a student interacts with a learning material (watching a video, reading a document/PDF, etc.).

- **HTTP Method**: `PUT`
- **URL**: `/api/v1/progress/materials/:materialId`
- **Headers**:
  ```http
  Authorization: Bearer <jwt_token>
  Content-Type: application/json
  ```

#### Request URL Parameters
- `materialId` *(string, required)*: The MongoDB ObjectId of the `LearningMaterial`.

#### Request Payload
```json
{
  "batchId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "progress": 95,
  "timeSpent": 450,
  "notes": "Completed chapter 3 notes"
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `batchId` | String | **Yes** | MongoDB ObjectId of the batch. |
| `progress` | Number | No | Progress percentage (`0` to `100`). Scroll depth % for docs, watched % for videos. |
| `timeSpent` | Number | No | Time spent in **seconds** during the current/total session. |
| `notes` | String | No | Optional student notes for the material. |

> [!WARNING]
> Do NOT send `status` or `quizScore` in this payload. The backend ignores client-supplied statuses to prevent score/completion manipulation.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Material progress updated",
  "data": {
    "_id": "650c123456789abcdef01234",
    "student": "64f100000000000000000001",
    "batch": "64f1a2b3c4d5e6f7a8b9c0d1",
    "overallProgress": 48.5,
    "materialCompletionPercentage": 60,
    "attendancePercentage": 50,
    "assignmentCompletionPercentage": 40,
    "totalMaterials": 10,
    "completedMaterials": 6,
    "materialProgress": [
      {
        "material": "650a987654321fedcba09876",
        "status": "completed",
        "progress": 95,
        "timeSpent": 450,
        "lastAccessed": "2026-08-13T14:40:00.000Z",
        "completedAt": "2026-08-13T14:40:00.000Z"
      }
    ],
    "isAtRisk": false
  }
}
```

#### Error Responses
- `400 Bad Request`: `batchId is required`
- `403 Forbidden`: `Not enrolled in this batch` (or enrollment not active)
- `404 Not Found`: `Material not found in this batch`

---

### 3.2 Secure Quiz Engine Endpoints

Quizzes must follow a 3-step secure workflow. Client apps CANNOT manually post quiz scores.

#### Step 1: Start or Resume Quiz Attempt
- **HTTP Method**: `POST`
- **URL**: `/api/v1/progress/materials/:materialId/quiz/start`
- **Request Payload**:
  ```json
  {
    "batchId": "64f1a2b3c4d5e6f7a8b9c0d1"
  }
  ```

##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Attempt started",
  "data": {
    "attemptId": "651a00000000000000000099",
    "attemptNumber": 1,
    "resumed": false,
    "expiresAt": "2026-08-13T15:30:00.000Z",
    "minScore": 60,
    "questions": [
      {
        "question": "650q11111111111111111111",
        "text": "What is the primary role of Node.js event loop?",
        "options": [
          "Single-threaded asynchronous I/O execution",
          "Multi-threaded UI rendering",
          "SQL Query optimization",
          "CSS pre-processing"
        ],
        "points": 1
      }
    ]
  }
}
```
*Note: `correctAnswer` is strictly omitted from questions for security.*

##### Quiz Error Gates (Forbidden / Conflict Responses)
1. **Cooldown Active (`403 Forbidden`)**:
   Returned if retaking too quickly (24h cooldown after 1st attempt, doubles on subsequent attempts).
   ```json
   {
     "success": false,
     "message": "You need to wait before retaking this quiz.",
     "errorCode": "QUIZ_COOLDOWN",
     "retryAvailableAt": "2026-08-14T14:40:00.000Z",
     "nextAttemptNumber": 2
   }
   ```

2. **Study Requirement Unmet (`403 Forbidden`)**:
   Returned if student has not completed any remaining sibling materials in the module since failing the previous attempt.
   ```json
   {
     "success": false,
     "message": "Complete at least one of the remaining materials in this module before retaking.",
     "errorCode": "QUIZ_STUDY_REQUIRED",
     "outstandingMaterials": [
       {
         "_id": "650m22222222222222222222",
         "title": "Module 2 Deep Dive PDF",
         "materialType": "pdf"
       }
     ],
     "nextAttemptNumber": 2
   }
   ```

---

#### Step 2: Submit Quiz Attempt
- **HTTP Method**: `POST`
- **URL**: `/api/v1/progress/materials/:materialId/quiz/:attemptId/submit`
- **Request Payload**:
  ```json
  {
    "batchId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "answers": [
      {
        "question": "650q11111111111111111111",
        "selectedOption": "Single-threaded asynchronous I/O execution"
      }
    ]
  }
  ```

##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Quiz passed",
  "data": {
    "attemptId": "651a00000000000000000099",
    "attemptNumber": 1,
    "scorePercent": 100,
    "earnedPoints": 1,
    "totalPoints": 1,
    "minScore": 60,
    "passed": true,
    "perQuestion": [
      {
        "question": "650q11111111111111111111",
        "isCorrect": true,
        "earnedPoints": 1,
        "totalPoints": 1
      }
    ]
  }
}
```

---

#### Step 3: Fetch Quiz Attempt History
- **HTTP Method**: `GET`
- **URL**: `/api/v1/progress/materials/:materialId/quiz/attempts`
- **Success Response (200 OK)**: Returns list of past attempts for the current student.

---

### 3.3 Fetch Student Progress Dashboard

Use this endpoint to render the student's main overview screen across all enrolled active batches.

- **HTTP Method**: `GET`
- **URL**: `/api/v1/progress/student/progress/dashboard`

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "overallStats": {
      "totalBatches": 2,
      "batchesInProgress": 1,
      "batchesCompleted": 1,
      "averageProgress": 72.5,
      "totalTimeSpent": 14200
    },
    "batchProgress": [
      {
        "batchId": "64f1a2b3c4d5e6f7a8b9c0d1",
        "batchName": "Fullstack Web Dev - Batch A",
        "courseTitle": "Fullstack Web Development",
        "thumbnail": "https://res.cloudinary.com/.../thumb.jpg",
        "startDate": "2026-01-01T00:00:00.000Z",
        "endDate": "2026-06-01T00:00:00.000Z",
        "progress": 92,
        "materialProgress": 95,
        "attendance": 90,
        "assignmentProgress": 90,
        "moduleProgress": [
          {
            "moduleId": "650mod111111111111111111",
            "moduleTitle": "HTML & CSS Basics",
            "completionPercentage": 100,
            "completedItems": 5,
            "totalItems": 5
          }
        ],
        "isAtRisk": false,
        "lastActive": "2026-08-13T14:40:00.000Z"
      }
    ],
    "recentActivity": [],
    "upcomingDeadlines": [],
    "atRiskBatches": []
  }
}
```

---

### 3.4 Fetch Progress for a Specific Batch

- **HTTP Method**: `GET`
- **URL**: `/api/v1/progress/batches/:batchId/progress`
- **Success Response (200 OK)**: Returns full `Progress` document for the student in that batch.

---

### 3.5 Fetch Student Progress Trend

- **HTTP Method**: `GET`
- **URL**: `/api/v1/progress/student/progress/trend`
- **Success Response (200 OK)**: Returns list of student active enrollments ordered by lowest progress first.

---

### 3.6 Attendance & Assignment Progress (Automated Workflows)

- **Live Sessions (zatMeet Integration)**:
  - Frontend video integration does not need to post attendance directly. The backend's `zatMeet` webhook handles join/leave events automatically.
  - Criteria: Attending $\ge 50\%$ of scheduled session duration marks student `"present"` (or `"late"` if joining after session start time). Both count as attended.

- **Assignments**:
  - Submitting an assignment via `POST /api/v1/assignments/:id/submit` automatically triggers backend progress recalculation for assignments.

---

## 4. Frontend Integration Guidelines & Best Practices

### 4.1 Video Player Implementation (HTML5 / React / Video.js)
1. **Event Triggers**:
   - Send progress update when video is **paused**, periodically **every 30 seconds**, and when video **ends**.
2. **Payload Values**:
   - `progress`: Calculate `Math.floor((currentTime / duration) * 100)`.
   - `timeSpent`: Send accumulated total active viewing time in **seconds**.

### 4.2 PDF & Document Viewer Implementation
1. **Debounce Updates**:
   - Track scroll position using scroll container height.
   - Calculate scroll percentage: `(scrollTop / (scrollHeight - clientHeight)) * 100`.
   - Debounce payload dispatch (e.g. 2-3 seconds after scrolling stops or when user leaves page/unmounts component).
2. **Reaching End of File**:
   - When scroll reaches near bottom ($\ge 90\%$), dispatch `progress: 90` or `100`.

### 4.3 Quiz UI Best Practices
1. **Handling Cooldown Timer (`QUIZ_COOLDOWN`)**:
   - Read `retryAvailableAt` from error response and render a countdown timer UI blocking retake until the time elapses.
2. **Handling Required Study Materials (`QUIZ_STUDY_REQUIRED`)**:
   - Display `outstandingMaterials` list in a modal or callout box with direct links to uncompleted materials in the module.
3. **Timer / Expiry (`expiresAt`)**:
   - Calculate time remaining (`expiresAt - Date.now()`). Auto-submit answers when timer reaches 0.

---

## 5. Summary Cheat-Sheet for Frontend Developers

| Feature | Action / Trigger | Endpoint | Payload | Key Rules |
| :--- | :--- | :--- | :--- | :--- |
| **Video Progress** | Watching video / Pausing / Ending | `PUT /materials/:materialId` | `{ batchId, progress, timeSpent }` | Backend marks `completed` if `progress >= 90%` or `timeSpent >= 90% duration`. |
| **PDF/Doc Progress** | Reading / Scrolling to bottom | `PUT /materials/:materialId` | `{ batchId, progress, timeSpent }` | Backend marks `completed` if `progress >= 90%`. |
| **Start Quiz** | Student opens quiz modal | `POST /materials/:materialId/quiz/start` | `{ batchId }` | Returns questions sans answers. Consumes attempt. Returns cooldown/study error if locked. |
| **Submit Quiz** | Student finishes quiz | `POST /materials/:materialId/quiz/:attemptId/submit` | `{ batchId, answers }` | Backend grades answers. If `scorePercent >= minScore`, marks material `completed`. |
| **Dashboard** | Load Student Home / Dashboard | `GET /student/progress/dashboard` | *None* | Returns aggregated overall stats & batch/module progress. |
| **Batch Progress** | Load Course Player Sidebar | `GET /batches/:batchId/progress` | *None* | Returns full progress breakdown for active batch. |
