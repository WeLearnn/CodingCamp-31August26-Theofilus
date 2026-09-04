# Design Document — To-Do List Life Dashboard

## Overview

The **To-Do Life Dashboard** is a single-page web application (SPA) that serves as a personal productivity homepage or browser new-tab replacement. It is built exclusively with HTML, CSS, and vanilla JavaScript — no frameworks, no transpilers, no build pipeline. All state is persisted to the browser's `localStorage` API. The finished product is a single directory of static files that can be opened directly from disk or hosted on GitHub Pages without any server-side component.

The application surface is divided into four functional panels plus a global theme toggle:

| Panel | Primary Responsibility |
|---|---|
| Greeting_Section | Live clock, date, time-of-day greeting, custom name |
| Timer | Pomodoro 25-minute countdown with Start / Stop / Reset |
| Task_List | CRUD for to-do items with duplicate prevention |
| Link_Panel | CRUD for quick-access hyperlinks |
| Theme Toggle | Light / Dark preference, persisted and applied before first paint |

A lightweight **LocalStorage Adapter** module centralises every read/write operation and catches storage errors so no component needs its own error handling for persistence.

---

## Architecture

### High-Level Structure

```
┌─────────────────────────────────────────────────────────┐
│                    index.html                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │                   <head>                           │ │
│  │  • Inline <script> — apply saved theme immediately │ │
│  │  • <link> css/style.css                            │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │                   <body>                           │ │
│  │  ┌──────────────┐  ┌───────────────────────────┐  │ │
│  │  │ Greeting_    │  │       Timer               │  │ │
│  │  │ Section      │  │                           │  │ │
│  │  └──────────────┘  └───────────────────────────┘  │ │
│  │  ┌──────────────┐  ┌───────────────────────────┐  │ │
│  │  │ Task_List    │  │     Link_Panel            │  │ │
│  │  │              │  │                           │  │ │
│  │  └──────────────┘  └───────────────────────────┘  │ │
│  │  <script defer src="js/app.js">                    │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Module Organisation (single js/app.js)

Because the constraint is exactly one JS file, the code is structured as an **immediately invoked module pattern** with clearly separated logical sections:

```
js/app.js
├── StorageAdapter         — safe localStorage get/set/remove
├── ThemeController        — read/write/apply theme
├── GreetingController     — clock tick, greeting text, name input
├── TimerController        — countdown state machine
├── TaskController         — task CRUD, validation, render
├── LinkController         — link CRUD, validation, render
└── init()                 — wires everything up on DOMContentLoaded
```

Each controller is a plain object literal exposing an `init()` method and any public helpers. They communicate only through direct DOM manipulation and `StorageAdapter` calls — no shared mutable globals between controllers.

### Rendering Strategy

The app uses **direct DOM manipulation** (no virtual DOM). Each controller owns a root element and re-renders its own list region whenever its data changes. A `render()` function on each controller rebuilds the relevant `<ul>` / `<div>` fragment via `innerHTML` or `DocumentFragment` and replaces the target node.

### Theme Application Before First Paint

A tiny inline `<script>` in `<head>` (before the stylesheet link) reads the stored theme key and sets a `data-theme` attribute on `<html>`. This prevents a flash of the default light theme on load. The full `ThemeController` in `app.js` wires up the toggle button.

---

## Components and Interfaces

### StorageAdapter

Central module for all `localStorage` interactions.

```
StorageAdapter
  .get(key)          → any | null   (returns null on error or missing key)
  .set(key, value)   → boolean      (returns false and shows toast on error)
  .remove(key)       → void
```

Errors are caught internally; `set()` returns `false` and emits a visible toast notification when storage is unavailable (quota exceeded, private-browsing restriction, etc.).

---

### ThemeController

Manages Light / Dark mode.

```
ThemeController
  .init()            → void   (reads stored theme; falls back to "light")
  .apply(theme)      → void   (sets data-theme on <html>, updates button label/icon)
  .toggle()          → void   (flips current theme, persists, applies)
  .current()         → "light" | "dark"
```

The toggle button (`#theme-toggle`) triggers `ThemeController.toggle()`.

---

### GreetingController

Manages the live clock, date display, greeting text, and custom name.

```
GreetingController
  .init()            → void   (starts 1-second tick interval, loads saved name)
  .tick()            → void   (updates clock, date, greeting on each interval)
  .getGreeting(hour) → string ("Good Morning" | "Good Afternoon" | "Good Evening" | "Good Night")
  .saveName(name)    → void   (trims, validates, persists, re-renders greeting)
  .clearName()       → void   (removes name, reverts to base greeting)
```

