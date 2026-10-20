## 2026-10-20 - Pagination Accessibility
**Learning:** For pagination controls, wrapping the buttons in a `<nav>` with an appropriate `aria-label` provides better context for screen readers. In Vue 3, passing `null` to dynamic attributes cleanly removes them (e.g. for ellipsis elements).
**Action:** Always use semantic `<nav>` elements for pagination and utilize dynamic `null` bindings in Vue 3 to conditionally remove ARIA attributes when they do not apply.
