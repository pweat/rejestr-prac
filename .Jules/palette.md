## 2026-07-18 - Pagination Accessibility
**Learning:** Pagination controls often lack screen reader support, leaving users without context for '...' dots and page numbers, especially in localized applications.
**Action:** Wrap pagination in a <nav> with aria-label, apply aria-label="Poprzednia strona" / aria-label="Następna strona" to prev/next arrows, use aria-label="Strona [number]" for individual pages (omitting for ellipsis), and mark the active page with aria-current="page".
