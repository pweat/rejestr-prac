## 2026-10-26 - Pagination Accessibility
**Learning:** Pagination components in this app lacked semantic `<nav>` wrappers and Polish ARIA labels for non-textual controls (`&laquo;`, `&raquo;`), causing poor screen reader navigation. Ellipsis buttons (`...`) also need `null` ARIA labels to prevent nonsensical reads.
**Action:** Always wrap pagination in `<nav aria-label="Nawigacja po stronach">`, provide descriptive localized ARIA labels like `Poprzednia strona` for arrows, and use `:aria-label="page !== '...' ? \`Strona ${page}\` : null"` with `:aria-current` for dynamic page buttons.
