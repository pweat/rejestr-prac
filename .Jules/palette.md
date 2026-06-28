## 2026-06-28 - Pagination Accessibility
**Learning:** Pagination controls without semantic `<nav>`, `aria-label`, or `aria-current` attributes are difficult for screen-reader users to navigate. Ellipsis elements (`...`) should not be announced as typical pages.
**Action:** Always use `<nav aria-label="...">` for pagination wrappers, add `aria-label` to next/previous buttons, dynamically assign `aria-label="Strona [number]"` to page links, use `aria-current="page"` for the active page, and explicitly use `type="button"` on pagination buttons.
