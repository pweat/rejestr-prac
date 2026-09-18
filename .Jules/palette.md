## 2026-09-18 - Semantic Pagination Wrapper
**Learning:** Using a generic `<div>` wrapper for pagination controls makes it difficult for screen reader users to identify the section. The pagination buttons (prev, next, and page numbers) also lack context.
**Action:** Wrap pagination controls in a `<nav aria-label="Nawigacja po stronach">` element and provide clear, translated `aria-label` attributes for all buttons (e.g., 'Poprzednia strona', 'Następna strona', `Strona ${page}`) and `aria-current="page"` for the active indicator.
