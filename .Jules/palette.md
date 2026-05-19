## 2026-05-19 - Polish Pagination Accessibility
**Learning:** Pagination requires localized semantic wrappers (`<nav aria-label="Nawigacja po stronach">`) and specific aria attributes for prev/next buttons, page numbers, and active states (`aria-current="page"`) to be properly read by screen readers in a Polish application.
**Action:** Always wrap pagination controls in a semantic `<nav>` tag and apply appropriate localized `aria-label` attributes to the previous, next, and individual page buttons, ensuring ellipsis buttons receive null labels.
