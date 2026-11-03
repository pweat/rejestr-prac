## 2026-11-03 - Pagination Accessibility in Vue
**Learning:** When creating pagination controls, using semantic `<nav>` elements and Polish ARIA labels is essential. Vue's dynamic attributes allow removing attributes cleanly by returning `null`, e.g., `:aria-label="page !== '...' ? 'Strona ' + page : null"`.
**Action:** Always wrap pagination in `<nav aria-label="Nawigacja po stronach">` and add `type="button"` with descriptive Polish ARIA labels to icon-only next/prev buttons and dynamic page indicators.
