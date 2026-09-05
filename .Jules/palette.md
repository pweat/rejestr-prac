## 2026-09-05 - Pagination Accessibility Patterns
**Learning:** Standard div-based pagination with raw symbols (&laquo;, &raquo;) lacks semantic meaning for screen readers. Using a nav element, aria-labels for buttons, and aria-current for the active page significantly improves structural navigation.
**Action:** Always wrap pagination in a <nav aria-label="..."> and provide explicit screen-reader labels for next/prev/page buttons, ensuring ellipsis items conditionally receive null labels.
