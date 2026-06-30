## 2026-06-25 - Pagination Accessibility
**Learning:** Pagination components often lack semantic structure (nav) and rely purely on visual cues for active states and navigation buttons, making screen reader navigation difficult.
**Action:** Always wrap pagination in a nav with a descriptive aria-label, use aria-current="page" for the active page, and provide aria-labels for icon-only prev/next buttons and page numbers.
