# Implementation Plan: To-Do List Life Dashboard

## Overview

Implement a single-page productivity dashboard using only HTML, CSS, and vanilla JavaScript. All state is persisted to `localStorage`. The build produces three static files (`index.html`, `css/style.css`, `js/app.js`) with no build step, deployable directly to GitHub Pages.

Implementation follows a bottom-up order: scaffold → persistence layer → controllers (theme first to prevent flash, then greeting, timer, tasks, links) → styles → bootstrap wiring → stretch-challenge verification → smoke test prep.

Property-based tests use **fast-check** and unit tests use **Vitest**. Test sub-tasks are optional and marked with `*`.

---

## Tasks

- [x] 1. Project scaffold — file structure and test harness
  - [x] 1.1 Create the directory tree and stub files
    - Create `index.html` with standard HTML5 boilerplate, a `<head>` placeholder for the inline theme script and `<link>` to `css/style.css`, and a `<body>` with four empty section placeholders (`#greeting`, `#timer`, `#task-list`, `#link-panel`) plus `<script defer src="js/app.js">`.
    - Create `css/style.css` as an empty file.
    - Create `js/app.js` as an empty file with a top-level `// app.js — To-Do Life Dashboard` comment.
    - _Requirements: 15.2, 15.3, 15.5_

  - [x] 1.2 Set up Vitest and fast-check for unit and property-based testing
    - Initialise `package.json` (`npm init -y`), install `vitest` and `fast-check` as dev dependencies.
    - Add a `test` script: `"vitest --run"`.
    - Create `tests/` directory with a placeholder `tests/setup.js` that stubs `localStorage` using a simple in-memory Map.
    - _Requirements: 15.1_

- [x] 2. StorageAdapter — safe localStorage wrapper
  - [x] 2.1 Implement `StorageAdapter` in `js/app.js`
    - Implement `.get(key)` — `JSON.parse(localStorage.getItem(key))`; catch all errors and return `null`.
    - Implement `.set(key, value)` — `localStorage.setItem(key, JSON.stringify(value))`; catch quota/security errors, display a non-blocking toast (`id="storage-toast"`) with "Could not save data. Changes may be lost.", and return `false`; return `true` on success.
    - Implement `.remove(key)` — `localStorage.removeItem(key)`; swallow errors silently.
    - _Requirements: 10.3, 10.4, 9.3, 9.4, 12.8, 13.4_

  - [x] 2.2 Write unit tests for StorageAdapter
    - Test `.get()` returns `null` when key is absent.
    - Test `.get()` returns parsed value when key exists.
    - Test `.get()` returns `null` and does not throw when `localStorage.getItem` throws.
    - Test `.set()` returns `true` on success and stores stringified JSON.
    - Test `.set()` returns `false` and shows toast when `localStorage.setItem` throws.
    - Test `.remove()` calls `removeItem` without throwing.
    - _Requirements: 10.3, 10.4_

- [x] 3. ThemeController — light/dark mode with pre-paint inline script
  - [x] 3.1 Add the inline theme-init script to `index.html <head>`
    - Insert a `<script>` block (before the stylesheet `<link>`) that reads `localStorage.getItem("dashboard_theme")`, validates the value is `"light"` or `"dark"`, and sets `document.documentElement.setAttribute("data-theme", theme)` immediately; defaults to `"light"` for any other value.
    - _Requirements: 14.7, 14.8_

  - [x] 3.2 Implement `ThemeController` in `js/app.js`
    - Implement `.init()` — reads stored theme via `StorageAdapter.get("dashboard_theme")`; falls back to `"light"` if missing or invalid; calls `.apply()`.
    - Implement `.apply(theme)` — sets `data-theme` attribute on `<html>`; updates the `#theme-toggle` button label/icon to reflect the new theme.
    - Implement `.toggle()` — flips current theme, persists via `StorageAdapter.set("dashboard_theme", ...)`, calls `.apply()`.
    - Implement `.current()` — returns the current theme string.
    - Wire `#theme-toggle` click event to `ThemeController.toggle()` inside `init()`.
    - Add the `#theme-toggle` button to `index.html` inside a `<header>`.
    - _Requirements: 14.1, 14.2, 14.3, 14.5, 14.6, 14.8_

  - [x] 3.3 Write property test for ThemeController — Property 9: Theme toggle is its own inverse
    - **Property 9: Theme toggle is its own inverse**
    - Arbitrary starting theme `t ∈ {"light", "dark"}`: calling `toggle()` twice SHALL leave `current()` equal to `t` and stored value equal to `t`.
    - **Validates: Requirements 14.2, 14.3, 14.5**

  - [x] 3.4 Write unit tests for ThemeController
    - Test `.init()` defaults to `"light"` when storage is empty.
    - Test `.init()` defaults to `"light"` when stored value is invalid.
    - Test `.apply("dark")` sets `data-theme="dark"` on `<html>`.
    - Test `.toggle()` flips from `"light"` to `"dark"` and persists.
    - _Requirements: 14.7, 14.8_

