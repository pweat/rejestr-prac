## 2026-06-26 - Accessible Icon-Only Buttons
**Learning:** Icon-only buttons (like close or delete) without `type="button"` can cause accidental form submissions in Vue applications, and missing `aria-label`s severely hinder screen reader accessibility, particularly for non-English localizations.
**Action:** Always ensure `.close-button` and `.btn-del` elements explicitly declare `type="button"` and include appropriate localized `aria-label` attributes (e.g., `aria-label="Zamknij"` or `aria-label="Usuń wpis"`).
