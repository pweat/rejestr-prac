
## 2026-09-28 - Semantic Pagination Accessibility
**Learning:** Pagination components often rely on visual cues (like &laquo;, &raquo;, and highlighting the active number) and generic div wrappers, which leaves screen reader users without context about the navigation block, the purpose of icon-only buttons, or the currently active page.
**Action:** Always wrap pagination in a semantic <nav aria-label="Pagination">, provide explicit aria-label attributes for icon-only previous/next buttons and individual page buttons, and use aria-current="page" to programmatically indicate the active state.
