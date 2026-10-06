# API Contract

All endpoints use the `/api` prefix and JSON request and response bodies except logout and delete, which may return `204 No Content`. The browser uses a server-managed session cookie. Task routes require an authenticated session.

| Method | Path | Purpose | Success | Main errors |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | Register with email and password | 201 | 400, 409 |
| POST | `/api/auth/login` | Start a session | 200 | 400, 401 |
| POST | `/api/auth/logout` | End the current session | 204 | 401 |
| GET | `/api/auth/me` | Read current user | 200 | 401 |
| POST | `/api/todos` | Create task | 201 | 400, 401 |
| GET | `/api/todos` | List current user's tasks | 200 | 401 |
| GET | `/api/todos/:id` | Read current user's task | 200 | 401, 404 |
| PATCH | `/api/todos/:id` | Update task fields or completion | 200 | 400, 401, 404 |
| DELETE | `/api/todos/:id` | Delete task | 204 | 401, 404 |

The authentication mechanism and exact request limits will be finalized with the backend implementation. Task IDs are opaque. A task belonging to another user must return `404` to avoid revealing its existence.

## Task shape

```json
{
  "id": "opaque identifier",
  "title": "Prepare for interview",
  "description": null,
  "dueDate": "2026-10-09",
  "isCompleted": false,
  "createdAt": "2026-10-06T17:00:00.000Z"
}
```

`dueDate` is a calendar date string, not a timestamp. `createdAt` is an ISO timestamp. A task response does not expose its owner's email, password hash, or session data.

## Update semantics

`PATCH /api/todos/:id` changes only supplied fields. `description` and `dueDate` accept `null` to clear them. `isCompleted` accepts a boolean, making completion and incompletion explicit and safe to repeat. At least one editable field must be supplied. Unknown fields are rejected.

## Error shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the supplied fields."
  }
}
```

The final API documentation will specify the stable codes and field-level validation details. Internal errors must not expose stack traces or database details to the browser.
