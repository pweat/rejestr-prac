## 2026-04-26 - Pagination Accessibility Patterns
**Learning:** Generic wrapper elements (`<div>`) for pagination hide the navigation context from screen readers. Additionally, pagination items with '...' for omitted pages require careful `aria-label` handling to avoid announcing them as valid pages.
**Action:** Always use `<nav>` with a descriptive `aria-label` for pagination, provide clear localized labels for next/prev buttons, and conditionally skip ARIA labels on decorative elements like ellipses.
