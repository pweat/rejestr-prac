## 2026-10-14 - Accessible Pagination Controls
**Learning:** Using semantic `<nav>` and appropriate `aria-label` and `aria-current` attributes improves screen reader support for pagination components.
**Action:** Always wrap pagination in `<nav aria-label="Pagination">` and provide explicit English ARIA labels for buttons (e.g., 'Previous page', 'Next page', 'Page ${page}') and `aria-current="page"` for the active page when component variables are in English.
