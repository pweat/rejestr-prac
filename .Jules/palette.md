## 2026-10-07 - Accessible Pagination Controls
**Learning:** Pagination controls require semantic `<nav>` wrappers and specific ARIA labels (like `aria-current="page"` and dynamic page labels) to be fully usable by screen readers, replacing visual-only generic `<div>` wrappers.
**Action:** Always wrap pagination components in a `<nav aria-label="Pagination">` element and provide explicit `aria-label` attributes for icon-only navigation buttons like "Next" and "Previous", as well as `aria-current` for active states.
