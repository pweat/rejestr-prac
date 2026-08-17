## 2024-05-24 - Semantic Pagination
**Learning:** Found pagination controls using a `<div>` instead of a semantic `<nav>` and lacking aria attributes for next/prev buttons as well as current page indicator, which hinders screen reader users navigating paginated lists.
**Action:** Use a `<nav>` with `aria-label="Nawigacja po stronach"` to wrap pagination. Add `aria-label` to icon-only next/prev buttons, and `aria-current="page"` to the currently active page button.
