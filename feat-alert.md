You are building an “Alerts” management feature in a web application.
Implement this feature using clearly separated components, all defined within the same solution.

Overall goal:
Allow users to create, edit, delete, and manage AI-based alerts. Alert creation and editing must happen inside a popup modal with polished UX.

Component architecture (must be followed):

1. AlertsPage (container / page component):
   Responsibilities:
   - Load alerts from localStorage on initialization.
   - Store alerts in state.
   - Render:
     - Page header and “Create Alert” button
     - Alerts list (using AlertRow)
     - AlertModal (for create and edit)
   - Handle:
     - Opening modal in create or edit mode
     - Passing selected alert data to AlertModal
     - Creating new alerts
     - Updating existing alerts
     - Deleting alerts (with confirmation)
     - Toggling alert active/inactive state
   - Persist all alert changes to localStorage.

2. AlertRow (list item / row component):
   Responsibilities:
   - Display alert name.
   - Display alert status (Active / Inactive) with clear visual distinction.
   - Provide actions:
     - Toggle active/inactive
     - Edit
     - Delete
   - Emit events/callbacks to AlertsPage for all actions.
   - Remain stateless aside from UI-only concerns.

3. AlertModal (popup modal component):
   Responsibilities:
   - Reused for both “Create Alert” and “Edit Alert” modes.
   - Receive props:
     - mode ("create" | "edit")
     - initial alert data (null for create)
     - onSave
     - onCancel / onClose
   - Render a form with fields:
     - Alert Name (text input, required)
     - Query / Description (multiline input, required)
     - Similarity Threshold (slider or numeric input, 0–100)
     - Active Status (toggle or checkbox)

   UX polish requirements inside AlertModal:
   - Track dirty state by comparing current form values with initial values.
   - Disable the Save/Create button when:
     - Required fields are invalid
     - No changes have been made (edit mode, not dirty)
   - Show inline validation errors.
   - Warn about unsaved changes when the user:
     - Attempts to close the modal
     - Clicks outside the modal
     - Presses Escape
   - Show a confirmation dialog allowing:
     - Discard changes
     - Continue editing
   - Modal title and primary action text must change based on mode
     (e.g., “Create Alert” vs “Save Changes”).
   - Reset internal form state correctly when reopened or when mode changes.

Alert data model:
- Each alert must include:
  - id (unique identifier)
  - name
  - description/query
  - similarityThreshold (number 0–100)
  - isActive (boolean)

Alerts page behavior:
- Display a list or table of alerts using AlertRow.
- Allow activating/deactivating alerts directly from the list.
- Reflect all changes immediately in the UI.
- Provide an empty state when no alerts exist.

Technical constraints:
- Assume a modern React application using functional components and hooks.
- Use localStorage for persistence.
- Load alerts from localStorage on page load.
- Keep code clean, modular, and readable.
- Add concise inline comments where logic is non-obvious.
- Follow existing design system and UI patterns.

Out of scope:
- Backend APIs
- AI matching logic
- Notification delivery

