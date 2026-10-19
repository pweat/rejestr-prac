## 2026-10-19 - Pagination Accessibility
**Learning:** Using a `div` without ARIA labels for pagination makes it difficult for screen reader users to navigate effectively.
**Action:** Use a semantic `<nav aria-label="Nawigacja po stronach">` wrapper and provide Polish ARIA labels for individual page controls, including `aria-current="page"` for the active indicator.
