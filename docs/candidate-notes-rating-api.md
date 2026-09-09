# Candidate Notes & Rating — API Reference

> **Base URL:** `/api/v1/applications`
> **Auth:** All endpoints require `Authorization: Bearer <access_token>` header.
> **Role:** Caller must have `employer` or `admin` role.

---

## Data Models

### Note Object
```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "application": "64f1a2b3c4d5e6f7a8b9c0d0",
  "author": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@company.com",
    "role": "employer"
  },
  "content": "Strong communication skills. Recommended for technical round.",
  "rating": 4,
  "isPrivate": false,
  "createdAt": "2024-09-03T09:00:00.000Z",
  "updatedAt": "2024-09-03T09:00:00.000Z"
}
```

### Application Object (returned by rating endpoints)
```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d0",
  "job": "64f1a2b3c4d5e6f7a8b9c0aa",
  "applicant": "64f1a2b3c4d5e6f7a8b9c0bb",
  "status": "screening",
  "pipelineStage": "Phone Screen",
  "rating": 4,
  "appliedAt": "2024-09-01T08:00:00.000Z",
  "createdAt": "2024-09-01T08:00:00.000Z",
  "updatedAt": "2024-09-03T09:00:00.000Z"
}
```

---

## Notes Endpoints

### 1. Create a Note

**POST /applications/:id/notes**

| | |
|---|---|
| URL Param | `:id` — Application ID (24-char hex) |
| Auth Role | `employer`, `admin` |

If a `rating` is included in the body, the application's top-level `rating` field is automatically updated to match.

**Request Headers**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**
```json
{
  "content": "Great cultural fit. Strong problem-solving demonstrated.",
  "rating": 4,
  "isPrivate": false
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `content` | string | YES | 1–2000 characters |
| `rating` | number or null | No | Integer 1–5, or `null` |
| `isPrivate` | boolean | No | Default: `false` |

**Success Response — 201 Created**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Candidate note added successfully",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "application": "64f1a2b3c4d5e6f7a8b9c0d0",
    "author": "64f1a2b3c4d5e6f7a8b9c0d2",
    "content": "Great cultural fit. Strong problem-solving demonstrated.",
    "rating": 4,
    "isPrivate": false,
    "createdAt": "2024-09-03T09:00:00.000Z",
    "updatedAt": "2024-09-03T09:00:00.000Z"
  }
}
```

> Note: `author` is returned as an ObjectId on create. Use GET /notes to get the populated author object.

---

### 2. Get All Notes

Private notes (`isPrivate: true`) are **only returned to their author**. Other team members will not see them.

**GET /applications/:id/notes**

| | |
|---|---|
| URL Param | `:id` — Application ID (24-char hex) |
| Auth Role | `employer`, `admin` |

**Request Headers**
```
Authorization: Bearer <token>
```