The tick interval uses `setInterval(tick, 1000)` started on `init()`. A `visibilitychange` listener calls `tick()` immediately when the tab becomes visible to correct any drift.

Greeting boundaries:
| Hour range | Message |
|---|---|
| 05–11 | Good Morning |
| 12–16 | Good Afternoon |
| 17–20 | Good Evening |
| 21–23, 00–04 | Good Night |

---

### TimerController

Implements a Pomodoro countdown state machine.

```
TimerController
  .init()            → void
  .start()           → void
  .stop()            → void
  .reset()           → void
  ._tick()           → void   (internal; called by setInterval)
```

State machine:

```
         reset()
    ┌──────────────────────────────┐
    ↓                              │
  IDLE ──start()──→ RUNNING ──stop()──→ PAUSED
    ↑                  │              │
    │            (reaches 0)    start()│
    │                  ↓              │
    └──────── COMPLETE ←──────────────┘
         reset()
```

- `IDLE`: 1500 s remaining, no interval running.
- `RUNNING`: interval fires every 1000 ms; decrements `remaining`; updates display.
- `PAUSED`: interval cleared; `remaining` preserved.
- `COMPLETE`: interval cleared; completion message shown; Start and Stop ignored until Reset.

---

### TaskController

Manages the to-do list.

```
TaskController
  .init()             → void   (loads tasks from storage, renders list)
  .add(description)   → void   (validates, creates task, persists, renders)
  .edit(id, newText)  → void   (validates, updates task, persists, renders)
  .toggleComplete(id) → void   (flips done flag, persists, renders)
  .delete(id)         → void   (removes task, persists, renders)
  .render()           → void   (rebuilds task list DOM)
  ._validate(text)    → { ok, error }
  ._isDuplicate(text) → boolean
```

Validation rules (applied on add and on edit confirm):
- Trimmed length === 0 → reject with "Task description cannot be empty."
- Trimmed length > 500 → reject with "Task description must be 500 characters or fewer."
- Case-insensitive match against existing tasks → reject with "This task already exists." (add only; edit allows saving unchanged text)

Error messages appear in a `<span id="task-error">` adjacent to the input. The duplicate warning auto-clears after 3 seconds or on input change.

---

### LinkController

Manages the quick-links panel.

```
LinkController
  .init()             → void   (loads links from storage, renders panel)
  .add(label, url)    → void   (validates, normalises URL, persists, renders)
  .delete(id)         → void   (removes link, persists, renders)
  .render()           → void   (rebuilds links DOM)
  ._validate(label, url) → { ok, labelError, urlError }
  ._normaliseUrl(url) → string  (prepends "https://" if no scheme present)
```

URL normalisation: if `url.trim()` does not start with `http://` or `https://`, prepend `https://`.

All links open in `target="_blank"` with `rel="noopener noreferrer"`.

---

## Data Models

All data is serialised to JSON and stored under fixed `localStorage` keys.

### Key: `dashboard_tasks`

Value shape: `Task[]`

```json
[
  {
    "id": "t_1717920000000",
    "description": "Buy groceries",
    "done": false,
    "createdAt": 1717920000000
  }
]
```

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | `"t_" + Date.now()` at creation time |
| `description` | `string` | Trimmed; 1–500 characters |
| `done` | `boolean` | `false` on creation |
| `createdAt` | `number` | Unix timestamp ms |

---

### Key: `dashboard_links`

Value shape: `QuickLink[]`

```json
[
  {
    "id": "l_1717920000001",
    "label": "GitHub",
    "url": "https://github.com",
    "createdAt": 1717920000001
  }
]
```

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | `"l_" + Date.now()` |
| `label` | `string` | 1–100 characters |
| `url` | `string` | Must start with `http://` or `https://` after normalisation; max 2048 chars |
| `createdAt` | `number` | Unix timestamp ms |

---

### Key: `dashboard_theme`

Value shape: `string`

```json
"dark"
```

| Value | Meaning |
|---|---|
| `"light"` | Light theme active |
| `"dark"` | Dark theme active |
| *(missing)* | Default to `"light"` |

---

### Key: `dashboard_user_name`

Value shape: `string`

```json
"Alex"
```

| Constraint | Detail |
|---|---|
| Max length | 50 characters |
| Whitespace-only | Treated as absent; stored value is always trimmed |
| Missing / null | Render base greeting only |

---

## Page Layout and Visual Hierarchy

### Grid Layout

