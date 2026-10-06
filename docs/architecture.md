# Architecture Decisions

## Application boundaries

The React frontend and TypeScript backend are separate applications in one repository. The frontend calls the backend through `/api`; only the backend accesses PostgreSQL. This keeps one checkout simple for reviewers while allowing independent builds and deployments.

## Data model

The schema is defined with Drizzle in `apps/backend/src/database/schema.ts`, with a versioned SQL migration. The relationships are:

```mermaid
erDiagram
    USERS ||--o{ TODOS : owns
    USERS ||--o{ SESSIONS : has
    USERS {
        uuid id PK
        string email UK
        string password_hash
        timestamp created_at
    }
    SESSIONS {
        uuid id PK
        uuid user_id FK
        string token_hash
        string csrf_token
        timestamp expires_at
        timestamp created_at
    }
    TODOS {
        uuid id PK
        uuid user_id FK
        string title
        string description
        date due_date
        boolean is_completed
        timestamp created_at
    }
```

Session tokens are hashed before storage. PostgreSQL persists accounts, sessions, and tasks in a named Docker volume during local container runs.

## Main user journey

```mermaid
flowchart LR
    Visitor --> Register --> Login --> TaskList
    TaskList --> CreateTask --> TaskList
    TaskList --> ViewTask --> EditTask --> TaskList
    ViewTask --> SetCompletion --> TaskList
    ViewTask --> DeleteTask --> TaskList
    TaskList --> Logout
```

## Security decisions

Passwords use Argon2id hashes. The API scopes task reads and writes to the authenticated user, sends session tokens in HttpOnly, SameSite=Strict cookies, and requires a per-session CSRF token for authenticated mutations. Production cookies are marked Secure. Account recovery and email verification remain outside the assessment implementation. The prepared public deployment configuration requires HTTPS with TLS 1.3; no public deployment has been performed.