- [x] 4. GreetingController — live clock, date, greeting, and custom name
  - [x] 4.1 Implement `GreetingController.getGreeting(hour)` and the clock/date tick
    - Implement `.getGreeting(hour)` with the four boundary mappings (05–11 → "Good Morning", 12–16 → "Good Afternoon", 17–20 → "Good Evening", 21–23 and 00–04 → "Good Night").
    - Implement `.tick()` — reads `new Date()`; formats time as HH:MM:SS; formats date as full weekday + month name + day + year; calls `.getGreeting(hour)`; updates `#clock`, `#date`, and `#greeting-text` DOM nodes.
    - Implement `.init()` — calls `tick()` immediately, then starts `setInterval(tick, 1000)`. Adds a `visibilitychange` listener that calls `tick()` immediately when `document.visibilityState === "visible"`.
    - Add corresponding HTML elements (`#clock`, `#date`, `#greeting-text`) inside `#greeting` in `index.html`.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 4.2 Write property test for GreetingController — Property 1: Greeting coverage is exhaustive and non-overlapping
    - **Property 1: Time-of-day greeting is determined solely by the hour**
    - Arbitrary integer in [0, 23]: `getGreeting(hour)` SHALL return exactly one of {"Good Morning", "Good Afternoon", "Good Evening", "Good Night"}.
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

  - [x] 4.3 Implement custom name input/save/clear
    - Add a text `<input id="name-input" maxlength="50">` and a Save button (`#name-save`) to the `#greeting` section in `index.html`.
    - Implement `.saveName(name)` — trims input; if at least one non-whitespace character and length ≤ 50, persists to `StorageAdapter.set("dashboard_user_name", trimmed)`; updates `#greeting-text` to "[Greeting], [name]!"; if whitespace-only, calls `.clearName()`.
    - Implement `.clearName()` — calls `StorageAdapter.remove("dashboard_user_name")`; renders base greeting.
    - In `.init()`, load saved name via `StorageAdapter.get("dashboard_user_name")` and apply greeting immediately.
    - Wire `#name-save` click and Enter keypress on `#name-input` to `.saveName()`.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 4.4 Write property test for GreetingController — Property 10: Name save round-trip
    - **Property 10: Name save round-trip**
    - Arbitrary string `n` with ≥1 non-whitespace character and length ≤ 50: after `.saveName(n)`, `StorageAdapter.get("dashboard_user_name")` SHALL equal `n.trim()` and rendered greeting SHALL contain `n.trim()`.
    - **Validates: Requirements 3.2, 3.4, 3.5**

  - [x] 4.5 Write unit tests for GreetingController
    - Test that `tick()` formats HH:MM:SS correctly for a known date.
    - Test that `tick()` formats the date string correctly (e.g., "Monday, June 9, 2025").
    - Test `saveName("  ")` calls `clearName()` and reverts to base greeting.
    - Test `saveName("Alex")` stores `"Alex"` and renders `"Good Morning, Alex!"` at hour 8.
    - Test `.init()` recovers saved name from storage on load.
    - _Requirements: 1.1, 1.2, 3.2, 3.3, 3.4_

