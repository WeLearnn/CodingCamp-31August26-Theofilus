# Requirements Document

## Introduction

The **To-Do List Life Dashboard** is a client-side web application that serves as a personal productivity homepage. It presents the user with a live clock and greeting, a Pomodoro-style focus timer, a persistent to-do list, and a quick-links panel. The entire application is built with vanilla HTML, CSS, and JavaScript — no frameworks, no build tools, and no backend server. All user data is stored exclusively in the browser's LocalStorage API. The app must function as both a standalone web page and a browser new-tab replacement, and it must deploy successfully to GitHub Pages.

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting_Section**: The UI region that displays the current time, date, and a personalized greeting message.
- **Timer**: The Pomodoro-style countdown component within the Dashboard.
- **Task_List**: The UI component that manages the user's to-do items.
- **Task**: A single to-do item, consisting of a text description and a completion state.
- **Link_Panel**: The UI component that displays and manages user-defined quick-access hyperlinks.
- **Quick_Link**: A user-defined pair of a display label and a URL stored in the Link_Panel.
- **LocalStorage**: The browser's `localStorage` Web Storage API used for all client-side persistence.
- **Theme**: The visual color scheme of the Dashboard — either Light or Dark.
- **User_Name**: An optional, user-supplied name used to personalize the greeting.
- **Pomodoro_Session**: A single 25-minute focused-work interval tracked by the Timer.

---

## Requirements

---

### Requirement 1: Live Clock and Date Display

**User Story:** As a user, I want to see the current time and date update automatically, so that I always know what time it is without leaving the Dashboard.

#### Acceptance Criteria

1. THE Greeting_Section SHALL display the current local time in 24-hour HH:MM:SS format.
2. THE Greeting_Section SHALL display the current local date in English, including the full weekday name, full month name, day number, and four-digit year (e.g., "Monday, June 9, 2025").
3. WHEN the Dashboard page loads, THE Greeting_Section SHALL immediately display the current local time and date and begin updating the displayed time once per second.
4. WHILE the Dashboard page is open, THE Greeting_Section SHALL continue updating the displayed time every second without requiring a page reload.
5. IF the browser tab is hidden and then made visible again, THE Greeting_Section SHALL display the correct current time immediately upon becoming visible.

---

### Requirement 2: Time-of-Day Greeting

**User Story:** As a user, I want to see a friendly greeting that reflects the time of day, so that the Dashboard feels personal and contextually relevant.

#### Acceptance Criteria

1. WHEN the local hour is between 05:00 and 11:59 inclusive, THE Greeting_Section SHALL display the message "Good Morning".
2. WHEN the local hour is between 12:00 and 16:59 inclusive, THE Greeting_Section SHALL display the message "Good Afternoon".
3. WHEN the local hour is between 17:00 and 20:59 inclusive, THE Greeting_Section SHALL display the message "Good Evening".
4. WHEN the local hour is between 21:00 and 23:59 inclusive, THE Greeting_Section SHALL display the message "Good Night".
5. WHEN the local hour is between 00:00 and 04:59 inclusive, THE Greeting_Section SHALL display the message "Good Night".
6. WHEN the local time crosses a greeting boundary (e.g., 12:00:00), THE Greeting_Section SHALL update the greeting text automatically within 60 seconds of the boundary being crossed, without requiring a page reload.

---

### Requirement 3: Custom Name in Greeting (Stretch Challenge)

**User Story:** As a user, I want to enter my name so that the greeting addresses me personally, making the Dashboard feel like my own.

#### Acceptance Criteria

1. THE Greeting_Section SHALL provide a text input control that allows the user to enter a User_Name of up to 50 characters.
2. WHEN the user enters a User_Name containing at least one non-whitespace character and confirms the entry by pressing Enter or activating the save control, THE Greeting_Section SHALL display the greeting in the format "[Greeting], [User_Name]!" (e.g., "Good Morning, Alex!").
3. WHEN the user clears the User_Name field or enters a value containing only whitespace characters and confirms, THE Greeting_Section SHALL revert to displaying only the base greeting without a name suffix.
4. WHEN the Dashboard loads and a User_Name has been previously saved, THE Greeting_Section SHALL retrieve the User_Name from LocalStorage and display the personalized greeting immediately.
5. WHEN the user saves a User_Name, THE Dashboard SHALL persist the User_Name to LocalStorage so that it survives page reloads and browser restarts.
6. IF LocalStorage is unavailable or throws an error during read or write, THE Dashboard SHALL display the base time-of-day greeting without a name and SHALL NOT throw an unhandled error.
7. IF the value retrieved from LocalStorage is missing or cannot be parsed as a valid User_Name string, THE Greeting_Section SHALL display the base time-of-day greeting without a name suffix.

