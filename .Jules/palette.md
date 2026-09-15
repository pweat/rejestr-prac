
## 2026-09-15 - Accessible Pagination
**Learning:** Pagination controls built with buttons and `<div>` lack semantics and screen reader context for which page is active.
**Action:** Use a `<nav aria-label="Pagination">` wrapper, `aria-current="page"` for active indicators, and explicit `aria-label` attributes (`Page ${page}`) on individual page buttons.
