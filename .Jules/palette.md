## 2026-07-23 - Adding aria-labels to icon-only buttons
**Learning:** Icon-only interactive elements like close buttons (`&times;`) or delete buttons (`×`) often lack semantic labels, making them inaccessible to screen readers.
**Action:** Always add explicit `aria-label` attributes to icon-only buttons (e.g., `aria-label="Zamknij"` for close buttons and `aria-label="Usuń wpis"` for delete buttons in table rows) and ensure they have `type="button"` to prevent accidental form submission.
