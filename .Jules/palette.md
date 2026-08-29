## 2026-05-14 - Pagination Accessibility
**Learning:** Generic wrapper elements like `<div>` and icon-only pagination buttons prevent screen readers from properly interpreting page navigation controls, particularly when ellipses are used for omitted pages.
**Action:** Always wrap pagination in a `<nav>` with an `aria-label`, use descriptive `aria-label` attributes for previous/next buttons, and apply `aria-current="page"` to the active item, ensuring ellipses do not receive confusing page labels.
