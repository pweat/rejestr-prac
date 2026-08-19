
## 2026-08-19 - Pagination Accessibility
**Learning:** Custom pagination components often miss semantic <nav> wrappers and locale-specific ARIA labels for numbered pages and ellipsis buttons. Static elements like '...' can inadvertently be read by screen readers if not given null/undefined aria-labels.
**Action:** Use semantic <nav aria-label="...">, apply aria-current='page' to active items, and conditionally suppress aria-labels on non-interactive items like ellipsis.
