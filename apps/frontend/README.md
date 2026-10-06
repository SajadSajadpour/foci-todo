# Frontend application

React, TypeScript, and Vite application for Foci Tasks. The [Figma design](https://www.figma.com/design/bkxL11PSa0qyKg91uXiHQk/Foci-Tasks-UX?node-id=0-1) guides the responsive visual system. The app uses relative `/api` requests; Vite proxies them to the backend on port 3000 in development.

## Current status

The sign-in and registration screens are implemented, along with session restoration, sign-out, API error handling, and protected routing. The `/tasks` route is an explicit placeholder while the task list, detail, editor, and delete flow are built in subsequent steps. The frontend is not yet a complete submission.

## Run

From the repository root, install dependencies with `npm ci`, start PostgreSQL and the backend using the root README, then run:

```bash
npm run dev:frontend
```

Open `http://localhost:5173`. Run `npm run typecheck:frontend` and `npm run build:frontend` for static checks. The login and registration flows require a running backend and PostgreSQL database. The authentication screen layout was checked in a browser at desktop, 390px, and 320px widths; a full end-to-end authentication test against PostgreSQL remains pending.
