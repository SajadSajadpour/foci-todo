# Foci Tasks — Figma UX and UI design brief

## Your assignment

Create a high-fidelity, fully editable Figma Design file for **Foci Tasks**, a personal task-management web application. Treat this as the design specification for a real React application, not a speculative concept or a generated website. The result should be elegant, distinctive, accessible, responsive, internally consistent, and realistic to implement.

Create actual Figma frames and reusable components. Organize the canvas so an engineer can inspect the design system, screen states, and responsive behavior. Do not generate backend code, invent unsupported product features, or present the design as a working application.

## Product purpose and boundaries

The app helps one signed-in person manage their private to-do tasks. The complete supported journey is:

1. Register an account with email and password.
2. Sign in.
3. See their paginated task list, filter by completion status, choose a sort order, and create a task.
4. Open a task to read all its details.
5. Edit its title, description, or due date.
6. Mark it complete or reopen it.
7. Delete it after explicit confirmation.
8. Sign out.

A task has only these fields: required title; optional description; optional due date; completed or incomplete status; creation date. The system assigns the ID and creation date. The due date is a **calendar date**, not an appointment time. Past dates are allowed. Do not add priority, tags, projects, teams, assignees, recurrence, reminders, notifications, AI assistance, analytics, or settings. Do not show account profile data that the product does not provide; a simple “My tasks” header and sign-out action are sufficient.

The task list should be the center of the product. The create action must be easy to find. Completion must be clear and reversible. Editing and deleting should be available without crowding every task row with competing controls.

## Design quality bar

Aim for a premium, mature productivity tool rather than a generic dashboard template. Use a light visual direction: warm off-white or soft neutral page background; deep ink text; a restrained teal, pine, or similarly confident accent; quiet borders; very limited shadows; and excellent typography. Use generous whitespace, a disciplined spacing scale, strong alignment, and thoughtful density. A small editorial touch is welcome, but usability must lead. Avoid gradients, glass effects, oversized illustrations, floating decoration, loud metric cards, and heavy nested panels.

The design should look compelling in a portfolio screenshot and remain practical in daily use. Make hierarchy obvious at a glance: page title, primary action, task content, secondary controls, and status. Use realistic task copy. Completed tasks must be distinguishable by label/icon/typography as well as color. Use no stock imagery unless it clearly helps an empty state; a well-composed text-first empty state is preferred.

Define a coherent design system: colors with semantic roles, typography scale, spacing scale, radii, borders/elevation, icons, and component variants. Use reusable Figma components and Auto Layout. Name frames and layers clearly. Prefer components for buttons, form controls, task rows, status labels, alerts, and dialogs. Include hover, focus, pressed, disabled, loading, error, and destructive variants as appropriate. Make selected and completed states unambiguous.

## Screen inventory

Create all of these screens. The desktop and mobile versions should look like the same product rather than separate concepts.

### 1. Sign in

Email and password fields, a primary sign-in action, a link to registration, and a place for invalid-credentials or server-error feedback. Show submitting/disabled behavior. Use concise, welcoming copy without marketing clutter. Do not show social login or password recovery; they are outside this implementation.

### 2. Registration

Email, password, and confirm-password fields; clear guidance that the password must be at least 12 characters; registration action; link back to sign in. Show field validation and duplicate-email feedback. Successful registration leads to the sign-in screen; it does not silently log the user in. Do not show email verification or MFA.

### 3. Populated task list

App identity, “My tasks” heading, clear “New task” action, sign-out action, and an easy-to-scan list with realistic tasks. Each row shows title, due date when present, and completion state. Some tasks have no due date; some are complete. Make the whole list usable at a glance and make the task title/row obviously openable. Show what happens when a user completes or reopens a task. The implemented list has server-side status filtering (All tasks, Incomplete, Completed), sorting (Newest first, Oldest first, Due date, soonest, Title A–Z), and 20-item pagination. Show accurate server-provided result counts; do not derive totals from only the visible page. The detailed control and empty-state design is in `figma-filter-sort-ux-prompt.md`.