**Success Response — 200 OK**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Candidate notes retrieved successfully",
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "application": "64f1a2b3c4d5e6f7a8b9c0d0",
      "author": {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@company.com",
        "role": "employer"
      },
      "content": "Great cultural fit.",
      "rating": 4,
      "isPrivate": false,
      "createdAt": "2024-09-03T09:00:00.000Z",
      "updatedAt": "2024-09-03T09:00:00.000Z"
    }
  ]
}
```

Notes are sorted **newest first**. Returns an empty array `[]` when there are no notes.

---

### 3. Update a Note

Only the **original author** of the note can update it. Other team members will receive `403 Forbidden`.

**PUT /applications/:id/notes/:noteId**

| | |
|---|---|
| URL Param | `:id` — Application ID (24-char hex) |
| URL Param | `:noteId` — Note ID (24-char hex) |
| Auth Role | `employer`, `admin` |

**Request Headers**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body** *(at least one field required)*
```json
{
  "content": "Updated: Excellent problem-solving, strong hire.",
  "rating": 5,
  "isPrivate": true
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `content` | string | No | 1–2000 characters |
| `rating` | number or null | No | Integer 1–5, or `null` to clear |
| `isPrivate` | boolean | No | — |

If `rating` is updated, the **application's top-level rating** is synced automatically.
Send `"rating": null` to clear the rating.

**Success Response — 200 OK**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Candidate note updated successfully",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "application": "64f1a2b3c4d5e6f7a8b9c0d0",
    "author": "64f1a2b3c4d5e6f7a8b9c0d2",
    "content": "Updated: Excellent problem-solving, strong hire.",
    "rating": 5,
    "isPrivate": true,
    "createdAt": "2024-09-03T09:00:00.000Z",
    "updatedAt": "2024-09-03T10:15:00.000Z"
  }
}
```

---

### 4. Delete a Note

Only the **original author** of the note can delete it. Other team members will receive `403 Forbidden`.

**DELETE /applications/:id/notes/:noteId**

| | |
|---|---|
| URL Param | `:id` — Application ID (24-char hex) |
| URL Param | `:noteId` — Note ID (24-char hex) |
| Auth Role | `employer`, `admin` |

**Request Headers**
```
Authorization: Bearer <token>
```

**Success Response — 204 No Content**

No response body is returned.

---

## Rating Endpoints

### 5. Set / Overwrite Rating

**POST /applications/:id/rate**

| | |
|---|---|
| URL Param | `:id` — Application ID (24-char hex) |
| Auth Role | `employer`, `admin` |

**Request Headers**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**
```json
{
  "rating": 4
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `rating` | number | YES | Integer 1–5 |

**Success Response — 200 OK**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Candidate rated successfully",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d0",
    "job": "64f1a2b3c4d5e6f7a8b9c0aa",
    "applicant": "64f1a2b3c4d5e6f7a8b9c0bb",
    "status": "screening",
    "pipelineStage": "Phone Screen",
    "rating": 4,
    "appliedAt": "2024-09-01T08:00:00.000Z",
    "createdAt": "2024-09-01T08:00:00.000Z",
    "updatedAt": "2024-09-03T10:00:00.000Z"
  }
}
```

---

### 6. Clear Rating

**DELETE /applications/:id/rate**

| | |
|---|---|
| URL Param | `:id` — Application ID (24-char hex) |
| Auth Role | `employer`, `admin` |

**Request Headers**
```
Authorization: Bearer <token>
```

**Success Response — 200 OK**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Candidate rating cleared successfully",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d0",
    "job": "64f1a2b3c4d5e6f7a8b9c0aa",
    "applicant": "64f1a2b3c4d5e6f7a8b9c0bb",
    "status": "screening",
    "pipelineStage": "Phone Screen",
    "rating": null,
    "appliedAt": "2024-09-01T08:00:00.000Z",
    "createdAt": "2024-09-01T08:00:00.000Z",
    "updatedAt": "2024-09-03T10:30:00.000Z"
  }
}
```

---

## Error Responses

All errors follow the same shape:

```json
{
  "success": false,
  "statusCode": 403,
  "message": "You can only edit your own notes"
}
```

| Status | When it occurs |
|---|---|
| `400 Bad Request` | Validation failed (missing required field, value out of range, no fields sent to PUT, etc.) |
| `401 Unauthorized` | Missing or expired `Authorization` token |
| `403 Forbidden` | Caller is not an `employer`/`admin`, not a company team member, or not the note's author |
| `404 Not Found` | Application or Note ID does not exist |

---

## Quick Reference Table

| Operation | Method | Endpoint | Body Required |
|---|---|---|---|
| Create note | `POST` | `/applications/:id/notes` | `content` (required), `rating`, `isPrivate` |
| List notes | `GET` | `/applications/:id/notes` | — |
| Update note | `PUT` | `/applications/:id/notes/:noteId` | At least one of `content`, `rating`, `isPrivate` |
| Delete note | `DELETE` | `/applications/:id/notes/:noteId` | — |
| Set rating | `POST` | `/applications/:id/rate` | `rating` (required) |
| Clear rating | `DELETE` | `/applications/:id/rate` | — |

---

## Frontend Tips

- **Star picker (1–5):** Use for both the note-level `rating` and the standalone `POST /rate` endpoint. Both sync the same `Application.rating` field.
- **Private notes:** Show a lock icon and visually distinguish them. Hide edit/delete buttons for notes where `author._id !== currentUser._id`.
- **Delete note:** The response is `204 No Content` — remove the note from local state directly without parsing a body.
- **Edit in place:** Send only the fields that changed in the `PUT` body — all three fields are optional individually.
- **Empty notes list:** The `data` array will be `[]` (not `null`) when there are no notes.