- [x] 5. TimerController — Pomodoro countdown state machine
  - [x] 5.1 Implement the TimerController state machine
    - Define states: `IDLE`, `RUNNING`, `PAUSED`, `COMPLETE`.
    - Implement `.init()` — sets `remaining = 1500`, state = `IDLE`; renders `"25:00"` in `#timer-display`; wires `#timer-start`, `#timer-stop`, `#timer-reset` button clicks.
    - Implement `.start()` — ignored in `RUNNING` or `COMPLETE`; from `IDLE` or `PAUSED`, starts `setInterval(_tick, 1000)`, transitions to `RUNNING`.
    - Implement `.stop()` — ignored unless `RUNNING`; clears interval, transitions to `PAUSED`.
    - Implement `.reset()` — clears interval, sets `remaining = 1500`, state = `IDLE`; hides completion message; renders `"25:00"`.
    - Implement `._tick()` — decrements `remaining`; updates `#timer-display` in MM:SS format; when `remaining` reaches 0, clears interval, transitions to `COMPLETE`, shows `#timer-complete` message "Pomodoro session complete!".
    - Add `#timer-display`, `#timer-start`, `#timer-stop`, `#timer-reset`, and `#timer-complete` elements to `#timer` in `index.html`.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11_

  - [x] 5.2 Write property test for TimerController — Property 8: Timer reset invariant
    - **Property 8: Timer state machine reachability and reset**
    - Arbitrary sequence of `start()` / `stop()` calls (not reaching `COMPLETE`): calling `reset()` SHALL always return state to `IDLE` with `remaining === 1500`.
    - **Validates: Requirements 4.6**

  - [x] 5.3 Write unit tests for TimerController
    - Test full state machine path: `IDLE → RUNNING → PAUSED → RUNNING → COMPLETE → IDLE`.
    - Test `start()` while `RUNNING` is a no-op (no double interval).
    - Test `stop()` while `IDLE` / `PAUSED` is a no-op.
    - Test `start()` while `COMPLETE` is a no-op.
    - Test display format: 90 s remaining renders as `"01:30"`.
    - Test `_tick()` at `remaining === 1` transitions to `COMPLETE` and shows message.
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11_

- [~] 6. Checkpoint — StorageAdapter, ThemeController, GreetingController, TimerController
  - Ensure all tests pass for tasks 2–5. Ask the user if any questions arise before continuing.

