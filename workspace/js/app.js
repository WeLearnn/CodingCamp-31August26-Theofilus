// app.js — To-Do Life Dashboard

// ─── StorageAdapter ───────────────────────────────────────────────────────────
// Central module for all localStorage interactions.
// All errors are caught internally so no caller needs try/catch.

const StorageAdapter = {
  /**
   * Retrieve and JSON-parse a value from localStorage.
   * Returns null on missing key or any parse/access error.
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (_err) {
      return null;
    }
  },

  /**
   * JSON-stringify and store a value in localStorage.
   * Returns true on success.
   * Returns false and shows a non-blocking toast on quota/security errors.
   * @param {string} key
   * @param {any} value
   * @returns {boolean}
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_err) {
      StorageAdapter._showToast('Could not save data. Changes may be lost.');
      return false;
    }
  },

  /**
   * Remove a key from localStorage. Errors are swallowed silently.
   * @param {string} key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (_err) {
      // silently ignore
    }
  },

  /**
   * Display a non-blocking toast notification using the #storage-toast element.
   * The toast auto-hides after 3 seconds.
   * @param {string} message
   */
  _showToast(message) {
    const toast = document.getElementById('storage-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('storage-toast--visible');
    clearTimeout(StorageAdapter._toastTimer);
    StorageAdapter._toastTimer = setTimeout(() => {
      toast.classList.remove('storage-toast--visible');
      toast.textContent = '';
    }, 3000);
  },

  _toastTimer: null,
};

// ─── ThemeController ──────────────────────────────────────────────────────────
// Manages Light / Dark mode: reads, applies, and persists the user's theme
// preference. The toggle button (#theme-toggle) is wired inside init().

const ThemeController = {
  /** @type {"light"|"dark"} */
  _theme: 'light',

  /**
   * Read the stored theme, fall back to "light" for any missing/invalid value,
   * then apply the theme and wire the toggle button.
   */
  init() {
    const stored = StorageAdapter.get('dashboard_theme');
    this._theme = (stored === 'light' || stored === 'dark') ? stored : 'light';
    this.apply(this._theme);

    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => ThemeController.toggle());
    }
  },

  /**
   * Set the data-theme attribute on <html> and update the toggle button
   * label to reflect the currently-active theme.
   * @param {"light"|"dark"} theme
   */
  apply(theme) {
    this._theme = theme;
    document.documentElement.setAttribute('data-theme', theme);

    const btn = document.getElementById('theme-toggle');
    if (btn) {
      // Label shows what will happen on click, e.g. active = light → "Switch to Dark"
      btn.textContent = theme === 'light' ? '🌙 Switch to Dark' : '☀️ Switch to Light';
      btn.setAttribute('aria-label',
        theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    }
  },

  /**
   * Flip the current theme, persist the new value, and apply it.
   */
  toggle() {
    const next = this._theme === 'light' ? 'dark' : 'light';
    StorageAdapter.set('dashboard_theme', next);
    this.apply(next);
  },

  /**
   * Return the currently-active theme string.
   * @returns {"light"|"dark"}
   */
  current() {
    return this._theme;
  },
};

// ─── GreetingController ───────────────────────────────────────────────────────
// Manages the live clock, date display, time-of-day greeting text, and the
// optional custom user name that personalises the greeting.

