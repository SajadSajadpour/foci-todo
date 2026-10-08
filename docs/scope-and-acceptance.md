# Foci To Do Assessment Scope and Acceptance Criteria

## Purpose

Build a small, responsive to-do application that demonstrates clear requirements, maintainable full-stack code, meaningful tests, and an implementation Sajad can explain and own. This document records the original acceptance criteria and the current delivery status.

## Assignment requirements

The assignment requires create, list, view by ID, update, complete, mark incomplete, and delete. A task has a required title, optional description and due date, completion status defaulting to false, and a creation timestamp. Data must persist between runs. The submission needs a Git repository, a root README covering setup, tests, design choices and assumptions, and a reasonably clean commit history. Foci described an estimate of focused effort, not a submission deadline.

## Delivered product scope

One repository contains two independently run applications: a React and TypeScript frontend and a TypeScript backend, with PostgreSQL persistence. The frontend is the primary interface. The backend also exposes a documented REST API. Account registration, login, logout, and private tasks are additional user-requested features. A user can access only their own tasks.

The interface has a responsive task list, create and edit form, task detail view, completion control, and delete confirmation. The task list also has status filtering, sorting, and 20-item server-side pagination. Figma guided the interface, and the implementation was checked in desktop and mobile browsers. Figma output is a design reference; the running application and accessibility checks determine the delivered behavior.

## PRD 001 Task management

| ID | Acceptance criterion |
| --- | --- |
| T1 | A signed-in user can create a task with a nonblank title. The server assigns a unique ID, `createdAt`, and `isCompleted = false`. |
| T2 | A signed-in user can list their tasks, seeing title, due date, and completion status. An empty list has a clear empty state. |
| T3 | A signed-in user can open a task by ID and see all task fields. A missing or inaccessible task returns not found without revealing another user's task. |
| T4 | A signed-in user can update title, description, and due date. Omitted fields stay unchanged. Optional fields can be cleared. |
| T5 | A signed-in user can set completion to true or false. Repeating either operation leaves the task in the requested state. |
| T6 | A signed-in user can delete a task after confirmation. It no longer appears and remains deleted after restart. |
| T7 | Title is trimmed and cannot be blank. Due date must be a real `YYYY-MM-DD` calendar date; past dates are allowed. Invalid input produces field-level feedback. |
| T8 | Failed network or server requests show an error and do not falsely show success. Unsaved form input is retained where practical. |
| T9 | Tasks persist when the applications restart and when the database container restarts with its volume intact. |

## PRD 002 Accounts and delivery

| ID | Acceptance criterion |
| --- | --- |
| A1 | A visitor can register with a unique email address and password, then sign in and sign out. Duplicate emails and invalid credentials receive clear, safe errors. |
| A2 | Passwords are stored only as adaptive password hashes. Authentication secrets are not exposed to browser JavaScript or committed to the repository. |
| A3 | The server checks the signed-in user's identity on every task request and scopes every database operation to that user. Direct requests for another user's task cannot read or modify it. |
| A4 | Session cookies use secure production settings; state-changing requests have CSRF protection appropriate to the chosen cookie design. Logout invalidates the session. |
| A5 | The frontend and backend each build and run independently. A documented local setup starts both and PostgreSQL. |
| A6 | The database schema is defined in code with a versioned migration. A fresh database can be initialized from documented commands. |
| A7 | OpenAPI documentation matches the implemented API, including validation and error responses. |
| A8 | Automated checks cover account flows, task CRUD, ownership isolation, validation, persistence, and the main browser journey. CI runs formatting, lint, type checks, tests, and builds. |
| A9 | The root README gives the fastest path to running the application, running tests, and understanding assumptions and tradeoffs. |
| A10 | Docker images and Compose support reproducible local setup. Deployment documentation explains configuration, migrations, HTTPS, health checks, and recovery. |

## Implementation status

| Criteria | Status and evidence |
| --- | --- |
| T1–T8, A1–A7, A9 | Implemented in the API and React UI; covered by backend and desktop/mobile browser tests as applicable. See the [API contract](api-contract.md), [architecture](architecture.md), and [root README](../README.md). |
| T9 | PostgreSQL persistence uses a named Compose volume. Browser tests verify that saved task changes survive a page reload; an automated database-container restart test is not included. |
| A8 | Partially complete: CI runs type checks, backend tests, frontend/backend builds, browser journeys with accessibility checks, and production configuration checks. Dedicated formatting and lint commands are not configured. |
| A10 | Local Docker images and Compose run; production Compose, Caddy TLS 1.3 configuration, and deployment/recovery instructions are prepared. Public deployment, off-host backups, and a restore drill remain unverified. |

Status filtering, stable sorting, 20-item pagination, and distinct first-use and filtered-empty states were added beyond the minimum task requirements. SonarCloud and ZAP scanning were considered but have not been run. The [task-list UX brief](figma-filter-sort-ux-prompt.md) records the later design refinement.

## Data model

`users`: `id`, `email` (unique), `passwordHash`, `createdAt`.

`sessions`: `id`, `userId`, `tokenHash`, `csrfToken`, `expiresAt`, `createdAt`.

`todos`: `id`, `userId`, `title`, `description`, `dueDate`, `isCompleted`, `createdAt`.

`dueDate` is a calendar date. `createdAt` is a timestamp. The backend owns IDs and timestamps. A foreign key connects each task to its owner. The [architecture document](architecture.md) contains the implemented ERD and application journey diagrams.

## Delivery choices to record and review

- Keep task management easy to exercise through the UI and API.
- Use a feature-based structure in each application, with explicit HTTP, business-rule, and persistence boundaries in the backend.
- Keep repeated domain values and configuration centralized without hiding simple one-off values behind unnecessary constants.
- Use a small Figma prompt and wireframe to guide responsive UI; implement labelled controls, visible focus, and clear loading, empty, and error states.
- Add SonarCloud if the project and account are available. Treat findings as review inputs, not a replacement for tests.
- EC2 deployment, TLS configuration, and ZAP scanning are additional delivery work. Record what was actually completed and verified rather than presenting a plan as a completed control.
- Do not add account recovery, email verification, social login, or multi-factor authentication unless the product scope is explicitly expanded. The README must say those account features are outside this assessment implementation.

## Remaining delivery work

Run a dedicated formatter and linter in CI if those checks are retained as acceptance criteria. If publishing a live demo, provision the EC2 host and domain, verify real TLS and task journeys, set up off-host backups, and test a restore. SonarCloud and ZAP remain optional review additions rather than completed controls.
