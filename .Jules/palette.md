## 2026-10-22 - Pagination Accessibility
**Learning:** Pagination controls often lack semantic wrappers and context for screen readers, making navigation ambiguous when just using div and button without labels.
**Action:** Always wrap pagination in `<nav aria-label="Nawigacja po stronach">`, use `aria-current="page"` for active state, and label buttons with `aria-label` containing the page number or direction, handling dots/ellipsis with null bindings.
