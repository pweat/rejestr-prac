
## 2026-10-05 - Pagination Accessibility
**Learning:** Pagination controls built with `<div>` lack semantic meaning for screen readers. Buttons like '&laquo;' (Previous) and '&raquo;' (Next) are often announced poorly. Also, screen reader users need to know which page is currently active.
**Action:** Always wrap pagination controls in a `<nav aria-label="Pagination">`. Add explicit `aria-label="Previous page"` and `aria-label="Next page"` to navigation buttons. Use `:aria-label="\`Page \${page}\`"` on page number buttons, and conditionally apply `aria-current="page"` to the active page button. Keep language in English if internal vars dictate it, contrary to app's general localization rule, for consistency with variable bindings.
