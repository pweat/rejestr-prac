## 2026-11-07 - Accessible Pagination Navigation
**Learning:** Icon-only pagination controls (`&laquo;`, `&raquo;`) lack descriptive labels for screen readers, and the wrapper `<div>` lacks semantic meaning. Without `aria-current`, users can't identify the active page.
**Action:** Always wrap pagination in `<nav aria-label="...">`, add `aria-label` and `title` to icon buttons, and use `:aria-current="page === currentPage ? 'page' : null"` for active state.
