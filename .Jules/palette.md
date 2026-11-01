## 2024-11-01 - [Accessible Pagination]
**Learning:** The Pagination controls needed better semantic structure and a11y support. By wrapping pagination links with `<nav aria-label="Nawigacja po stronach">` and tagging the active page with `aria-current="page"`, screen readers correctly parse and announce the pagination state in Polish.
**Action:** In Vue components, dynamically bind accessibility props like `:aria-current="page === currentPage ? 'page' : null"` and `:aria-label="... ? null : \`Strona ${page}\`"`. Avoid generic `div`s for navigation groupings.