- [ ] 7. TaskController — task CRUD, validation, duplicate prevention, persistence
  - [x] 7.1 Implement TaskController data model, load, and render
    - Define the Task shape: `{ id: "t_" + Date.now(), description, done: false, createdAt }`.
    - Implement `.init()` — loads `StorageAdapter.get("dashboard_tasks")`; falls back to `[]` if `null` or malformed; calls `.render()`.
    - Implement `.render()` — rebuilds the `<ul id="task-list-ul">` from the internal tasks array; each item includes a completion checkbox, description text, Edit button, and Delete button; applies `text-decoration: line-through` and `opacity: var(--done-opacity)` for done tasks.
    - Add `#task-list-ul`, `#task-input`, `#task-add-btn`, and `#task-error` elements to `#task-list` in `index.html`.
    - _Requirements: 5.1, 8.1, 10.1, 10.2, 15.7_

  - [x] 7.2 Implement TaskController `_validate` and `_isDuplicate`
    - Implement `._validate(text)` — returns `{ ok: false, error: "Task description cannot be empty." }` for empty/whitespace; `{ ok: false, error: "Task description must be 500 characters or fewer." }` for length > 500; otherwise `{ ok: true }`.
    - Implement `._isDuplicate(text)` — case-insensitive match of `text.trim()` against all existing task descriptions; returns `boolean`.
    - _Requirements: 5.6, 5.7, 6.1_

  - [x] 7.3 Write property test for TaskController — Property 2: Whitespace task descriptions are always rejected
    - **Property 2: Whitespace task descriptions are always rejected**
    - Arbitrary whitespace-only string (including empty): `_validate(text)` SHALL return `{ ok: false }` and no new Task SHALL be created.
    - **Validates: Requirements 5.6**

  - [x] 7.4 Write property test for TaskController — Property 5: Duplicate task rejection is case-insensitive
    - **Property 5: Duplicate task rejection is case-insensitive**
    - Arbitrary string `d` with mixed casing added as a task: attempting to add a task whose `trim().toLowerCase()` equals `d.trim().toLowerCase()` SHALL be rejected and task list length SHALL remain unchanged.
    - **Validates: Requirements 6.1, 6.2**

  - [x] 7.5 Implement TaskController `.add()`
    - Trim description; run `_validate()`; on failure, show error in `#task-error` and return.
    - Run `_isDuplicate()`; on match, show "This task already exists." in `#task-error`, retain input text, auto-clear after 3 s or on next input change.
    - On success, push new Task, call `StorageAdapter.set("dashboard_tasks", tasks)`; clear `#task-input`; call `.render()`.
    - Wire `#task-add-btn` click and Enter keypress on `#task-input` to `.add()`.
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4_

  - [-] 7.6 Write property test for TaskController — Property 3: Task add round-trip
    - **Property 3: Task add round-trip**
    - Arbitrary valid description `d` (non-empty, ≤ 500 chars, non-duplicate): after `.add(d)`, `StorageAdapter.get("dashboard_tasks")` SHALL contain an entry with `description === d.trim()`.
    - **Validates: Requirements 5.2, 5.5, 10.1**

  - [-] 7.7 Implement TaskController `.edit(id, newText)`
    - On Edit button click, replace the task's `<li>` display with an inline `<input>` pre-populated with the current description plus Confirm and Cancel buttons.
    - Implement `.edit(id, newText)` — trim; run `_validate()`; on failure, show error on the edit input and retain original; on success, update task description, persist, re-render.
    - Wire Enter key on edit input to confirm; Escape key to cancel and restore original.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [~] 7.8 Implement TaskController `.toggleComplete(id)` and `.delete(id)`
    - Implement `.toggleComplete(id)` — flip `done` flag on matched task; persist; re-render.
    - Implement `.delete(id)` — remove task from array; persist; re-render; if `StorageAdapter.set` returns `false`, show visible error message.
    - _Requirements: 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4_

  - [~] 7.9 Write property test for TaskController — Property 4: Completed tasks toggle idempotence
    - **Property 4: Completed tasks are visually distinguished and state is preserved**
    - Arbitrary task: toggling completion twice SHALL leave `done` in its original state and restore rendered opacity to default.
    - **Validates: Requirements 8.2, 8.3, 8.4**

  - [~] 7.10 Write unit tests for TaskController
    - Test `.add()` with empty string shows error, no task created.
    - Test `.add()` with 501-char string shows "too long" error.
    - Test `.add()` with valid text creates task and persists.
    - Test duplicate add (case-insensitive) is rejected, input retained.
    - Test `.edit()` with empty string is rejected, original preserved.
    - Test `.edit()` with valid new text updates and persists.
    - Test `.delete()` removes correct task and persists.
    - Test `.toggleComplete()` flips `done` and persists.
    - _Requirements: 5.2–5.7, 6.1–6.4, 7.1–7.8, 8.2–8.4, 9.1–9.4_

