## 2026-07-13 - Pagination Accessibility
**Learning:** In Vue applications, standard pagination controls often lack semantic structure and ARIA attributes for screen readers, making it difficult for users to know the current page, next/previous buttons, or the context of the navigation.
**Action:** Always wrap pagination in a <nav aria-label="Nawigacja po stronach">, provide descriptive aria-labels for prev/next and page numbers, and use aria-current="page" on the active page.
