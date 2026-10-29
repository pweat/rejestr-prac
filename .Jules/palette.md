## 2024-10-29 - Pagination Nav and Localized ARIA Labels
**Learning:** In a Polish app, the pagination component lacked a semantic `<nav>` wrapper and its buttons were missing localized ARIA labels, making it completely opaque to screen readers.
**Action:** Wrapped the pagination in `<nav aria-label="Nawigacja po stronach">` and added descriptive Polish ARIA labels ('Poprzednia strona', 'Następna strona', 'Strona $page') to the buttons.
