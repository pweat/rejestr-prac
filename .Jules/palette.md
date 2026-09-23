## 2024-05-18 - Pagination Accessibility
**Learning:** Pagination controls lacked semantic `nav` wrappers and ARIA labels for next/prev buttons and dynamic page indicators, preventing screen readers from understanding the navigation context.
**Action:** Always wrap pagination in `<nav aria-label="Pagination">` and add `aria-current="page"` and descriptive labels (`aria-label`) to individual page buttons.
