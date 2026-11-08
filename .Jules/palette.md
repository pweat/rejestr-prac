## 2026-11-08 - Accessibility for Pagination
**Learning:** Pagination controls lacking semantic `<nav>` and `aria-label`s make it difficult for screen reader users to navigate between pages.
**Action:** Always wrap pagination in a `<nav>` element with a descriptive `aria-label` and provide screen-reader-friendly labels for previous, next, and individual page buttons, including `aria-current="page"` for the active state.
