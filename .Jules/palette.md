
## 2026-04-24 - Missing ARIA labels on icon-only close buttons
**Learning:** Modal close buttons using the `&times;` entity without text labels lack context for screen reader users in the Polish locale.
**Action:** Always include `aria-label="Zamknij"` on `.close-button` components containing only icons or HTML entities.