### 4. Empty task list

A reassuring empty state for a new account, with a clear route to creating the first task. Do not imply data loss or an error. Keep it aligned with the main list layout.

### 5. Task detail

Display complete title, description or a graceful absence state, due date or “No due date,” completed/incomplete status, and creation date. Provide edit, complete/reopen, and delete actions, plus a clear route back to the list. The destructive action must be visually secondary until its confirmation dialog.

### 6. Create and edit task

Use one consistent form pattern for both screens. Title is required; description and due date are optional. Include save and cancel. Make it clear how the optional fields can be cleared during editing. Show inline field errors for blank title or invalid date, a saving state, and a failed-save state that retains entered values. Do not convert the date into a time picker.

### 7. Delete confirmation

An accessible confirmation dialog that names the task and states that deletion cannot be undone. Provide a safe Cancel action and a clearly destructive Delete action. Show a deleting state and a failure state that leaves the dialog open so the person can retry or cancel. Do not delete a task directly from a single unconfirmed click.

## Additional state designs

Create a compact state gallery or annotated component variants for: initial task-list loading, task-detail loading, empty list, network failure with retry, invalid credentials, duplicate email, inline form validation, save in progress, save failure with input retained, successful task update, session expired, and task not found. These do not all need full-screen duplicates if reusable components and clear annotations communicate the behavior.

Do not use success messages to imply a failed network request succeeded. Do not erase draft form input when a save fails. A session-expired state should guide the user to sign in again.

## Responsive deliverables

Produce full desktop **1440px** and mobile **390px** versions of every primary screen. Also show a representative **768px tablet** layout for the populated task list, task detail, and form. Define responsive constraints or brief annotations for **320px, 1024px, and 1920px** widths. Use Auto Layout and sensible min/max widths so layouts adapt rather than scale down as images.

- At 1920px, cap the content width to preserve readability instead of stretching the task list across the display.
- At 1024px and 768px, preserve hierarchy and useful spacing without hiding actions.
- At 390px and 320px, use one column, no horizontal scrolling, no clipped text, and touch targets of at least approximately 44px.
- The form and dialog must fit small viewports and remain usable with the software keyboard open.
- Avoid controls that appear only on hover; touch users need an equivalent visible path.

## Accessibility and interaction

Use strong text/background contrast, explicit labels, descriptive actions, visible keyboard focus, and a logical tab order. Status must not rely on color alone. Design a keyboard-operable modal with a clear focus order and safe escape/cancel path. Error messages should identify the relevant field or operation and say what the person can do next. Reserve sufficient space for longer task titles and descriptions without broken layout. Keep motion subtle and optional.

If creating a clickable prototype is supported, connect the main journey: sign in → list → create → detail → edit → complete/reopen → delete confirmation → list. The prototype is illustrative; do not invent server behavior to make it appear complete.

## Suggested realistic content

Use examples such as “Review project proposal,” “Prepare notes for Thursday meeting,” “Update onboarding checklist,” and “Book dentist appointment.” Mix short and long titles, descriptions, due dates, tasks without due dates, and completed tasks. Include one long-title example to test truncation and wrapping. Avoid lorem ipsum and real personal data.

## Canvas organization and output checklist

Organize the file into clearly labelled areas:

1. **Foundations and components** — tokens and reusable variants.
2. **User journey** — primary desktop and mobile screens in journey order.
3. **Responsive examples** — tablet and breakpoint notes.
4. **States and edge cases** — component variants or annotated examples.

Before finishing, check that every requested feature is represented, all primary screens have desktop and mobile variants, the tablet examples are present, forms are labelled, actions are understandable, and the design contains no unsupported features. If generation capacity is limited, complete the primary desktop/mobile journey first, then add the tablet and state gallery in the same visual system. Keep all output editable and organized for developer handoff.
