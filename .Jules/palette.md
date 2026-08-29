## 2026-07-31 - Accessible Pagination Controls
**Learning:** Pagination controls (like prev/next arrows) are meaningless to screen readers without descriptive aria-labels. Additionally, indicating the current page via `aria-current="page"` and using a semantic `<nav>` improves navigation context.
**Action:** Always wrap pagination in `<nav aria-label="...">`, add explicit text/aria-labels to icon-only controls, and use `aria-current` to indicate the active state.