---

### Requirement 4: Pomodoro Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with Start, Stop, and Reset controls, so that I can use the Pomodoro technique to stay focused during work sessions.

#### Acceptance Criteria

1. THE Timer SHALL initialize with a countdown duration of exactly 25 minutes (1500 seconds) displayed as "25:00".
2. THE Timer SHALL provide three controls labeled "Start", "Stop", and "Reset".
3. WHEN the user activates the Start control, THE Timer SHALL begin counting down in one-second intervals, updating the displayed time each second.
4. WHEN the user activates the Stop control while the Timer is counting down, THE Timer SHALL pause the countdown and retain the remaining time.
5. WHILE the Timer is paused AND WHEN the user activates the Start control, THE Timer SHALL resume the countdown from the paused remaining time.
6. WHEN the user activates the Reset control, THE Timer SHALL stop any active countdown and reset the displayed time to "25:00".
7. WHEN the Timer countdown reaches "00:00", THE Timer SHALL stop counting and SHALL display a visual completion message indicating the Pomodoro session is complete.
8. WHILE the Timer is actively counting down, THE Timer SHALL display the remaining time in MM:SS format, updating once per second.
9. IF the user activates the Start control while the Timer is already counting down, THE Timer SHALL ignore the activation and continue counting without restarting.
10. IF the user activates the Stop control while the Timer is not counting down, THE Timer SHALL ignore the activation.
11. IF the user activates the Start control after the Timer has reached "00:00", THE Timer SHALL ignore the activation until the user first activates the Reset control.

---

### Requirement 5: To-Do List — Add Tasks

**User Story:** As a user, I want to add tasks to my to-do list, so that I can track the things I need to accomplish during the day.

#### Acceptance Criteria

1. THE Task_List SHALL provide a text input field and an "Add" control for entering new Tasks.
2. WHEN the user enters text in the input field and activates the Add control, THE Task_List SHALL create a new Task with the trimmed text and display it in the task list.
3. WHEN the user presses the Enter key while the task input field is focused, THE Task_List SHALL create a new Task with the trimmed entered text, equivalent to activating the Add control.
4. WHEN a Task is added, THE Task_List SHALL clear the text input field to prepare for the next entry.
5. WHEN a Task is added, THE Task_List SHALL persist all Tasks to LocalStorage.
6. IF the user attempts to add a Task with an empty or whitespace-only description, THE Task_List SHALL reject the entry, display an error message adjacent to the input field, and SHALL NOT create a new Task.
7. IF the user attempts to add a Task whose trimmed description exceeds 500 characters, THE Task_List SHALL reject the entry and display an error message indicating the description is too long.

---

### Requirement 6: To-Do List — Prevent Duplicate Tasks (Stretch Challenge)

**User Story:** As a user, I want the app to prevent me from adding a task that I've already added, so that my list stays clean and free of duplicates.

#### Acceptance Criteria

1. WHEN the user attempts to add a Task whose trimmed description matches an existing Task's trimmed description using a case-insensitive comparison, THE Task_List SHALL reject the entry.
2. WHEN a duplicate Task entry is rejected, THE Task_List SHALL display a visible message adjacent to the input field informing the user that the task already exists.
3. WHEN a duplicate entry is rejected, THE Task_List SHALL retain the submitted text in the input field so the user can edit it.
4. WHEN the duplicate warning message is displayed, THE Task_List SHALL automatically remove the message after 3 seconds or when the user changes the value of the input field, whichever occurs first.

---

### Requirement 7: To-Do List — Edit Tasks

**User Story:** As a user, I want to edit existing tasks, so that I can update task descriptions when my plans change.

#### Acceptance Criteria

