# Frontend application

React, TypeScript, and Vite application for Foci Tasks. The [Figma design](https://www.figma.com/design/bkxL11PSa0qyKg91uXiHQk/Foci-Tasks-UX?node-id=0-1) guides the responsive visual system. The app uses relative `/api` requests; Vite proxies them to the backend on port 3000 in development.

## Current status

Sign-in, registration, session restoration, sign-out, API error handling, and protected routing are implemented. The task list, create/edit forms, detail page, completion/reopening, and confirmed deletion are wired to the API. The UI includes loading, empty, validation, and failure states.

## Run

From the repository root, install dependencies with `npm ci`, start PostgreSQL and the backend using the root README, then run:

```bash
npm run dev:frontend
```

Open `http://localhost:5173`. Run `npm run typecheck:frontend` and `npm run build:frontend` for static checks. The login and registration flows require a running backend and PostgreSQL database. The authentication and task screens were checked at desktop and narrow mobile widths. A live PostgreSQL browser check covered sign-in, creation, title validation, editing, canceling and confirming deletion, and empty-state return. Broader automated browser and accessibility checks remain.