- [ ] 8. LinkController — link CRUD, URL normalisation, persistence
  - [x] 8.1 Implement LinkController data model, load, and render
    - Define the QuickLink shape: `{ id: "l_" + Date.now(), label, url, createdAt }`.
    - Implement `.init()` — loads `StorageAdapter.get("dashboard_links")`; falls back to `[]`; calls `.render()`.
    - Implement `.render()` — rebuilds `<ul id="link-list-ul">`; each item is an `<a target="_blank" rel="noopener noreferrer">` showing the label, plus a Delete button.
    - Add `#link-list-ul`, `#link-label-input`, `#link-url-input`, `#link-add-btn`, `#link-label-error`, and `#link-url-error` elements to `#link-panel` in `index.html`.
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 8.2 Implement LinkController `_validate` and `_normaliseUrl`
    - Implement `._validate(label, url)` — checks trimmed label non-empty (max 100 chars) and url non-empty; returns `{ ok, labelError, urlError }`.
    - Implement `._normaliseUrl(url)` — if `url.trim()` does not start with `"http://"` or `"https://"`, prepend `"https://"` and return; otherwise return `url.trim()`.
    - _Requirements: 12.1, 12.5, 12.6, 12.7_

  - [-] 8.3 Write property test for LinkController — Property 6: URL normalisation always produces an absolute URL
    - **Property 6: URL normalisation always produces an absolute URL**
    - Arbitrary URL string `u` without `http://` or `https://` prefix: `_normaliseUrl(u)` SHALL return a string beginning with `"https://"` equal to `"https://" + u.trim()`.
    - **Validates: Requirements 12.7**

  - [-] 8.4 Implement LinkController `.add(label, url)` and `.delete(id)`
    - Implement `.add(label, url)` — run `_validate()`; display field-specific errors on failure; on success, normalise URL, push new QuickLink, persist via `StorageAdapter.set("dashboard_links", links)`, clear both inputs, re-render.
    - Implement `.delete(id)` — remove link, persist, re-render; if `StorageAdapter.set` returns `false`, show visible error.
    - Wire `#link-add-btn` click to `.add()`.
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 13.1, 13.2, 13.3, 13.4_

  - [~] 8.5 Write property test for LinkController — Property 7: Link add round-trip
    - **Property 7: Link add round-trip**
    - Arbitrary valid label and URL pair: after `.add(label, url)`, `StorageAdapter.get("dashboard_links")` SHALL contain an entry with `label === label.trim()` and `url === _normaliseUrl(url)`.
    - **Validates: Requirements 12.2, 12.4, 11.3**

  - [~] 8.6 Write unit tests for LinkController
    - Test `.add()` with empty label shows label error.
    - Test `.add()` with empty URL shows URL error.
    - Test `.add()` with `"github.com"` stores `"https://github.com"`.
    - Test `.add()` with `"https://github.com"` stores URL unchanged.
    - Test `.delete()` removes correct link and persists.
    - Test links open with `target="_blank"` and `rel="noopener noreferrer"`.
    - _Requirements: 12.1–12.8, 13.1–13.4_

- [ ] 9. CSS styling — grid layout, responsive breakpoint, component styles, theme variables
  - [~] 9.1 Implement CSS custom properties and global reset in `css/style.css`
    - Add `:root[data-theme="light"]` and `:root[data-theme="dark"]` blocks with the full set of custom properties (`--bg`, `--surface`, `--text`, `--text-muted`, `--accent`, `--border`, `--error`, `--done-opacity`) as specified in the design.
    - Add a minimal global reset (`box-sizing: border-box`, `margin: 0`, `padding: 0`).
    - Set `body { background: var(--bg); color: var(--text); }`.
    - _Requirements: 14.2, 14.3, 14.4_

  - [~] 9.2 Implement the two-column CSS Grid layout and responsive breakpoint
    - Style `body` or a `.dashboard-grid` wrapper with `display: grid; grid-template-columns: 1fr 1fr; gap: …`.
    - Add `@media (max-width: 700px)` breakpoint that collapses to `grid-template-columns: 1fr`, stacking panels in document order.
    - Style the `<header>` to span full width and right-align the theme toggle.
    - _Requirements: 15.6_

  - [~] 9.3 Implement component-specific styles for all four panels
    - Style `#greeting` — large clock font, muted date, greeting text, name input/button layout.
    - Style `#timer` — large `#timer-display` font, centred buttons, hidden `#timer-complete` message (shown via a class).
    - Style `#task-list` — input + button row, `<ul>` with no list style, each task `<li>` with flex layout for checkbox/text/edit/delete; done state uses `text-decoration: line-through` and `opacity: var(--done-opacity)`.
    - Style `#link-panel` — two-input + button row, link items as styled anchor chips with delete button.
    - Style `#storage-toast` — fixed position notification, hidden by default, shown briefly on storage error.
    - Style `#task-error`, `#link-label-error`, `#link-url-error` using `color: var(--error)`.
    - _Requirements: 8.2, 8.3, 14.4, 15.7_

