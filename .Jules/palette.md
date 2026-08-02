## 2026-08-02 - Missing ARIA Labels on Icon-Only Action Buttons
**Learning:** Icon-only buttons (like `.btn-del` with just "×") in data tables lack accessible names and `type="button"`, causing screen readers to misinterpret them and risking accidental form submissions.
**Action:** Always include `type="button"`, `aria-label`, and `title` on icon-only action elements (e.g., delete or close buttons) to ensure keyboard/screen reader accessibility and proper Polish localization (e.g., `aria-label="Usuń wpis"`).
