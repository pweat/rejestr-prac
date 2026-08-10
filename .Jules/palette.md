## 2026-08-10 - Accessible Pagination Component
**Learning:** Pagination controls often use meaningless characters like &laquo; or simple numbers, providing zero context for screen reader users on what the buttons do, and missing aria-current makes it impossible to know the active page.
**Action:** Always wrap pagination in a <nav aria-label="Navigation purpose">, add descriptive aria-labels to icon-only prev/next buttons (e.g., "Poprzednia strona"), label numbered pages (e.g., "Strona 1"), and mark the active page with aria-current="page".
