## 2026-05-13 - Accessible Icon-Only Buttons
**Learning:** Icon-only buttons for critical actions (closing modals, deleting entries) lack accessible names, making them invisible to screen readers and difficult to use for keyboard navigators, especially in dynamically rendered lists or dialogs.
**Action:** Always provide an `aria-label` (e.g., `aria-label="Zamknij"` or `aria-label="Usuń wpis"`) on buttons that use only HTML entities (`&times;`, `×`) or icons for their visual representation.
