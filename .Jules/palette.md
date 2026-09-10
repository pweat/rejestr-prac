## 2026-09-10 - Semantic Pagination
**Learning:** Pagination controls often lack proper semantic structure (`<nav>`) and screen reader context for icon-only prev/next buttons or specific page numbers, making them difficult to navigate for non-sighted users.
**Action:** Always wrap pagination in a `<nav aria-label="...">` element, add `aria-current="page"` to the active page button, and provide explicit `aria-label`s for all navigation buttons (e.g., "Previous page", "Page 2").
