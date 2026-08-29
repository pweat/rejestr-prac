## 2026-06-21 - Semantic Pagination for Screen Readers
**Learning:** Pagination controls lacked semantic `nav` wrappers, ARIA labels for icon-only buttons (prev/next), and `aria-current` state indicators, making screen reader navigation difficult for Polish users.
**Action:** Applied `<nav aria-label="Nawigacja po stronach">` wrapper, added `aria-label="Poprzednia strona"` / `aria-label="Następna strona"` to chevron buttons, dynamic `aria-label="Strona ${page}"` to page numbers, and `aria-current="page"` to the active button.
