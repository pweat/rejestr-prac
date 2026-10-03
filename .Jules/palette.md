## 2026-10-03 - Accessible Pagination Navigation
**Learning:** Pagination controls without a <nav> wrapper and proper aria-current states fail to communicate the current context and navigation structure to screen readers.
**Action:** Always wrap pagination controls in a <nav aria-label="Pagination">, apply aria-current="page" to the active page button, and provide explicit aria-labels for previous/next and individual page buttons.
