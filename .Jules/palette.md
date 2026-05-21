## 2026-05-21 - Accessible Pagination Controls
**Learning:** Icon-only navigation buttons (&laquo; and &raquo;) and numeric page buttons in pagination lack context for screen reader users, especially in a localized application.
**Action:** Wrapped pagination in a semantic `<nav aria-label="Nawigacja po stronach">`, added `aria-label="Poprzednia strona"` / `"Następna strona"` to prev/next buttons, dynamic `aria-label="Strona ${page}"` for specific pages, and `aria-current="page"` to the active page indicator. Ensure ellipsis elements conditionally receive null labels.
