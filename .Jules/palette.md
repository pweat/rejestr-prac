## 2024-05-24 - Semantic Pagination ARIA Roles
**Learning:** Pagination component lacks proper accessibility wrappers (`<nav>`) and English `aria-label` attributes for list items (as requested by prior rules).
**Action:** Enhance the `PaginationControls.vue` component with semantic `<nav aria-label="Pagination">` and dynamic `aria-label`s for the previous, next, and current page buttons.