1. THE Task_List SHALL provide an "Edit" control for each displayed Task.
2. WHEN the user activates the Edit control for a Task, THE Task_List SHALL replace the Task's display text with an editable text input pre-populated with the current task description.
3. WHEN the user confirms the edit, THE Task_List SHALL update the Task's description to the trimmed new text and return to the display view.
4. WHEN the user presses the Enter key while editing a Task, THE Task_List SHALL confirm the edit, equivalent to activating the confirm control.
5. WHEN the user presses the Escape key while editing a Task, THE Task_List SHALL cancel the edit and restore the original task description.
6. WHEN the user cancels the edit, THE Task_List SHALL discard the changes and restore the original task description.
7. WHEN a Task edit is confirmed, THE Task_List SHALL persist the updated Tasks to LocalStorage.
8. IF the user confirms an edit with an empty or whitespace-only description, THE Task_List SHALL reject the update, display an error indication on the edit input, and retain the original task description.

---

### Requirement 8: To-Do List — Mark Tasks as Complete

**User Story:** As a user, I want to mark tasks as done, so that I can track my progress and see what I've accomplished.

#### Acceptance Criteria

1. THE Task_List SHALL display a checkbox or equivalent toggle control alongside each Task.
2. WHEN the user activates the completion toggle for an incomplete Task, THE Task_List SHALL mark the Task as complete and apply strikethrough text decoration and reduce the task item's opacity to 0.5 to distinguish it from incomplete Tasks.
3. WHEN the user activates the completion toggle for a complete Task, THE Task_List SHALL mark the Task as incomplete and remove the strikethrough text decoration and restore the task item's opacity to its default value.
4. WHEN a Task's completion state changes, THE Task_List SHALL persist the updated Tasks to LocalStorage.

---

### Requirement 9: To-Do List — Delete Tasks

**User Story:** As a user, I want to delete tasks I no longer need, so that my list only contains relevant items.

#### Acceptance Criteria

1. THE Task_List SHALL provide a "Delete" control for each displayed Task.
2. WHEN the user activates the Delete control for a Task, THE Task_List SHALL permanently remove that Task from the list.
3. WHEN a Task is deleted, THE Task_List SHALL persist the updated Tasks to LocalStorage.
4. IF LocalStorage is unavailable during the delete save operation, THE Task_List SHALL display a visible error message and SHALL NOT throw an unhandled error.

---

### Requirement 10: To-Do List — Persistence

**User Story:** As a user, I want my tasks to be saved automatically, so that my list is still there after I close and reopen the browser.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Task_List SHALL retrieve all previously saved Tasks from LocalStorage and display them.
2. WHEN the Dashboard loads and no Tasks have been previously saved, THE Task_List SHALL display an empty list without errors.
3. IF LocalStorage is unavailable during a save operation, THE Task_List SHALL display a visible error message adjacent to the task list informing the user that the task could not be saved and SHALL NOT throw an unhandled error.
4. IF LocalStorage is unavailable or throws an error during the load operation, THE Task_List SHALL display an empty list and SHALL NOT throw an unhandled error.

---

### Requirement 11: Quick Links — Display and Navigation

**User Story:** As a user, I want to see my favorite website links displayed on the Dashboard, so that I can open them with a single click.

#### Acceptance Criteria

1. THE Link_Panel SHALL display all saved Quick_Links as clickable elements, each showing its display label as visible text.
2. WHEN the user clicks a Quick_Link, THE Dashboard SHALL open the associated URL in a new browser tab.
3. WHEN the Dashboard loads, THE Link_Panel SHALL retrieve all previously saved Quick_Links from LocalStorage and display them.
4. WHEN the Dashboard loads and no Quick_Links have been previously saved, THE Link_Panel SHALL render no Quick_Link child elements and SHALL NOT display an error.
5. IF LocalStorage is unavailable or throws an error during the load operation, THE Link_Panel SHALL render no Quick_Link child elements and SHALL NOT throw an unhandled error.

---

### Requirement 12: Quick Links — Add Links

**User Story:** As a user, I want to add new quick links with a label and URL, so that I can build my own set of shortcuts.

#### Acceptance Criteria

