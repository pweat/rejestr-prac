## 2026-05-04 - Modal Close Button Accessibility Pattern
**Learning:** Modal dialogs across the application (e.g., ClientsView, InventoryView, JobsView) consistently use a standard `&times;` close button but lack ARIA labels, rendering them inaccessible to screen readers in the Polish localization.
**Action:** Always verify that icon-only buttons (`&times;`, SVG icons) have appropriate descriptive `aria-label` attributes (like `aria-label="Zamknij"`) applied to ensure full accessibility for all users.
