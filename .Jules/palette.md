## 2026-10-24 - Semantic Pagination Accessibility
**Learning:** Custom pagination controls often lack semantic structure and ARIA attributes. Using a <nav> element with an appropriate aria-label establishes a clear landmark, while dynamic ARIA properties (aria-current and aria-label with template literals) significantly enhance the screen reader experience for numbered page buttons.
**Action:** Always wrap pagination components in a semantic <nav> landmark, label prev/next buttons for icon-only text, and dynamically assign aria-current and page-specific aria-labels to numeric page indicators.
