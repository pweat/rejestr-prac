## 2026-08-18 - Pagination Accessibility
**Learning:** Pagination components often lack semantic wrappers and accessible names for page numbers, making screen reader navigation confusing.
**Action:** Always wrap pagination in <nav aria-label="...">, use aria-current="page" for the active state, and provide descriptive aria-labels for page numbers and prev/next buttons.
