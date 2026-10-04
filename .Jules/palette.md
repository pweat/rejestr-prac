## 2026-10-04 - Semantic Pagination
**Learning:** Pagination controls lacking semantic wrappers and specific ARIA labels make it difficult for screen reader users to understand navigation.
**Action:** Use `<nav aria-label="Pagination">`, `aria-label="Previous page"` / `"Next page"`, and `aria-current="page"` to clearly indicate pagination structure and state.
