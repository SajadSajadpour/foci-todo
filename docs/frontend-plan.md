# Frontend plan

## Goal and scope

Build a small, polished React and TypeScript interface for the implemented `/api` contract. The primary journey is register, sign in, create a task, find it in the list, open it, edit it, mark it complete or incomplete, and delete it. The UI must work at mobile and desktop widths and make loading, empty, validation, and failure states clear.

Keep the product focused. Do not add projects, teams, AI assistants, recurring tasks, notifications, priority, or server-side search: none exist in the current API. The implemented list filters, sorts, and paginates through the backend so the browser does not load every task at once.

## Screens and behavior

| Screen | Primary content | Key states |
| --- | --- | --- |
| Sign in | Email, password, submit, link to registration | Invalid credentials, submitting, offline/server error |
| Register | Email, password, confirmation, submit, link to sign in | Duplicate email, invalid input, submitting; successful registration leads to sign in |
| Task list | Header, new-task action, status filter, sort order, result count, pagination, task rows showing title, due date, and completion | Loading, first-use empty, filtered empty, list, failed load, completion failure |
| Task detail | Title, description, due date, status, created date, edit/delete controls | Loading, not found, failed load |
| Create/edit task | Title, optional description, optional due date, save/cancel | Field errors, saving, failed save with input retained |
| Delete confirmation | Task title, clear destructive action and cancel | Deleting, failure without closing prematurely |

Use a route for `/login`, `/register`, `/tasks`, `/tasks/new`, `/tasks/:id`, and `/tasks/:id/edit`. The delete confirmation can be a dialog. After login, go to `/tasks`; after logout or a verified expired session, go to `/login`. After creation or editing, show the task detail or list with the saved value. Use explicit `isCompleted: true/false` updates rather than a blind toggle request.

## Implementation boundaries

```text
apps/frontend/
  src/
    app/                 routing and protected routes
    features/auth/       sign-in/register forms and auth state
    features/tasks/      list, detail, editor, completion, delete dialog
    shared/api/          typed fetch client and API error mapping
    shared/components/   brand and feedback components
    styles/              tokens and responsive global styles
```

The backend remains the source of truth. A small typed API client sends `credentials: 'include'` to relative `/api` paths. The Vite development server proxies `/api` to the backend. The session cookie is HttpOnly; do not read or store it in JavaScript. Keep the CSRF token in memory, obtained from login or `/api/auth/me` after refresh, and include it on authenticated mutations. A `401` triggers a session check/redirect; failures never produce a false success state. Clear the local session state on logout.

Keep task data local to the task feature. A straightforward query/mutation approach is sufficient for this app; avoid a global state framework unless the implementation shows a need. Use semantic HTML, labels, keyboard-operable controls, focus indicators, an accessible dialog, and a polite live region for save/error feedback. Use native date input with a date-only `YYYY-MM-DD` value. Do not convert a due date through a timezone timestamp.

## Responsive layout

- Desktop: a restrained app shell with a clear page heading, primary new-task button, comfortable reading width, and a task list that scans easily.
- Mobile: one-column layout, touch-sized controls, no horizontal scrolling, prominent create action, and forms that fit a narrow viewport.
- Use a small visual system: typography scale, color tokens, spacing, radii, button/field states. Visual polish must not hide the task status or actions.

## Implementation sequence and reviewable commits

1. Scaffold Vite/React/TypeScript, routing, global styles, API client, and local proxy. Confirm the app builds.
2. Implement session bootstrap and sign-in/register/logout. Exercise the real backend flow.
3. Implement task list, empty/loading/error states, and create form.
4. Implement detail/edit/completion/delete and responsive polish.
5. Add meaningful frontend/browser tests, accessibility checks, and README setup. Run the complete application against PostgreSQL before claiming persistence works.

## Figma design brief

Create a high-fidelity, editable, responsive design for a focused personal task app named **Foci Tasks**. This is a professional software engineering assessment, so make it calm, credible, and useful rather than a generic productivity dashboard. Use a light theme, warm neutral background, dark readable type, one restrained accent color, generous whitespace, and subtle borders. The result should look intentional and implementable with React and CSS.

Design desktop (1440px) and mobile (390px) versions of: sign in, registration, populated task list, first-use and filtered-empty task lists, task detail, create/edit task form, and delete confirmation. The task list has an All tasks/Incomplete/Completed status control, a sort control, server-provided result counts, and pagination. Show realistic example tasks. A task has only title, optional description, optional due date, completed status, and creation date. Make completed and incomplete tasks visually distinct without relying on color alone. Show loading, validation, and network error treatments as reusable states or annotations. The [task-list refinement brief](figma-filter-sort-ux-prompt.md) records the final list-control design.

The main journey is register -> sign in -> task list -> create -> detail -> edit -> complete/reopen -> delete. Give the list a prominent “New task” action. Keep forms concise. Use clear labels, visible focus, accessible contrast, touch-sized targets, and a keyboard-friendly confirmation dialog. On mobile, keep all key actions available without horizontal scrolling. Define reusable colors, typography, spacing, buttons, fields, task rows, badges, feedback messages, and dialog components. Do not add features absent from the app: no AI assistant, projects, teams, priority, recurring tasks, notifications, or analytics.

Provide screens and components that developers can inspect and build directly. Do not generate application code or backend features.
