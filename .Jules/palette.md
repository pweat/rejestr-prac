
## 2026-10-11 - Pagination Accessibility Pattern
**Learning:** For `PaginationControls.vue`, because its internal structure and variables are in English, we must override the application's general Polish localization rule for ARIA labels, using a semantic `<nav aria-label="Pagination">` and English labels (e.g., 'Previous page', 'Page ${page}').
**Action:** Apply English ARIA attributes and semantic wrappers to components whose internal context is English, ensuring `aria-current="page"` and null labels for ellipses.
