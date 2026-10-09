# To Do Application

Foci take-home assessment. This repository contains two independently built applications in one Git repository:

- `apps/backend`: TypeScript API, authentication, task rules, and PostgreSQL access.
- `apps/frontend`: React and TypeScript user interface.

The [scope and acceptance criteria](docs/scope-and-acceptance.md), [API contract](docs/api-contract.md), [architecture and ERD](docs/architecture.md), [frontend plan](docs/frontend-plan.md), [Figma UX brief](docs/figma-ux-brief.md), [task-list refinement brief](docs/figma-filter-sort-ux-prompt.md), and [deployment guide](docs/deployment.md) record the design and delivery decisions. [Repository instructions for Copilot](.github/copilot-instructions.md) capture the coding conventions.

## Current status

| Area | Delivered |
| --- | --- |
| Accounts | Registration, sign-in, session restoration, sign-out, private task ownership, Argon2id password hashes, HttpOnly session cookies, and CSRF protection. |
| Tasks | Create, list, view by ID, edit, complete/reopen, and confirmed deletion; title and date validation; PostgreSQL persistence. |
| Task list | Server-side status filtering, stable sorting, 20-item pagination, accurate result counts, and distinct first-use and filtered-empty states. |
| Interface | Responsive React UI based on the Figma design, with loading and error feedback, accessible controls, and desktop/mobile browser checks. |
| API and delivery | OpenAPI/Swagger UI, code-first Drizzle schema and migration, separate Docker images, local Compose stack, and GitHub Actions verification. |

The EC2 demo now runs the HTTPS Compose configuration on a temporary DNS hostname. An external check verified the trusted certificate, TLS 1.3, HTTP-to-HTTPS redirect, and successful home-page and API-health responses. The authenticated task journey was verified on the initial HTTP demo and should be repeated after the HTTPS switch. SonarCloud, ZAP scanning, off-host backups, and a restore drill have not been completed. Email verification, password recovery, and MFA are outside this assessment build.

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

| Configuration | Purpose |
| --- | --- |
| [`apps/backend/.env.example`](apps/backend/.env.example) | Local API database connection and port template. |
| [`compose.yaml`](compose.yaml) | Loopback-only local web and database stack with migration step. |
| [`compose.test.yaml`](compose.test.yaml) | Disposable PostgreSQL instance for integration tests; separate from the development stack. |
| [`.env.production.example`](.env.production.example) and [`compose.production.yaml`](compose.production.yaml) | Production values and service topology; replace example secrets before deployment. |
| [`.env.demo.example`](.env.demo.example) and [`compose.demo.yaml`](compose.demo.yaml) | Isolated, temporary HTTP demo on a public IP; use only throwaway credentials and data. |
| [`apps/frontend/Caddyfile.production`](apps/frontend/Caddyfile.production) | HTTPS/TLS 1.3, same-origin API proxy, and security headers. |
| [`.github/workflows/verify.yml`](.github/workflows/verify.yml) | Push and pull-request verification. |

```bash
npm run test:backend
npm run test:postgres
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

The backend test command runs focused calendar-date unit cases and API tests against an in-memory implementation of the storage contract; it does not require Docker. `npm run test:postgres` starts a separate, disposable PostgreSQL container on loopback port 5434, migrates it, checks real database ownership, filtering, sorting, pagination, and persistence across a connection restart, then removes the test container. It never uses the development database. The browser tests start the development Compose database, run migrations, and start the API and UI when needed. They use unique local test accounts and check task CRUD, responsive overflow, form/dialog behavior, and WCAG 2.0/2.1 A and AA rules with axe. GitHub Actions runs these checks on pushes and pull requests. The browser suite does not reset your development database; keep the local Compose database for development and repeat checks in each deployment environment.

The [CI workflow](.github/workflows/verify.yml) runs type checks, backend unit and API tests, PostgreSQL integration tests, frontend and backend builds, desktop/mobile browser tests, production Compose validation, Docker builds, and Caddy configuration validation. There is currently no dedicated formatter or linter command in CI; that gap is recorded in the [acceptance status](docs/scope-and-acceptance.md#implementation-status).

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
- Filtering and sorting controls are optional in the brief and implemented here. The API defaults to newest first and returns at most 20 tasks per page. Offset pagination keeps this assessment's expected list sizes bounded; a cursor would be preferable for very deep lists or frequently changing large datasets.
- The HTTPS configuration is deployed to a single EC2 host using a temporary third-party DNS hostname. A trusted certificate and TLS 1.3 were externally verified; off-host backups and a restore drill have not been completed. This short-lived assessment demo is not a durable production service.

No AWS credentials are required to run the application locally. The [deployment guide](docs/deployment.md) records the EC2 layout, HTTPS setup, and verification boundaries.
