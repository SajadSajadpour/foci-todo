# To Do Application

Foci take-home assessment. This repository will contain two independent applications in one Git repository:

- `apps/backend`: TypeScript API, authentication, task rules, and PostgreSQL access.
- `apps/frontend`: React and TypeScript user interface.

The product scope and acceptance criteria are in the [planning document](../Foci%20Todo%20Scope%20and%20Acceptance%20Criteria.md). The [API contract](docs/api-contract.md), [architecture decisions](docs/architecture.md), [frontend plan](docs/frontend-plan.md), [Figma UX brief](docs/figma-ux-brief.md), and [deployment guide](docs/deployment.md) record the design.

## Current status

The backend implements registration, login, logout, current session, and full task CRUD including completion and incompletion. Automated HTTP tests cover validation, CSRF checks, logout, task lifecycle, and user isolation. The responsive frontend implements authentication, protected routing, task listing, creation, detail, editing, completion/reopening, and confirmed deletion. Both applications have Docker images and a local container stack; the production Compose/TLS configuration is prepared but not deployed.

## Run locally

Requirements: Node.js 22 or later, npm, and Docker with Compose. Docker must be running for the database commands.

```bash
npm ci
cp apps/backend/.env.example apps/backend/.env
docker compose up --wait -d db
npm run db:migrate -w @foci/backend
npm run dev:backend
```

In a second terminal from the repository root:

```bash
npm run dev:frontend
```

The API listens on `http://localhost:3000`; `GET /api/health` provides a basic health response. Interactive API documentation is at `http://localhost:3000/api/docs/` and its OpenAPI JSON is at `/api/docs/json`. The frontend listens on `http://localhost:5173` and proxies `/api` to the backend. The local Compose configuration binds PostgreSQL to `127.0.0.1:5433` (container port 5432) and keeps its data in a named volume. If that host port is already used, change the host port and `.env` together.

To run both applications as containers instead, use `docker compose up --build --wait -d` and open `http://127.0.0.1:8080`; Swagger UI is at `http://127.0.0.1:8080/api/docs/`. The [deployment guide](docs/deployment.md) explains the production stack and its separate TLS configuration.

```bash
npm run test:backend
npm run typecheck:backend
npm run build:backend
npm run typecheck:frontend
npm run build:frontend
```

For browser tests, install the test browser once, then run the journey on desktop and mobile widths against local PostgreSQL:

```bash
npm run test:e2e:install
npm run test:e2e
```

The backend tests use an in-memory implementation of the storage contract and do not require Docker. The browser tests start the Compose database, run migrations, and start the API and UI when needed. They use unique local test accounts and check task CRUD, responsive overflow, form/dialog behavior, and WCAG 2.0/2.1 A and AA rules with axe. GitHub Actions runs these checks on pushes and pull requests. The test suite does not reset your database; keep the local Compose database for development and repeat checks in each deployment environment.

## Current design choices

- Fastify handles HTTP and request validation; a storage interface keeps those concerns apart from PostgreSQL access.
- Drizzle defines the PostgreSQL schema in code and generates a versioned SQL migration.
- Passwords use Argon2id hashes. Random session tokens are hashed before storage and sent in HttpOnly cookies. State-changing authenticated requests require a per-session CSRF token.
- The task queries are scoped by the authenticated user ID. The frontend calls relative `/api` URLs so it can use the same origin when deployed.
- Authentication adds product scope beyond the assignment's minimum. Email verification, password recovery, and MFA are outside this assessment build.

## Assumptions and trade-offs

- The React app is the primary interface. The REST API is available for review and other clients, but the assessment does not require a separate CLI.
- Accounts and private task lists are an added product choice; the assignment itself permits a simpler single-user application. Each account sees only its own tasks.
- A due date is an optional calendar date in `YYYY-MM-DD` format. Past dates are valid, and no timezone conversion is applied. The server sets task IDs and creation timestamps.
- PostgreSQL provides persistence across application and database-container restarts when its named volume is retained. Removing that volume deletes local data.
- Filtering and sorting controls are optional in the brief and are not part of this implementation. The API returns tasks newest first.
- The production configuration is prepared but has not been deployed. A public endpoint, real certificate, backups, and recovery verification require an EC2 host and domain.

No AWS credentials are required to run the application locally. Provisioning an EC2 host, attaching a domain, issuing a public certificate, and checking the deployed service remain separate steps.
