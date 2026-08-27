## 2026-08-27 - Pagination Accessibility
**Learning:** Pagination controls without proper <nav> wrappers, aria-label, and aria-current attributes are inaccessible to screen readers, as page numbers are typically indicated visually via an .active class.
**Action:** Always wrap pagination in <nav aria-label="...">, add explicit aria-label for prev/next/page buttons, and use aria-current="page" to indicate the active page.
