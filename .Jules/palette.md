
## 2026-08-08 - Accessible Pagination Controls
**Learning:** Standard pagination controls built with div wrappers and simple buttons lack context for screen readers. In a Polish locale application, using semantic `<nav>` elements with localized ARIA labels ('Nawigacja po stronach', 'Poprzednia strona', 'Następna strona') and dynamic `aria-current="page"` for active state provides necessary context without changing visual design.
**Action:** Always wrap pagination components in a semantic `<nav>` tag with an appropriate `aria-label`. Ensure previous/next buttons have descriptive labels, and active page indicators use `aria-current="page"`. Conditionally omit labels for non-interactive elements like ellipses.
