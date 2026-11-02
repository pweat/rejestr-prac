## 2026-11-02 - Pagination Accessibility
**Learning:** Pagination controls often use non-semantic `<div>` wrappers and lack ARIA labels for navigation buttons (like "Poprzednia strona" and "Następna strona"), making them inaccessible to screen reader users in the application's default Polish localization.
**Action:** Always wrap pagination in a `<nav aria-label="...">` element, add descriptive `aria-label` and `title` attributes to next/prev buttons, and use `aria-current="page"` for the active page indicator.
