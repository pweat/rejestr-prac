## 2024-05-24 - Initial Journal
**Learning:** Initialize journal.
**Action:** Always maintain good UX.
## 2026-10-02 - Accessible Pagination
**Learning:** Pagination controls lacking semantic nav wrappers and ARIA labels decrease screen reader usability.
**Action:** Always wrap pagination in `<nav aria-label="Pagination">`, use `aria-current="page"` for active pages, and provide descriptive `aria-label`s for next/prev buttons and page numbers.
