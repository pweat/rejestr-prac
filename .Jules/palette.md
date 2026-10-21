## 2026-10-21 - Pagination Accessibility
**Learning:** In Vue, passing `null` to a dynamic ARIA attribute conditionally removes it, which is useful for pagination elements like ellipsis (`...`) that shouldn't receive page-specific labels. Using semantic `<nav>` elements for pagination components significantly improves screen reader navigation.
**Action:** Always wrap pagination components in `<nav aria-label="...">` and provide localized `aria-label`s for next/prev buttons and individual page numbers, managing the `aria-current` state for active pages.
