
## 2026-08-01 - Accessible Pagination
**Learning:** Pagination controls built with div wrappers and icon-only buttons (&laquo;/&raquo;) are invisible to screen readers, and screen readers cannot distinguish the currently active page without aria-current.
**Action:** Always wrap pagination in a semantic <nav aria-label="Navigation context">, add aria-labels to previous/next arrows, and use aria-current="page" on the active page indicator.
