## 2026-10-01 - Pagination Accessibility
**Learning:** The `PaginationControls.vue` component requires English ARIA labels to maintain consistency with its internal logic, overriding the application's general Polish localization rule.
**Action:** Use semantic `<nav>` wrappers and English ARIA labels (e.g., 'Previous page', 'Next page') for pagination controls, and conditionally apply `null` labels for non-interactive elements like ellipses.
