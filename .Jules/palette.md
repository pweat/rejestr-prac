## 2026-10-12 - Semantic Pagination ARIA Support
**Learning:** Pagination controls often lack screen-reader context if built with raw `<div>` and unlabelled buttons. Applying `<nav aria-label="Pagination">` and conditional ARIA labels (`aria-current`, `aria-label`) provides necessary semantic meaning for navigation without altering visual layout.
**Action:** Always use the `<nav>` element for pagination wrappers and ensure active page indicators utilize `aria-current="page"` while providing descriptive labels for next/previous actions.
