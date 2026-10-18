## 2026-10-18 - Pagination Accessibility
**Learning:** Pagination controls often lack semantic structure (<nav>) and explicit ARIA labels for screen readers to navigate between pages easily. Dynamic ellipsis ('...') require conditional aria-labels to avoid reading out non-interactive placeholders.
**Action:** Always wrap pagination in a <nav> element with an aria-label, and ensure all buttons (previous, next, and specific pages) have descriptive labels and an aria-current attribute for the active page.