1. THE Link_Panel SHALL provide input fields for a display label (up to 100 characters) and a URL (up to 2048 characters), plus an "Add Link" control.
2. WHEN the user enters a non-empty, non-whitespace-only label and a non-empty URL and activates the Add Link control, THE Link_Panel SHALL create a new Quick_Link and display it in the panel.
3. WHEN a Quick_Link is added, THE Link_Panel SHALL clear both input fields.
4. WHEN a Quick_Link is added, THE Link_Panel SHALL persist all Quick_Links to LocalStorage.
5. IF the user attempts to add a Quick_Link with an empty or whitespace-only label, THE Link_Panel SHALL reject the entry and display a validation message identifying the label field as missing.
6. IF the user attempts to add a Quick_Link with an empty URL, THE Link_Panel SHALL reject the entry and display a validation message identifying the URL field as missing.
7. IF the user enters a URL that does not begin with "http://" or "https://", THE Link_Panel SHALL prepend "https://" to the URL before saving and displaying the Quick_Link.
8. IF LocalStorage is unavailable during the save operation, THE Link_Panel SHALL display a visible error message and SHALL NOT throw an unhandled error.

---

### Requirement 13: Quick Links — Delete Links

**User Story:** As a user, I want to remove quick links I no longer need, so that my panel stays relevant and uncluttered.

#### Acceptance Criteria

1. THE Link_Panel SHALL provide a "Delete" control for each displayed Quick_Link.
2. WHEN the user activates the Delete control for a Quick_Link, THE Link_Panel SHALL permanently remove that Quick_Link from the panel.
3. WHEN a Quick_Link is deleted, THE Link_Panel SHALL persist the updated Quick_Links to LocalStorage.
4. IF LocalStorage is unavailable during the delete save operation, THE Link_Panel SHALL display a visible error message and SHALL NOT throw an unhandled error.

---

### Requirement 14: Light / Dark Mode Toggle (Stretch Challenge)

**User Story:** As a user, I want to switch between light and dark color schemes, so that I can use the Dashboard comfortably in different lighting environments.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a visible toggle control for switching between Light and Dark Themes.
2. WHEN the user activates the theme toggle while the Light Theme is active, THE Dashboard SHALL apply the Dark Theme to the Greeting_Section, Timer, Task_List, Link_Panel, and theme toggle control.
3. WHEN the user activates the theme toggle while the Dark Theme is active, THE Dashboard SHALL apply the Light Theme to the Greeting_Section, Timer, Task_List, Link_Panel, and theme toggle control.
4. WHEN a Theme is applied, THE Dashboard SHALL ensure a minimum color contrast ratio of 4.5:1 between foreground text and background colors across all four panels, in compliance with WCAG AA.
5. WHEN the user changes the Theme, THE Dashboard SHALL persist the selected Theme to LocalStorage.
6. IF LocalStorage is unavailable during the Theme save operation, THE Dashboard SHALL continue to apply the selected Theme for the current session and SHALL NOT throw an unhandled error.
7. WHEN the Dashboard loads and a Theme preference has been previously saved, THE Dashboard SHALL apply the saved Theme before rendering any visible content to avoid a flash of the default Theme.
8. WHEN the Dashboard loads and no Theme preference has been previously saved, THE Dashboard SHALL apply the Light Theme as the default.

---

### Requirement 15: Technical Constraints

**User Story:** As a developer, I want the project to follow the required technical standards, so that the application is maintainable, deployable to GitHub Pages, and meets the bootcamp assignment constraints.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using only HTML, CSS, and vanilla JavaScript, with no external JavaScript frameworks or libraries.
2. THE Dashboard SHALL use exactly one CSS file located in the `css/` directory.
3. THE Dashboard SHALL use exactly one JavaScript file located in the `js/` directory.
4. THE Dashboard SHALL store all user data exclusively in the browser LocalStorage API with no backend server calls.
5. THE Dashboard SHALL be deployable as a static site with no build step required, such that opening `index.html` directly in a browser produces a fully functional application.
6. THE Dashboard SHALL function correctly in the latest publicly released stable versions of Chrome, Firefox, Edge, and Safari at the time of testing.
7. WHEN the page loads in any supported browser, THE Dashboard SHALL render all four main panels (Greeting_Section, Timer, Task_List, Link_Panel) and produce no JavaScript errors in the browser console.
