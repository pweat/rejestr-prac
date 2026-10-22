## 2026-10-22 - Pagination Accessibility
**Learning:** Pagination controls often lack semantic structure and context for screen readers. Ellipsis items in pagination arrays need special handling to avoid announcing nonsense labels.
**Action:** Use a `<nav>` wrapper with a descriptive `aria-label`. Ensure all icon buttons have `aria-label`s. Conditionally apply `aria-label` (by binding to `null`) and `aria-current` to page numbers to skip ellipsis and identify the active page.
