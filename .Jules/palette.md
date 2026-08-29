## 2026-08-04 - Accessible Icon-Only Buttons
**Learning:** Icon-only buttons (like `&times;` or `×`) require `type="button"` to prevent accidental form submissions, and `aria-label` with `title` for screen readers and tooltips to provide context to users. The default Polish application language dictates using Polish labels ("Zamknij", "Usuń wpis").
**Action:** Always add `type="button"`, `aria-label`, and `title` to icon-only interactive elements (like `.close-button` or `.btn-del`).
