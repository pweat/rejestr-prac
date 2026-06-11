## 2024-05-24 - Accessibility on Pagination Controls
**Learning:** Found that pagination wrapper requires specific ARIA semantics in Polish locale.
**Action:** When working on pagination, ensure `<nav aria-label="Nawigacja po stronach">` is used and individual controls use proper labels ('Poprzednia strona', 'Następna strona').
## 2026-06-11 - Pagination Accessibility in Polish Locale
**Learning:** The pagination component requires a semantic <nav aria-label="Nawigacja po stronach"> wrapper in the Polish locale, and its individual controls (like prev/next buttons and page numbers) must have explicit aria-label and aria-current attributes for screen readers.
**Action:** Updated PaginationControls.vue to use semantic <nav> and added ARIA labels ('Poprzednia strona', 'Następna strona', 'Strona ${page}') and active page indicators to ensure full keyboard and screen reader accessibility.