const GreetingController = {
  /** @type {number|null} setInterval handle */
  _intervalId: null,

  /** @type {string|null} Currently active user name (trimmed), or null */
  _name: null,

  /**
   * Return the appropriate time-of-day greeting for the given hour.
   * @param {number} hour  Integer in [0, 23]
   * @returns {"Good Morning"|"Good Afternoon"|"Good Evening"|"Good Night"}
   */
  getGreeting(hour) {
    if (hour >= 5 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 16) return 'Good Afternoon';
    if (hour >= 17 && hour <= 20) return 'Good Evening';
    return 'Good Night'; // 21–23 and 00–04
  },

  /**
   * Build the full greeting string for the given hour, incorporating the
   * saved name if one is present.
   * @param {number} hour  Integer in [0, 23]
   * @returns {string}  e.g. "Good Morning" or "Good Morning, Alex!"
   */
  _buildGreetingText(hour) {
    const base = this.getGreeting(hour);
    if (this._name) return `${base}, ${this._name}!`;
    return base;
  },

  /**
   * Read the current time, format clock / date / greeting, and push to the DOM.
   * Called once on init and then once per second via setInterval.
   */
  tick() {
    const now = new Date();
    const hours   = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
    const month   = now.toLocaleDateString('en-US', { month: 'long' });
    const day     = now.getDate();
    const year    = now.getFullYear();

    const clockEl    = document.getElementById('clock');
    const dateEl     = document.getElementById('date');
    const greetingEl = document.getElementById('greeting-text');

    if (clockEl)    clockEl.textContent = `${hours}:${minutes}:${seconds}`;
    if (dateEl)     dateEl.textContent  = `${weekday}, ${month} ${day}, ${year}`;
    if (greetingEl) greetingEl.textContent = this._buildGreetingText(now.getHours());
  },

  /**
   * Trim the provided name; if it contains at least one non-whitespace character
   * and is ≤ 50 characters, persist it and update the displayed greeting.
   * If it is whitespace-only, delegate to clearName().
   * @param {string} name
   */
  saveName(name) {
    const trimmed = (name || '').trim();

    if (trimmed.length === 0) {
      this.clearName();
      return;
    }

    // Enforce max length (the HTML maxlength attribute is the primary guard,
    // but we also enforce it here for robustness).
    const safe = trimmed.slice(0, 50);

    StorageAdapter.set('dashboard_user_name', safe);
    this._name = safe;

    const greetingEl = document.getElementById('greeting-text');
    if (greetingEl) {
      greetingEl.textContent = this._buildGreetingText(new Date().getHours());
    }
  },

  /**
   * Remove the saved user name from storage and revert the greeting to its
   * base (time-of-day-only) form.
   */
  clearName() {
    StorageAdapter.remove('dashboard_user_name');
    this._name = null;

    const greetingEl = document.getElementById('greeting-text');
    if (greetingEl) {
      greetingEl.textContent = this._buildGreetingText(new Date().getHours());
    }
  },

  /**
   * Start the 1-second tick interval, load any previously saved name from
   * storage, apply it immediately, and register a visibilitychange listener
   * so the clock corrects itself when the tab becomes visible again.
   */
  init() {
    // Load saved name from storage (treats null / non-string as absent)
    const stored = StorageAdapter.get('dashboard_user_name');
    this._name = (typeof stored === 'string' && stored.trim().length > 0)
      ? stored.trim()
      : null;

    this.tick();
    this._intervalId = setInterval(() => this.tick(), 1000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.tick();
      }
    });

    // Wire name-save button click
    const saveBtn = document.getElementById('name-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const input = document.getElementById('name-input');
        if (input) GreetingController.saveName(input.value);
      });
    }

    // Wire Enter keypress on name-input
    const nameInput = document.getElementById('name-input');
    if (nameInput) {
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          GreetingController.saveName(nameInput.value);
        }
      });
    }
  },
};

// ─── TimerController ──────────────────────────────────────────────────────────
// Pomodoro countdown state machine with four states: IDLE, RUNNING, PAUSED, COMPLETE.
// The timer starts at 1500 seconds (25:00) and counts down in 1-second intervals.

