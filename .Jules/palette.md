## 2026-07-03 - Accessible Pagination in Vue
**Learning:** Pagination controls built with raw `<div>` wrappers and symbol buttons (`&laquo;`) provide zero context to screen reader users in Polish locale applications. Using semantic `<nav>` wrappers and conditional `aria-current` binding is critical for proper screen reader navigation.
**Action:** Always wrap pagination controls in `<nav aria-label="Nawigacja po stronach">` and provide explicit `:aria-label` properties for next/prev symbols and current page indicators.
