## 2026-03-08 - Icon-Only Buttons Missing Context
**Learning:** The application extensively uses `&times;` and `&laquo;`/`&raquo;` for modal close buttons and pagination controls across multiple views without accessibility labels.
**Action:** Added Polish `aria-label` attributes (e.g. `Zamknij`, `Poprzednia strona`) to icon-only buttons to ensure screen reader users understand their function.
