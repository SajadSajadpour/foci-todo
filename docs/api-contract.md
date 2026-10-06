# API Contract

All endpoints use the `/api` prefix and JSON request and response bodies except logout and delete, which may return `204 No Content`. The browser uses a server-managed session cookie. Task routes require an authenticated session.

**Implementation status:** authentication and all task routes below are implemented and connected to the frontend. Local PostgreSQL verification covers registration, login, task creation, listing, editing, and deletion. Swagger UI is served at `/api/docs/`; the generated OpenAPI document is at `/api/docs/json`.

| Method | Path | Purpose | Success | Main errors |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | Check API process health | 200 | — |
| POST | `/api/auth/register` | Register with email and password | 201 | 400, 409 |
| POST | `/api/auth/login` | Start a session | 200 | 400, 401 |
| POST | `/api/auth/logout` | End the current session | 204 | 401, 403 |
| GET | `/api/auth/me` | Read current user | 200 | 401 |
| POST | `/api/todos` | Create task | 201 | 400, 401, 403 |
| GET | `/api/todos` | List current user's tasks | 200 | 401 |
| GET | `/api/todos/:id` | Read current user's task | 200 | 401, 404 |
| PATCH | `/api/todos/:id` | Update task fields or completion | 200 | 400, 401, 403, 404 |
| DELETE | `/api/todos/:id` | Delete task | 204 | 401, 403, 404 |

Authentication uses a server-managed session cookie and requires an `X-CSRF-Token` header for authenticated state changes. Login returns the token, and `/api/auth/me` allows the client to retrieve it after a reload. Task IDs are opaque. A task belonging to another user must return `404` to avoid revealing its existence.

To try protected routes in Swagger UI, use `POST /api/auth/login` in the same browser to set the session cookie. Copy the returned `csrfToken` into the `X-CSRF-Token` authorization field before trying logout, create, update, or delete. The browser sends the HttpOnly cookie automatically.

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

The OpenAPI document lists response codes and request-field constraints directly from the Fastify route schemas. Runtime errors never expose stack traces or database details to the browser.
