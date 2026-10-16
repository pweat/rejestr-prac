## 2023-10-16 - Initial Setup
**Learning:** Initializing palette journal.
**Action:** Ready to record UX learnings.
## 2026-10-16 - Pagination Accessibility
**Learning:** Pagination controls often lack semantic wrappers and ARIA labels. Using a `<nav aria-label="...">` wrapper, `aria-current="page"` for the active item, and descriptive Polish `aria-label`s for pagination buttons significantly improves screen reader navigation.
**Action:** Always wrap pagination in a `<nav>` with `aria-label`, and use `aria-current` and explicit button `aria-label`s (matching local language) in pagination components.
