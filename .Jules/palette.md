## 2026-08-05 - Pagination Accessibility
**Learning:** Semantic `<nav>` wrappers and detailed ARIA labels ('Strona ${page}', 'Poprzednia strona') are essential for screen readers to interpret pagination controls correctly, especially in localized apps like Polish.
**Action:** Always wrap pagination in a `<nav aria-label="...">` and provide context to individual page buttons using `:aria-label` and `:aria-current="page"`.
