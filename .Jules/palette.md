
## 2026-08-28 - Polish Pagination Accessibility
**Learning:** In the Polish locale, pagination requires specific semantic ARIA patterns including `<nav aria-label="Nawigacja po stronach">` and translated labels for buttons.
**Action:** Always use semantic `<nav>` for pagination wrappers and include `aria-label` (e.g., "Poprzednia strona", "Strona X") and `aria-current="page"` attributes to support screen readers.
