# To Do Application

Foci take-home assessment. This repository will contain two independent applications in one Git repository:

- `apps/backend`: TypeScript API, authentication, task rules, and PostgreSQL access.
- `apps/frontend`: React and TypeScript user interface.

The product scope and acceptance criteria are in the [planning document](../Foci%20Todo%20Scope%20and%20Acceptance%20Criteria.md). The [API contract](docs/api-contract.md) and [architecture decisions](docs/architecture.md) are recorded before implementation.

## Current status

Repository structure and design contract are established. Application code, tests, local setup, and deployment have not been implemented yet. The next step is a working vertical slice: register, sign in, create a task, and list the signed-in user's tasks.

## Planned local setup

The completed README will provide exact installation, database migration, run, and test commands. A fresh checkout must work without AWS credentials.
