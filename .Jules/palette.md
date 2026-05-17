## 2026-05-17 - Missing ARIA Labels on Icon-Only Buttons
**Learning:** Across various views (like WeeklySettlementsView), icon-only close/delete buttons (e.g., `×`) lack accessible names. Screen readers will read these as arbitrary symbols rather than actionable commands.
**Action:** Always add `aria-label="Zamknij"` (Close) or `aria-label="Usuń wpis"` (Delete) to icon-only buttons to ensure they are accessible to users with visual impairments relying on screen readers.
