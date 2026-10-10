## 2026-10-10 - Pagination Accessibility
**Learning:** Pagination components often rely on unlabelled wrapper divs and icon-only previous/next buttons (like `&laquo;`), making them invisible or confusing to screen readers.
**Action:** Always wrap pagination in `<nav aria-label="Pagination">`, assign descriptive labels to previous/next buttons, label individual page buttons, and indicate the active page with `aria-current="page"`.
