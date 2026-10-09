# Foci Tasks

> **Try the live assessment demo first**
>
> [Open the app](https://99-79-191-113.sslip.io/) · [Explore the Swagger UI](https://99-79-191-113.sslip.io/api/docs/) · [View the OpenAPI JSON](https://99-79-191-113.sslip.io/api/docs/json)
>
> Register your own account with a password of at least 12 characters, then sign in. There is no shared demo account or seeded task data; each account has a private task list. This temporary demo may be shut down after the assessment.

Foci take-home assessment. This repository contains two independently built applications in one Git repository:

- `apps/backend`: TypeScript API, authentication, task rules, and PostgreSQL access.
- `apps/frontend`: React and TypeScript user interface.

The [scope and acceptance criteria](docs/scope-and-acceptance.md), [API contract](docs/api-contract.md), [architecture and ERD](docs/architecture.md), [frontend plan](docs/frontend-plan.md), [Figma UX brief](docs/figma-ux-brief.md), [task-list refinement brief](docs/figma-filter-sort-ux-prompt.md), [deployment guide](docs/deployment.md), and [security review](docs/security-review.md) record the design and delivery decisions. [Repository instructions for Copilot](.github/copilot-instructions.md) capture the coding conventions.

## Reviewer quick start

The repository also contains everything needed to run the app locally. The same registration and sign-in flow works in the local stack.

To run the complete app from this Git repository, install Git, Node.js **22.12 or later**, and Docker with Compose. With Docker running:

```bash
git clone https://github.com/SajadSajadpour/foci-todo.git
cd foci-todo
npm run setup:local
docker compose up --build --wait -d
```

Open `http://127.0.0.1:8080`, register a new account, and sign in. API documentation is at `http://127.0.0.1:8080/api/docs/`. `setup:local` creates ignored, owner-only environment files with a random local database password. No AWS account, Figma account, production secret, or existing user credential is needed. `docker compose down` stops the local stack and keeps its database volume; `docker compose down -v` also deletes that local data.

This setup was checked from a fresh public Git clone on October 9, 2026: dependency installation, builds, backend tests, a new Compose database and app, registration, login, task creation, and task listing all passed.

## Current status

The repository includes [CI-gated deployment instructions](docs/continuous-deployment.md) using GitHub OIDC and AWS Systems Manager. Deployment credentials, instance settings, and secrets are configured outside Git; the public demo URL is linked above. The workflow deploys only after a passing main-branch verification and checks the HTTPS health endpoint.

| Area | Delivered |
| --- | --- |
| Accounts | Registration, sign-in, session restoration, sign-out, private task ownership, Argon2id password hashes, HttpOnly session cookies, and CSRF protection. |
| Tasks | Create, list, view by ID, edit, complete/reopen, and confirmed deletion; title and date validation; PostgreSQL persistence. |
| Task list | Server-side status filtering, stable sorting, 20-item pagination, accurate result counts, and distinct first-use and filtered-empty states. |
| Interface | Responsive React UI based on the Figma design, with loading and error feedback, accessible controls, and desktop/mobile browser checks. |
| API and delivery | OpenAPI/Swagger UI, code-first Drizzle schema and migration, separate Docker images, local Compose stack, and GitHub Actions verification. |

The HTTPS Compose configuration uses Caddy for TLS 1.3, HTTP-to-HTTPS redirection, and same-origin API proxying. The [security review](docs/security-review.md) records SonarQube Cloud and ZAP results and their limits; the repeat passive baseline reported no high, medium, or low alerts. Off-host backups and a restore drill have not been completed. Email verification, password recovery, and MFA are outside this assessment build.

## Run as development servers

Use this two-terminal path when editing the API or React UI. Requirements are Node.js 22.12 or later, npm, and Docker with Compose. Docker must be running for the database commands.

```bash
npm ci --ignore-scripts
npm run setup:local
docker compose up --wait -d db
npm run db:migrate -w @foci/backend
npm run dev:backend
```

In a second terminal from the repository root:

```bash
npm run dev:frontend
```

`setup:local` creates matching, ignored `.env` and `apps/backend/.env` files with a random local database password. If you already have one file, create the other with the same password; the script will not overwrite existing settings or reset your database. The API listens on `http://localhost:3000`; `GET /api/health` provides a basic health response. Interactive API documentation is at `http://localhost:3000/api/docs/` and its OpenAPI JSON is at `/api/docs/json`. The frontend listens on `http://localhost:5173` and proxies `/api` to the backend. The local Compose configuration binds PostgreSQL to `127.0.0.1:5433` (container port 5432) and keeps its data in a named volume. If that host port is already used, change the host port and backend `.env` together.

The local setup command creates both secret-bearing files with owner-only (`600`) permissions and tightens permissions on both existing files when rerun. It does not alter their contents. The [deployment guide](docs/deployment.md) explains the production stack and its separate TLS configuration.

| Configuration | Purpose |
| --- | --- |
| [`apps/backend/.env.example`](apps/backend/.env.example) | Local API database connection and port template; `setup:local` generates the actual ignored settings. |
| [`compose.yaml`](compose.yaml) | Loopback-only local web and database stack with migration step. |
| [`compose.test.yaml`](compose.test.yaml) | Disposable PostgreSQL instance for integration tests; separate from the development stack. |
| [`.env.production.example`](.env.production.example) and [`compose.production.yaml`](compose.production.yaml) | Production values and service topology; replace example secrets before deployment. |
| [`.env.demo.example`](.env.demo.example) and [`compose.demo.yaml`](compose.demo.yaml) | Isolated, temporary HTTP demo on a public IP; use only throwaway credentials and data. |
| [`apps/frontend/Caddyfile.production`](apps/frontend/Caddyfile.production) | HTTPS/TLS 1.3, same-origin API proxy, and security headers. |
| [`.github/workflows/verify.yml`](.github/workflows/verify.yml) | Push and pull-request verification. |
| [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | Deploy a verified main-branch commit to EC2 through AWS Systems Manager. |
| [`.sonarcloud.properties`](.sonarcloud.properties) | Keep archived scanner reports out of application-source quality metrics. |

```bash
npm run test:backend
npm run test:postgres
npm run check:quality
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

The [CI workflow](.github/workflows/verify.yml) runs Biome formatting, lint and import checks, type checks, backend unit and API tests, PostgreSQL integration tests, frontend and backend builds, desktop/mobile browser tests, production Compose validation, Docker builds, and Caddy configuration validation. Run `npm run format` to apply safe formatting and import fixes locally. The [manual ZAP baseline workflow](.github/workflows/zap-baseline.yml) reads the HTTPS target from the `DEPLOY_SITE_URL` repository variable, performs a passive scan, and saves a report artifact; it does not authenticate into private task pages. Run it from GitHub Actions → Passive security scan → Run workflow after configuring that variable.

## Why these dependencies

| Choice | Reason |
| --- | --- |
| TypeScript and npm workspaces | Strict types across two independently built apps, with one lockfile and one set of root verification commands. |
| React, React Router, and Vite | Component-based task screens, explicit client routes, and a small static production build; this app does not need server-rendered pages. |
| `tsx`, React's Vite plugin, and `@types/*` packages | Run the TypeScript API during development, compile React with Vite, and provide compile-time Node/PostgreSQL/React types. They are development tools rather than application services. |
| Fastify, `@fastify/cookie`, and Swagger packages | A compact HTTP API with request validation, cookie sessions, and an inspectable OpenAPI contract. |
| PostgreSQL, `pg`, Drizzle ORM, and Drizzle Kit | Durable relational ownership, typed queries and schema, and versioned SQL migrations. Drizzle Kit runs during development; it is not in the backend runtime image. |
| Argon2 | Adaptive Argon2id password hashing. Session tokens are random and stored as hashes rather than plaintext. |
| Caddy and Docker Compose | A same-origin `/api` reverse proxy with automatic HTTPS on EC2, plus repeatable local services and a migration step. |
| Vitest, Playwright, and axe | Fast rule/API tests, real PostgreSQL and browser journeys, and automated accessibility checks at desktop and mobile sizes. |
| Biome and bundled Inter/Lora fonts | One formatter/linter for consistent code and locally served fonts, avoiding a runtime font-service dependency. |

## Development approach and UI style

The [scope and acceptance criteria](docs/scope-and-acceptance.md) define the behavior first; the [API contract](docs/api-contract.md) and [architecture](docs/architecture.md) describe the implementation boundaries. Backend HTTP handling, task rules, and PostgreSQL access are separated so each can be checked at the right level. Frontend code is grouped by auth and task features; the API remains the source of truth for filtering, sorting, counts, and pagination. The [Figma design](https://www.figma.com/design/bkxL11PSa0qyKg91uXiHQk/Foci-Tasks-UX?node-id=0-1) guided layout and states, while working API data and browser checks determined the delivered behavior.

The visual system uses a warm neutral canvas, pine-green actions, Inter for interface text, and Lora for headings. CSS variables centralize colors, the content width is restrained on desktop, and layouts switch to one column at narrow widths. Controls have visible focus and clear loading, empty, error, and confirmation states. Plain CSS and small shared components kept the design editable without a UI framework or global state library.

Changes were committed in reviewable steps and checked by the [Verify workflow](.github/workflows/verify.yml) before [automatic deployment](docs/continuous-deployment.md). For a code change, run the relevant unit/API and database tests, type checks, builds, and browser journey; CI runs the full set. [SonarQube Cloud and ZAP evidence](docs/security-review.md) adds static and passive review, with their limits documented rather than treated as proof of complete security.

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
- The HTTPS Compose configuration targets one host. A durable service would need off-host backups, a restore drill, and an owned hostname; those operations are outside this assessment build.

No AWS credentials are required to run the application locally. The [deployment guide](docs/deployment.md) records the EC2 layout, HTTPS setup, and verification boundaries.
