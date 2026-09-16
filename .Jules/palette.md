## 2026-09-16 - Pagination Accessibility
**Learning:** Pagination controls lacked semantic wrapper and ARIA attributes for screen readers, making navigation unclear.
**Action:** Use semantic <nav> wrapper with aria-label="Nawigacja po stronach" and apply aria-current="page", aria-label for individual page buttons and prev/next buttons.