const TimerController = {
  // State constants
  STATES: Object.freeze({
    IDLE: 'IDLE',
    RUNNING: 'RUNNING',
    PAUSED: 'PAUSED',
    COMPLETE: 'COMPLETE',
  }),

  /** @type {'IDLE'|'RUNNING'|'PAUSED'|'COMPLETE'} */
  _state: 'IDLE',

  /** @type {number} Seconds remaining in the current session */
  _remaining: 1500,

  /** @type {number|null} setInterval handle */
  _intervalId: null,

  /**
   * Initialise the timer: reset state, render initial display, wire buttons.
   */
  init() {
    this._state = this.STATES.IDLE;
    this._remaining = 1500;
    this._intervalId = null;

    this._render();

    const startBtn = document.getElementById('timer-start');
    const stopBtn  = document.getElementById('timer-stop');
    const resetBtn = document.getElementById('timer-reset');

    if (startBtn) startBtn.addEventListener('click', () => TimerController.start());
    if (stopBtn)  stopBtn.addEventListener('click',  () => TimerController.stop());
    if (resetBtn) resetBtn.addEventListener('click', () => TimerController.reset());
  },

  /**
   * Start the countdown.
   * No-op if already RUNNING or COMPLETE.
   * Transitions IDLE or PAUSED → RUNNING.
   */
  start() {
    if (this._state === this.STATES.RUNNING || this._state === this.STATES.COMPLETE) {
      return;
    }
    this._state = this.STATES.RUNNING;
    this._intervalId = setInterval(() => TimerController._tick(), 1000);
  },

  /**
   * Pause the countdown.
   * No-op unless currently RUNNING.
   * Transitions RUNNING → PAUSED.
   */
  stop() {
    if (this._state !== this.STATES.RUNNING) {
      return;
    }
    clearInterval(this._intervalId);
    this._intervalId = null;
    this._state = this.STATES.PAUSED;
  },

  /**
   * Reset the timer back to IDLE with 1500 seconds remaining.
   * Clears any active interval and hides the completion message.
   */
  reset() {
    clearInterval(this._intervalId);
    this._intervalId = null;
    this._remaining = 1500;
    this._state = this.STATES.IDLE;

    // Hide completion message
    const completeEl = document.getElementById('timer-complete');
    if (completeEl) {
      completeEl.classList.add('hidden');
      completeEl.textContent = '';
    }

    this._render();
  },

  /**
   * Internal tick called every 1000 ms while RUNNING.
   * Decrements remaining, updates the display, and transitions to COMPLETE at 0.
   */
  _tick() {
    this._remaining -= 1;
    this._render();

    if (this._remaining <= 0) {
      clearInterval(this._intervalId);
      this._intervalId = null;
      this._state = this.STATES.COMPLETE;

      const completeEl = document.getElementById('timer-complete');
      if (completeEl) {
        completeEl.textContent = 'Pomodoro session complete!';
        completeEl.classList.remove('hidden');
      }
    }
  },

  /**
   * Update the #timer-display element with the current remaining time in MM:SS format.
   */
  _render() {
    const displayEl = document.getElementById('timer-display');
    if (!displayEl) return;

    const totalSeconds = Math.max(0, this._remaining);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    displayEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  },

  /**
   * Return the current state string (for testing / external inspection).
   * @returns {'IDLE'|'RUNNING'|'PAUSED'|'COMPLETE'}
   */
  getState() {
    return this._state;
  },

  /**
   * Return the current remaining seconds (for testing / external inspection).
   * @returns {number}
   */
  getRemaining() {
    return this._remaining;
  },
};

// ─── TaskController ───────────────────────────────────────────────────────────
// Manages the to-do list: task CRUD, validation, duplicate prevention, and
// persistence to localStorage via StorageAdapter.

