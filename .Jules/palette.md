## 2026-05-18 - Accessible Delete Actions
**Learning:** Icon-only delete buttons (like `×`) lack accessible names for screen reader users, making destructive actions ambiguous in the Polish locale.
**Action:** Always ensure icon-only buttons include descriptive `aria-label` attributes (e.g., `aria-label="Usuń wpis"`) to provide clear context for assistive technologies.
