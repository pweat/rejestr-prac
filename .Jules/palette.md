## 2026-06-24 - Accessible Pagination Navigation
**Learning:** Polish screen readers require explicitly translated semantic ARIA labels for navigation landmarks ('Nawigacja po stronach') and precise state indicators ('aria-current="page"') on dynamically generated numerical pagination components to provide meaningful context over raw numeric output.
**Action:** Always wrap pagination controls in a <nav> with a descriptive aria-label, and use :aria-current and dynamically bound :aria-label for the actual page numbers in Vue templates.
