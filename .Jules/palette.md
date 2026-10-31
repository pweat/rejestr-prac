## 2024-10-31 - Accessible Semantic Pagination
**Learning:** Pagination controls built with standard `<div>` elements and basic buttons lack the context screen readers need. Specifically, using `<nav aria-label="Nawigacja po stronach">` correctly semantically groups the controls, and binding `aria-current="page"` accurately informs users of their current location within the set.
**Action:** Always wrap pagination components in a `<nav>` with a descriptive aria-label, and use dynamic binding for `aria-current` and individual page labels.
