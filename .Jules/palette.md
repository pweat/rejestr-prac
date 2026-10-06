## 2026-10-06 - Pagination Accessibility
**Learning:** Pagination controls need semantic `<nav>` wrappers and explicit ARIA labels for active states and dynamic page numbers, even when visually intuitive.
**Action:** Always apply `aria-label` and `aria-current="page"` to pagination components and ensure non-button elements like ellipsis are correctly handled or hidden from screen readers.
