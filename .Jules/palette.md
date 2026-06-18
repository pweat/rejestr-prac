## 2026-06-18 - Missing ARIA Labels on Icon Buttons
**Learning:** Found multiple instances of icon-only buttons (`.close-button` with `&times;` and `.btn-del` with `×`) lacking `aria-label` attributes across Vue components. This severely impacts accessibility for screen reader users, who will just hear "button" without context.
**Action:** When adding or modifying interactive icon-only elements (like close or delete buttons), ensure they include descriptive, localized `aria-label` attributes (e.g., `aria-label="Zamknij"` or `aria-label="Usuń wpis"`).
