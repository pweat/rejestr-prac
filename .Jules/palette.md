## 2025-04-01 - [Semantic HTML for Pagination]
**Learning:** Found an accessibility issue pattern in the codebase. Pagination controls use `<div>` instead of semantically correct `<nav>` and icon-only buttons (`&laquo;`, `&raquo;`) lack `aria-label` attributes for screen readers. Also missing `aria-current="page"` for active elements.
**Action:** Use semantically correct `<nav>` tag and always add contextual Polish translations for `aria-label` in pagination components (e.g., 'Poprzednia strona', 'Nawigacja po stronach'). Apply `aria-current="page"` to the currently active page.
