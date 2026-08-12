## 2026-08-12 - Pagination Accessibility
**Learning:** Pagination components in this application require semantic <nav> wrappers and explicit ARIA labels in Polish (e.g., 'Poprzednia strona') to ensure screen readers correctly interpret navigation intent.
**Action:** Always use <nav aria-label="..."> for pagination wrappers, apply aria-current="page" to the active page button, and dynamically assign aria-label to page numbers while explicitly nullifying ARIA attributes for non-interactive elements like ellipses.
