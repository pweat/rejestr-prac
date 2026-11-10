## 2026-11-10 - Accessible Pagination Component
**Learning:** Pagination controls built with `<div>` and icon-only buttons (`&laquo;`) cause screen readers to announce meaningless text, and the active page isn't identified.
**Action:** Always wrap pagination in `<nav aria-label="Nawigacja po stronach">`, provide semantic labels for previous/next actions ("Poprzednia strona"), and use `aria-current="page"` for the active page indicator.
