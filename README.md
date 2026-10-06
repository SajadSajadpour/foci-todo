# To Do Application

Foci take-home assessment. This repository will contain two independent applications in one Git repository:

- `apps/backend`: TypeScript API, authentication, task rules, and PostgreSQL access.
- `apps/frontend`: React and TypeScript user interface.

The product scope and acceptance criteria are in the [planning document](../Foci%20Todo%20Scope%20and%20Acceptance%20Criteria.md). The [API contract](docs/api-contract.md), [architecture decisions](docs/architecture.md), [frontend plan](docs/frontend-plan.md), and [Figma UX brief](docs/figma-ux-brief.md) record the design.

## Current status

The backend implements registration, login, logout, current session, and full task CRUD including completion and incompletion. Automated HTTP tests cover validation, CSRF checks, logout, task lifecycle, and user isolation. The frontend remains to be built.

## Run the backend locally

Requirements: Node.js 22 or later, npm, and Docker with Compose. Docker must be running for the database commands.

```bash
npm ci
cp apps/backend/.env.example apps/backend/.env
docker compose up -d db
npm run db:migrate -w @foci/backend
npm run dev:backend
```

The API listens on `http://localhost:3000`; `GET /api/health` provides a basic health response. The local Compose configuration binds PostgreSQL to `127.0.0.1:5432` and keeps its data in a named volume. If that port is already used, change the host port and `.env` together.

```bash
npm run test:backend
npm run typecheck:backend
npm run build:backend
```

The automated tests currently use an in-memory implementation of the storage contract and do not require Docker. Running migrations and checking persistence against a live PostgreSQL instance remains a separate verification step.

## Current design choices

- Fastify handles HTTP and request validation; a storage interface keeps those concerns apart from PostgreSQL access.
- Drizzle defines the PostgreSQL schema in code and generates a versioned SQL migration.
- Passwords use Argon2id hashes. Random session tokens are hashed before storage and sent in HttpOnly cookies. State-changing authenticated requests require a per-session CSRF token.
- The task queries are scoped by the authenticated user ID. The frontend will call the API through the same origin when deployed.
- Authentication adds product scope beyond the assignment's minimum. Email verification, password recovery, and MFA are outside this assessment build.

The frontend, CI, and deployment will be completed in later steps. No AWS credentials are required to run the application locally.
