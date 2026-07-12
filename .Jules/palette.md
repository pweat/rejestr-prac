## 2026-07-12 - Semantic Pagination Accessibility
**Learning:** Pagination controls lacking a semantic `<nav>` wrapper, localized `aria-label`s on icon-only buttons (`&laquo;`), and `aria-current` state indicators are inaccessible to screen reader users.
**Action:** Always wrap pagination in `<nav aria-label="Nawigacja po stronach">`, apply explicit `aria-label`s for previous/next and individual page numbers, and mark the active page with `aria-current="page"`.
