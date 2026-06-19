## 2026-06-19 - Icon-only Buttons ARIA Labels and Types
**Learning:** Many icon-only interactive elements (e.g., modal close buttons with `&times;` and delete buttons with `×`) across Vue views were missing `type="button"` and `aria-label` attributes, which harms screen reader accessibility and could cause accidental form submissions.
**Action:** Ensure all icon-only buttons (`.close-button`, `.btn-del`) have `type="button"` and a localized Polish `aria-label` (e.g., "Zamknij", "Usuń wpis").
