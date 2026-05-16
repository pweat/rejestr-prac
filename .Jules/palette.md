## 2026-05-16 - Pagination Accessibility
**Learning:** Pagination controls across the app lacked semantic `<nav>` wrappers and localized Polish `aria-label`s, making screen reader navigation difficult.
**Action:** Converted the pagination container to a `<nav aria-label="Nawigacja po stronach">` and added localized `aria-label`s ('Poprzednia strona', 'Następna strona', 'Strona ${page}') and `aria-current="page"` to the interactive buttons.
