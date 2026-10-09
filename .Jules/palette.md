## 2026-10-09 - Semantic Pagination
**Learning:** Using a `<nav>` with `aria-label="Pagination"` instead of a `<div>` provides essential context to screen readers, and dynamic page labels (`Page X`) combined with `aria-current="page"` explicitly communicate the pagination state. The internal structure language overrides the application's general localization rule.
**Action:** Always wrap pagination components in a `<nav aria-label="Pagination">` and provide contextual ARIA labels for next, previous, and individual page buttons along with `aria-current` for the active page.
