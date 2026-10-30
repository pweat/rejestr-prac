## 2026-10-30 - Semantic Pagination and ARIA Labels
**Learning:** Pagination controls built with raw `div` and basic buttons lack context for screen readers. Using `<nav>` with `aria-label` provides a navigational landmark, and explicitly identifying the current page with `aria-current="page"` clarifies state.
**Action:** Always wrap pagination components in `<nav>` and use descriptive ARIA attributes for structural and state clarity, adapting localization to the app's default language.
