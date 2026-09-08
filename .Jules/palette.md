
## $(date +%Y-%m-%d) - Accessible Pagination for Screen Readers
**Learning:** Pagination controls built with raw <div> wrappers and &laquo;/&raquo; buttons are completely opaque to screen readers, causing navigation to be announced simply as "button, 1, button, 2, button".
**Action:** Always wrap pagination in <nav aria-label="Nawigacja po stronach">, provide descriptive aria-labels for prev/next buttons ("Poprzednia strona"), dynamically label page buttons ("Strona X"), and use aria-current="page" to explicitly communicate the active state.
