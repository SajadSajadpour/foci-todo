# Frontend application

React, TypeScript, and Vite application for Foci Tasks. The [Figma design](https://www.figma.com/design/bkxL11PSa0qyKg91uXiHQk/Foci-Tasks-UX?node-id=0-1) guides the responsive visual system. The app uses relative `/api` requests; Vite proxies them to the backend on port 3000 in development.

## Current status

Sign-in, registration, session restoration, sign-out, API error handling, and protected routing are implemented. The task list, create form, read-only detail page, and completion/reopening are wired to the API. The UI includes loading, empty, validation, and failure states. Editing and deletion are still pending, so the frontend is not yet a complete submission.

## Run

From the repository root, install dependencies with `npm ci`, start PostgreSQL and the backend using the root README, then run:

```bash
npm run dev:frontend
```

Open `http://localhost:5173`. Run `npm run typecheck:frontend` and `npm run build:frontend` for static checks. The login and registration flows require a running backend and PostgreSQL database. The authentication and task screens were visually checked at desktop and narrow mobile widths. A browser smoke test of task creation and completion used a local test API; a live PostgreSQL API smoke test passed, while a full browser end-to-end test against PostgreSQL remains pending.