The page uses a **CSS Grid** two-column layout on wide viewports and collapses to a single column on narrow screens.

```
┌──────────────────────────────────────────────┐
│  header  [Theme Toggle]                      │
├─────────────────────┬────────────────────────┤
│   Greeting_Section  │       Timer            │
│   (clock, date,     │   (countdown display,  │
│    greeting, name)  │    Start/Stop/Reset)   │
├─────────────────────┼────────────────────────┤
│   Task_List         │     Link_Panel         │
│   (add / list)      │   (add / list)         │
└─────────────────────┴────────────────────────┘
```

Breakpoint: `max-width: 700px` → single column, panels stacked vertically in document order.

### CSS Custom Properties for Theming

```css
:root[data-theme="light"] {
  --bg:          #f5f5f5;
  --surface:     #ffffff;
  --text:        #1a1a1a;
  --text-muted:  #555555;
  --accent:      #3b82f6;
  --border:      #d1d5db;
  --error:       #dc2626;
  --done-opacity: 0.5;
}

:root[data-theme="dark"] {
  --bg:          #111827;
  --surface:     #1f2937;
  --text:        #f9fafb;
  --text-muted:  #9ca3af;
  --accent:      #60a5fa;
  --border:      #374151;
  --error:       #f87171;
  --done-opacity: 0.5;
}
```

All component styles consume only CSS custom properties, so toggling `data-theme` on `<html>` instantly repaints the entire page.

Minimum contrast ratios: foreground `--text` on `--surface` ≥ 7:1; `--text-muted` on `--surface` ≥ 4.5:1; `--accent` on `--bg` ≥ 4.5:1. Both themes are designed to meet WCAG AA (4.5:1).

### File Structure

```
todo-life-dashboard/
├── index.html          ← Single HTML page; inline theme-init script in <head>
├── css/
│   └── style.css       ← All styles; theming via CSS custom properties
└── js/
    └── app.js          ← All JavaScript; module pattern with controller sections
```

No build step, no `package.json`, no `node_modules`. Deployable to GitHub Pages by pointing the repository root (or a `/docs` subdirectory) at `index.html`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Time-of-day greeting is determined solely by the hour

*For any* integer hour in [0, 23], `GreetingController.getGreeting(hour)` SHALL return exactly one of {"Good Morning", "Good Afternoon", "Good Evening", "Good Night"}, and the mapping shall be exhaustive and non-overlapping across all 24 hours.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

---

### Property 2: Whitespace task descriptions are always rejected

*For any* string composed entirely of whitespace characters (including the empty string), `TaskController._validate(text)` SHALL return `{ ok: false }` and no new Task SHALL be created.

**Validates: Requirements 5.6**

---

### Property 3: Task add round-trip

*For any* valid (non-empty, ≤ 500 char, non-duplicate) task description `d`, after `TaskController.add(d)` is called, the task list loaded from `localStorage` via `StorageAdapter.get("dashboard_tasks")` SHALL contain an entry whose `description` equals `d.trim()`.

**Validates: Requirements 5.2, 5.5, 10.1**

---

### Property 4: Completed tasks are visually distinguished and state is preserved

*For any* task in the Task_List, toggling completion twice (complete then incomplete) SHALL leave the task in its original `done` state and restore the task item's rendered opacity to its default value.

**Validates: Requirements 8.2, 8.3, 8.4**

---

### Property 5: Duplicate task rejection is case-insensitive

*For any* existing task with description `d`, attempting to add a new task whose trimmed description equals `d` under case-insensitive comparison SHALL be rejected and the task list length SHALL remain unchanged.

**Validates: Requirements 6.1, 6.2**

---

### Property 6: URL normalisation always produces an absolute URL

*For any* URL string `u` that does not begin with `"http://"` or `"https://"`, `LinkController._normaliseUrl(u)` SHALL return a string that begins with `"https://"` and is otherwise equal to `u.trim()`.

**Validates: Requirements 12.7**

---

### Property 7: Link add round-trip

*For any* valid label and URL pair, after `LinkController.add(label, url)` is called, `StorageAdapter.get("dashboard_links")` SHALL contain an entry with `label` equal to the trimmed input label and `url` equal to the normalised URL.

**Validates: Requirements 12.2, 12.4, 11.3**

---

### Property 8: Timer state machine reachability and reset

*For any* sequence of `start()` / `stop()` calls that does not reach `COMPLETE`, calling `reset()` SHALL always return the timer to the `IDLE` state with `remaining === 1500`.

**Validates: Requirements 4.6**

---

