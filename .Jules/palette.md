## 2026-07-11 - Add ARIA labels and type to icon-only buttons
**Learning:** Icon-only interactive elements, such as close buttons (`.close-button` with `&times;`) and delete buttons (`.btn-del` with `×`), must include `type="button"` to prevent accidental form submissions, and descriptive `aria-label` attributes (e.g., `aria-label="Zamknij"` and `aria-label="Usuń wpis"`) to ensure proper Polish localization and accessibility for screen readers.
**Action:** Add `type="button"` and `aria-label` to all `.close-button` and `.btn-del` icon-only buttons across all Vue views.
