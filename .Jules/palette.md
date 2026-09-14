## 2026-09-14 - Pagination Accessibility
**Learning:** For pagination accessibility in the Polish locale, use a semantic <nav aria-label="Nawigacja po stronach"> wrapper. Use 'Poprzednia strona' and 'Następna strona' for prev/next buttons, 'Strona ${page}' for page buttons, apply aria-current="page" to the active page indicator, and ensure ellipsis elements conditionally receive null labels.
**Action:** Always wrap pagination in a <nav> element and use appropriate aria attributes for page selection and navigation.
