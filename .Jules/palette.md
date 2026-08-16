## 2026-08-16 - Pagination Accessibility
**Learning:** In Polish applications, pagination controls need explicit ARIA labels like 'Nawigacja po stronach' and 'Strona N' for screen readers, as symbols like &laquo; and &raquo; are not natively descriptive. Conditional aria-label (null) for ellipsis prevents screen readers from reading meaningless dots.
**Action:** Always wrap pagination in <nav aria-label="...">, provide clear translated labels for prev/next buttons, use aria-current="page" for the active state, and conditionally omit aria-labels for non-navigable ellipsis items.