const TaskController = {
  /** @type {Array<{id: string, description: string, done: boolean, createdAt: number}>} */
  _tasks: [],

  /**
   * Load tasks from storage, fall back to [] if missing or malformed, then render.
   * Wires #task-add-btn click and Enter keypress on #task-input to .add().
   */
  init() {
    const stored = StorageAdapter.get('dashboard_tasks');
    this._tasks = Array.isArray(stored) ? stored : [];
    this.render();

    // Wire add button click
    const addBtn = document.getElementById('task-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const inputEl = document.getElementById('task-input');
        TaskController.add(inputEl ? inputEl.value : '');
      });
    }

    // Wire Enter keypress on task input
    const taskInput = document.getElementById('task-input');
    if (taskInput) {
      taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          TaskController.add(taskInput.value);
        }
      });
    }
  },

  /**
   * Rebuild the #task-list-ul element from the internal tasks array.
   * Each item contains: checkbox, description span, Edit button, Delete button.
   * Done tasks have strikethrough + reduced opacity applied via inline style.
   */
  render() {
    const ul = document.getElementById('task-list-ul');
    if (!ul) return;

    // Build a DocumentFragment to minimise reflows
    const fragment = document.createDocumentFragment();

    this._tasks.forEach((task) => {
      const li = document.createElement('li');
      li.dataset.id = task.id;

      if (task.done) {
        li.style.textDecoration = 'line-through';
        li.style.opacity = 'var(--done-opacity, 0.5)';
      }

      // Checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.setAttribute('aria-label', `Mark "${task.description}" as ${task.done ? 'incomplete' : 'complete'}`);
      checkbox.addEventListener('change', () => TaskController.toggleComplete(task.id));

      // Description span
      const span = document.createElement('span');
      span.className = 'task-description';
      span.textContent = task.description;

      // Edit button
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'task-edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.setAttribute('aria-label', `Edit task: ${task.description}`);
      editBtn.addEventListener('click', () => TaskController._startEdit(task.id));

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'task-delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('aria-label', `Delete task: ${task.description}`);
      deleteBtn.addEventListener('click', () => TaskController.delete(task.id));

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      fragment.appendChild(li);
    });

    ul.innerHTML = '';
    ul.appendChild(fragment);
  },

  /**
   * Validate a task description string.
   * @param {string} text
   * @returns {{ ok: boolean, error?: string }}
   */
  _validate(text) {
    const trimmed = (text || '').trim();
    if (trimmed.length === 0) {
      return { ok: false, error: 'Task description cannot be empty.' };
    }
    if (trimmed.length > 500) {
      return { ok: false, error: 'Task description must be 500 characters or fewer.' };
    }
    return { ok: true };
  },

  /**
   * Check whether a description already exists in the task list (case-insensitive).
   * @param {string} text
   * @returns {boolean}
   */
  _isDuplicate(text) {
    const needle = (text || '').trim().toLowerCase();
    return this._tasks.some((t) => t.description.trim().toLowerCase() === needle);
  },

  /**
   * Enter inline-edit mode for the given task id.
   * Replaces the task's <li> content with an edit input and Confirm/Cancel buttons.
   * @param {string} id
   */
  _startEdit(id) {
    const task = this._tasks.find((t) => t.id === id);
    if (!task) return;

    const ul = document.getElementById('task-list-ul');
    if (!ul) return;

    const li = ul.querySelector(`[data-id="${id}"]`);
    if (!li) return;

    // Replace content with edit controls
    li.innerHTML = '';

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'task-edit-input';
    editInput.value = task.description;
    editInput.maxLength = 500;
    editInput.setAttribute('aria-label', 'Edit task description');

    const errorSpan = document.createElement('span');
    errorSpan.className = 'task-edit-error';
    errorSpan.style.color = 'var(--error)';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'task-confirm-btn';
    confirmBtn.textContent = 'Confirm';
    confirmBtn.setAttribute('aria-label', 'Confirm edit');

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'task-cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.setAttribute('aria-label', 'Cancel edit');

    const doConfirm = () => TaskController.edit(id, editInput.value);
    const doCancel = () => TaskController.render(); // re-render restores original

    confirmBtn.addEventListener('click', doConfirm);
    cancelBtn.addEventListener('click', doCancel);

    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doConfirm();
      if (e.key === 'Escape') doCancel();
    });

    li.appendChild(editInput);
    li.appendChild(errorSpan);
    li.appendChild(confirmBtn);
    li.appendChild(cancelBtn);

    editInput.focus();
  },

  /**
   * Confirm an edit: validate, update, persist, re-render.
   * @param {string} id
   * @param {string} newText
   */
  edit(id, newText) {
    const result = this._validate(newText);
    if (!result.ok) {
      // Show error on the inline edit input
      const ul = document.getElementById('task-list-ul');
      if (ul) {
        const errorEl = ul.querySelector(`[data-id="${id}"] .task-edit-error`);
        if (errorEl) errorEl.textContent = result.error;
      }
      return;
    }

    const trimmed = newText.trim();
    const task = this._tasks.find((t) => t.id === id);
    if (!task) return;

    task.description = trimmed;
    StorageAdapter.set('dashboard_tasks', this._tasks);
    this.render();
  },

  /**
   * Toggle the done state of a task, persist, and re-render.
   * @param {string} id
   */
  toggleComplete(id) {
    const task = this._tasks.find((t) => t.id === id);
    if (!task) return;
    task.done = !task.done;
    StorageAdapter.set('dashboard_tasks', this._tasks);
    this.render();
  },

  /**
   * Remove a task by id, persist, and re-render.
   * If storage save fails, show an error message.
   * @param {string} id
   */
  delete(id) {
    this._tasks = this._tasks.filter((t) => t.id !== id);
    const saved = StorageAdapter.set('dashboard_tasks', this._tasks);
    if (!saved) {
      const errorEl = document.getElementById('task-error');
      if (errorEl) {
        errorEl.textContent = 'Could not save after delete. Changes may be lost.';
      }
    }
    this.render();
  },

  /**
   * Add a new task: validate, check duplicates, persist, clear input, re-render.
   * @param {string} description
   */
  add(description) {
    const errorEl = document.getElementById('task-error');
    const inputEl = document.getElementById('task-input');

    const result = this._validate(description);
    if (!result.ok) {
      if (errorEl) errorEl.textContent = result.error;
      return;
    }

    const trimmed = description.trim();

    if (this._isDuplicate(trimmed)) {
      if (errorEl) {
        errorEl.textContent = 'This task already exists.';
        // Auto-clear after 3 seconds
        clearTimeout(TaskController._dupClearTimer);
        TaskController._dupClearTimer = setTimeout(() => {
          if (errorEl) errorEl.textContent = '';
        }, 3000);
        // Also clear on input change
        if (inputEl) {
          const onInput = () => {
            errorEl.textContent = '';
            inputEl.removeEventListener('input', onInput);
          };
          inputEl.addEventListener('input', onInput);
        }
      }
      return;
    }

    const now = Date.now();
    /** @type {{id: string, description: string, done: boolean, createdAt: number}} */
    const task = {
      id: 't_' + now,
      description: trimmed,
      done: false,
      createdAt: now,
    };

    this._tasks.push(task);
    StorageAdapter.set('dashboard_tasks', this._tasks);

    if (inputEl) inputEl.value = '';
    if (errorEl) errorEl.textContent = '';

    this.render();
  },

  /** @type {number|null} Timer handle for auto-clearing duplicate warning */
  _dupClearTimer: null,
};