### Property 9: Theme toggle is its own inverse

*For any* starting theme `t` ∈ {"light", "dark"}, calling `ThemeController.toggle()` twice SHALL leave `ThemeController.current()` equal to `t` and `StorageAdapter.get("dashboard_theme")` equal to `t`.

**Validates: Requirements 14.2, 14.3, 14.5**

---

### Property 10: Name save round-trip

*For any* string `n` containing at least one non-whitespace character and length ≤ 50, after `GreetingController.saveName(n)` is called, `StorageAdapter.get("dashboard_user_name")` SHALL equal `n.trim()`, and the rendered greeting SHALL contain `n.trim()`.

**Validates: Requirements 3.2, 3.4, 3.5**

---

## Error Handling

| Scenario | Component | Response |
|---|---|---|
| `localStorage.setItem` throws (quota, security) | StorageAdapter | Catch error; return `false`; display non-blocking toast: "Could not save data. Changes may be lost." |
| `localStorage.getItem` throws | StorageAdapter | Catch error; return `null` |
| Stored JSON is malformed (`JSON.parse` throws) | StorageAdapter | Catch error; return `null`; affected controller treats `null` as empty state |
| Task add with empty/whitespace input | TaskController | Display inline error message; no task created |
| Task add with > 500 char description | TaskController | Display inline error message; no task created |
| Duplicate task add | TaskController | Display inline error message; input text retained; message auto-clears after 3 s or on input change |
| Task edit confirmed with empty/whitespace | TaskController | Display error on edit input; retain original description |
| Link add with empty label or empty URL | LinkController | Display field-specific validation message; no link created |
| LocalStorage unavailable on delete | TaskController / LinkController | Display visible error message; no unhandled exception |
| User_Name > 50 characters | GreetingController | Silently truncate to 50 before save (input `maxlength` attribute enforces this in HTML) |
| LocalStorage unavailable on name save | GreetingController | Apply greeting for current session only; no unhandled error |
| `data-theme` value in storage is not "light" or "dark" | ThemeController | Default to `"light"` |

All error states are communicated to the user via inline messages or toast notifications. No `alert()`, `confirm()`, or `prompt()` calls are used. No errors propagate to the global `window.onerror` handler.

---

## Testing Strategy

### Dual Testing Approach

Testing combines **example-based unit tests** for specific scenarios and edge cases, and **property-based tests** for universal invariants.

#### Property-Based Testing Library

Use **[fast-check](https://github.com/dubzzz/fast-check)** (JavaScript) for property-based tests. Each property test runs a minimum of **100 iterations**.

Each property test is tagged with a comment in the format:
```
// Feature: todo-life-dashboard, Property N: <property text>
```

#### Unit Tests (Vitest)

Unit tests cover:
- Specific examples for each controller action (add, edit, delete, toggle)
- Timer state machine transitions — IDLE → RUNNING → PAUSED → RUNNING → COMPLETE → IDLE
- Edge cases: empty input, 500-char boundary, 501-char rejection, URL normalisation with known inputs
- LocalStorage adapter: mock `localStorage` throwing quota error, verify `false` return and toast
- Theme initialisation: no stored theme defaults to `"light"`; invalid stored value defaults to `"light"`

#### Property Tests (fast-check)

| Property | Test Description |
|---|---|
| 1 – Greeting coverage | Arbitrary integer in [0, 23] always maps to one of four valid greeting strings |
| 2 – Whitespace rejection | Arbitrary whitespace-only string always fails `_validate()` |
| 3 – Task round-trip | Arbitrary valid description added then read from storage equals trimmed original |
| 4 – Toggle idempotence | Arbitrary task completion state toggled twice returns to original state |
| 5 – Case-insensitive duplicate | Arbitrary string with mixed casing matches existing task and is rejected |
| 6 – URL normalisation | Arbitrary URL without scheme always gains `https://` prefix |
| 7 – Link round-trip | Arbitrary valid label/URL pair added then read from storage equals normalised input |
| 8 – Timer reset invariant | Arbitrary start/stop sequence followed by reset always produces IDLE + 1500 s |
| 9 – Theme toggle involution | Arbitrary starting theme toggled twice returns to original theme |
| 10 – Name round-trip | Arbitrary valid name saved then read from storage equals trimmed input |

#### Integration / Smoke Tests

- `index.html` opens in a browser with no console errors (manual smoke test)
- All four panels render on page load
- Theme applied before first visible paint (verified via DevTools Performance panel)
- Tasks and links survive a page reload (manual verification with browser DevTools)
