## 2026-04-22 - Pagination Accessibility
**Learning:** Pagination controls with dynamic page numbers and ellipses need precise ARIA labeling in Polish locale to avoid confusing screen reader announcements, specifically conditionally hiding the aria-label for ellipses.
**Action:** Always apply `aria-label`s for 'Poprzednia/Następna strona' and specific page numbers, along with `aria-current="page"`, while conditionally omitting standard labels for omission indicator elements. Use semantic `<nav>` wrappers.
