# Foci Tasks — filter, sort, and empty-state refinement

Use this prompt in the **existing Foci Tasks UX** Figma file. This updates the task-list portion of the earlier UX brief: the application now supports server-side filtering, sorting, and pagination.

---

Refine the existing **Foci Tasks “My tasks” page**. Keep its current visual identity, typography, colours, navigation, task rows, and **New task** action. Focus on making filtering, sorting, results, pagination, and empty states feel like one polished, production-ready experience. Choose one strong design direction rather than presenting alternatives.

The app currently supports:

- Status filter: **All tasks**, **Incomplete**, **Completed**.
- Sort order: **Newest first**, **Oldest first**, **Due date, soonest**, **Title A–Z**.
- Server-side pagination: **20 tasks per page**, with **Previous** and **Next** actions when there is more than one page.
- A results summary such as **Showing 21–40 of 87 tasks**.

Do not add search, tags, priorities, projects, or other features the app does not have. Do not imply the filter or sort affects only the visible page; both apply to the full task collection before pagination.

Design the complete interaction. Make the selected status immediately obvious and the sort order easy to understand. Place the controls so they feel integrated with the task list rather than like a separate form. Decide whether the status control works best as tabs, a segmented control, or a labelled select; make the choice fit the existing product. Show how the user changes and clears a filter. Preserve the current choices exactly. Include selected, hover, focus, and open-menu states where relevant. Use explicit accessible labels, strong contrast, visible keyboard focus, and touch targets of at least 44 px.

Create editable, clearly named frames for:

1. **Desktop, populated list (1440 px):** several realistic tasks, an active status filter, sort control, results count, and pagination showing a middle page.
2. **Desktop, filtered empty:** the selected **Completed** view contains no tasks while other tasks exist. Make this state intentional and visually balanced, with clear copy explaining why the list is empty and a prominent **Show all tasks** action. Keep the filter controls visible and show that Completed is selected.
3. **Mobile, populated list (390 px):** the same functions with comfortable spacing, clear hierarchy, no clipped text, and no horizontal scrolling.
4. **Mobile, filtered empty (390 px):** the same explanation and recovery action, fitted gracefully below the controls.
5. **First-use empty list:** a distinct state for an account with no tasks at all, with a **New task** action. Do not confuse this with a filtered-empty result.
6. **Controls and state detail:** reusable control components with focus/selected/open states and a brief annotation describing their behaviour on desktop and mobile.

For the filtered-empty state, use concise, useful copy. A restrained vector icon or small illustration is welcome, but avoid stock art, large decorative graphics, or a bare heading floating in whitespace. Keep the page calm and refined, consistent with the existing warm neutral and deep green design language.

Use Auto Layout, reusable components, editable text and vectors, and realistic task examples. Keep the implementation feasible in React and CSS. Add short handoff notes for spacing, responsive behaviour, active-state styling, and what happens when a user selects a filter while on a later page: the page resets to page 1.

Before finishing, check the design at 1440 px and 390 px, including long task titles and the longest sort label. The final frames should make it clear exactly how to implement the filter controls, results summary, pagination, first-use empty state, and filtered-empty state.
