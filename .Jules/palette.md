## 2026-09-19 - Pagination Accessibility
**Learning:** Pagination controls should use semantic `<nav>` wrappers and explicit ARIA labels (e.g., `Previous page`, `Page ${page}`) because screen readers do not always announce visual indicators like `&laquo;` clearly.
**Action:** Always wrap pagination in a semantic `<nav aria-label="Pagination">` and add specific ARIA attributes for active states (`aria-current="page"`) and icon-only buttons.