// ─── LinkController ───────────────────────────────────────────────────────────
// Manages the quick-links panel: link CRUD, URL normalisation, and persistence
// to localStorage via StorageAdapter.

const LinkController = {
  /**
   * QuickLink shape:
   * { id: "l_" + Date.now(), label: string, url: string, createdAt: number }
   *
   * @type {Array<{id: string, label: string, url: string, createdAt: number}>}
   */
  _links: [],

  /**
   * Load links from storage, fall back to [] if missing or malformed, then render.
   * Wires #link-add-btn click to .add().
   */
  init() {
    const stored = StorageAdapter.get('dashboard_links');
    this._links = Array.isArray(stored) ? stored : [];
    this.render();

    // Wire add button click
    const addBtn = document.getElementById('link-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const labelInputEl = document.getElementById('link-label-input');
        const urlInputEl   = document.getElementById('link-url-input');
        LinkController.add(
          labelInputEl ? labelInputEl.value : '',
          urlInputEl   ? urlInputEl.value   : ''
        );
      });
    }
  },

  /**
   * Rebuild the #link-list-ul element from the internal links array.
   * Each item is an <a target="_blank" rel="noopener noreferrer"> showing the
   * label as text, plus a Delete button.
   */
  render() {
    const ul = document.getElementById('link-list-ul');
    if (!ul) return;

    const fragment = document.createDocumentFragment();

    this._links.forEach((link) => {
      const li = document.createElement('li');
      li.dataset.id = link.id;

      // Anchor element — opens in new tab with security attributes
      const anchor = document.createElement('a');
      anchor.href = link.url;
      anchor.textContent = link.label;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'link-anchor';

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'link-delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('aria-label', `Delete link: ${link.label}`);
      deleteBtn.addEventListener('click', () => LinkController.delete(link.id));

      li.appendChild(anchor);
      li.appendChild(deleteBtn);
      fragment.appendChild(li);
    });

    ul.innerHTML = '';
    ul.appendChild(fragment);
  },

  /**
   * Validate a label and URL before adding a link.
   * @param {string} label
   * @param {string} url
   * @returns {{ ok: boolean, labelError?: string, urlError?: string }}
   */
  _validate(label, url) {
    const trimmedLabel = (label || '').trim();
    const trimmedUrl   = (url   || '').trim();

    let labelError;
    let urlError;

    if (trimmedLabel.length === 0) {
      labelError = 'Label is required.';
    } else if (trimmedLabel.length > 100) {
      labelError = 'Label must be 100 characters or fewer.';
    }

    if (trimmedUrl.length === 0) {
      urlError = 'URL is required.';
    }

    const ok = !labelError && !urlError;
    return ok ? { ok: true } : { ok: false, labelError, urlError };
  },

  /**
   * Prepend "https://" to a URL if it has no scheme.
   * @param {string} url
   * @returns {string}
   */
  _normaliseUrl(url) {
    const trimmed = (url || '').trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return 'https://' + trimmed;
    }
    return trimmed;
  },

  /**
   * Add a new link: validate, normalise URL, persist, clear inputs, re-render.
   * @param {string} label
   * @param {string} url
   */
  add(label, url) {
    const labelErrorEl = document.getElementById('link-label-error');
    const urlErrorEl   = document.getElementById('link-url-error');

    // Clear previous errors
    if (labelErrorEl) labelErrorEl.textContent = '';
    if (urlErrorEl)   urlErrorEl.textContent   = '';

    const result = this._validate(label, url);
    if (!result.ok) {
      if (labelErrorEl && result.labelError) labelErrorEl.textContent = result.labelError;
      if (urlErrorEl   && result.urlError)   urlErrorEl.textContent   = result.urlError;
      return;
    }

    const now = Date.now();
    /** @type {{id: string, label: string, url: string, createdAt: number}} */
    const link = {
      id: 'l_' + now,
      label: label.trim(),
      url: this._normaliseUrl(url),
      createdAt: now,
    };

    this._links.push(link);
    const saved = StorageAdapter.set('dashboard_links', this._links);

    if (!saved) {
      // StorageAdapter already shows a toast; nothing more needed here
      return;
    }

    // Clear inputs
    const labelInputEl = document.getElementById('link-label-input');
    const urlInputEl   = document.getElementById('link-url-input');
    if (labelInputEl) labelInputEl.value = '';
    if (urlInputEl)   urlInputEl.value   = '';

    this.render();
  },

  /**
   * Remove a link by id, persist, and re-render.
   * If storage save fails, show an error message.
   * @param {string} id
   */
  delete(id) {
    this._links = this._links.filter((l) => l.id !== id);
    const saved = StorageAdapter.set('dashboard_links', this._links);

    if (!saved) {
      // StorageAdapter toast is shown; optionally show a panel-level message
      const urlErrorEl = document.getElementById('link-url-error');
      if (urlErrorEl) {
        urlErrorEl.textContent = 'Could not save after delete. Changes may be lost.';
      }
    }

    this.render();
  },

  
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  ThemeController.init();
  GreetingController.init();
  TimerController.init();
  TaskController.init();
  LinkController.init();
});