- [ ] 10. Page-load bootstrap — `init()` wiring and DOMContentLoaded
  - [~] 10.1 Implement the `init()` function and wire all controllers
    - At the bottom of `js/app.js`, add a `DOMContentLoaded` listener that calls a single top-level `init()` function.
    - `init()` must call: `ThemeController.init()`, `GreetingController.init()`, `TimerController.init()`, `TaskController.init()`, `LinkController.init()` — in that order.
    - Confirm the `visibilitychange` listener for the clock is registered inside `GreetingController.init()`.
    - Verify no JavaScript errors appear in the browser console on page load.
    - _Requirements: 1.3, 1.5, 15.7_

  - [~] 10.2 Write integration smoke tests
    - Test that calling `init()` with a stubbed DOM containing all required element IDs completes without throwing.
    - Test that after `init()`, `#clock` contains a string matching `HH:MM:SS` format.
    - Test that after `init()`, `#timer-display` contains `"25:00"`.
    - _Requirements: 15.7_

- [ ] 11. Stretch challenge verification
  - [~] 11.1 Verify Light/Dark Mode (Requirement 14) is fully covered by ThemeController
    - Confirm `ThemeController` handles all seven acceptance criteria (14.1–14.8).
    - Verify the inline `<head>` script prevents flash of default theme (14.7).
    - Verify WCAG AA contrast ratios (4.5:1 minimum) for both themes using DevTools or a contrast checker.
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_

  - [~] 11.2 Verify Custom Name in Greeting (Requirement 3) is fully covered by GreetingController
    - Confirm `GreetingController` handles all seven acceptance criteria (3.1–3.7) including LocalStorage error path (3.6) and invalid stored value (3.7).
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [~] 11.3 Verify Duplicate Task Prevention (Requirement 6) is fully covered by TaskController
    - Confirm `TaskController._isDuplicate()` performs case-insensitive comparison (6.1).
    - Confirm duplicate rejection shows the correct message and retains input text (6.2, 6.3).
    - Confirm the warning auto-clears after 3 seconds or on input change (6.4).
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 12. Checkpoint — full test suite and GitHub Pages deployment prep
  - [~] 12.1 Run full test suite and fix any failures
    - Run `npm test` (Vitest) and ensure all tests pass.
    - Fix any failures before proceeding.
    - _Requirements: 15.1_

  - [~] 12.2 Verify GitHub Pages deployment readiness
    - Confirm `index.html` opens directly from disk (file:// protocol) with no console errors.
    - Confirm all four panels render on page load.
    - Confirm tasks and links survive a page reload (data persists in LocalStorage).
    - Confirm theme is applied before first visible paint (no flash).
    - Confirm the app has no `package.json` dependencies required at runtime (only dev dependencies for testing).
    - _Requirements: 15.4, 15.5, 15.6, 15.7_

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All ten correctness properties from the design are covered by dedicated property-based test sub-tasks (7.3, 7.4, 7.6, 7.9 — tasks; 4.2, 4.4 — greeting; 3.3 — theme; 5.2 — timer; 8.3, 8.5 — links)
- Each task references the specific requirement clauses it satisfies for full traceability
- The `StorageAdapter` is implemented first because all controllers depend on it
- `ThemeController.init()` is called before other controllers so the theme is applied before any panel renders content
- The inline `<head>` script (task 3.1) must be added before the stylesheet `<link>` tag to prevent FOUC
- No `alert()`, `confirm()`, or `prompt()` calls are used anywhere — all feedback is inline or toast-based
- The project has zero runtime dependencies; `vitest` and `fast-check` are dev-only

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 5, "tasks": ["4.4", "4.5", "5.2", "5.3", "7.1"] },
    { "id": 6, "tasks": ["7.2", "8.1"] },
    { "id": 7, "tasks": ["7.3", "7.4", "7.5", "8.2"] },
    { "id": 8, "tasks": ["7.6", "7.7", "8.3", "8.4"] },
    { "id": 9, "tasks": ["7.8", "8.5", "8.6"] },
    { "id": 10, "tasks": ["7.9", "7.10", "9.1"] },
    { "id": 11, "tasks": ["9.2", "9.3"] },
    { "id": 12, "tasks": ["10.1"] },
    { "id": 13, "tasks": ["10.2", "11.1", "11.2", "11.3"] },
    { "id": 14, "tasks": ["12.1"] },
    { "id": 15, "tasks": ["12.2"] }
  ]
}
```
