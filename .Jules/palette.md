## 2026-08-15 - Pagination Accessibility
**Learning:** Pagination controls lacking semantic <nav>, aria-label, and aria-current attributes make it difficult for screen reader users to navigate lists of items. The default &laquo; and &raquo; symbols are not descriptive.
**Action:** Use a semantic <nav aria-label="Nawigacja po stronach"> wrapper. Use 'Poprzednia strona' and 'Następna strona' for prev/next buttons, 'Strona ${page}' for page buttons, and apply aria-current="page" to the active page indicator.
