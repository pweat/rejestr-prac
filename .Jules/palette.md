## 2026-08-29 - Pagination Accessibility
**Learning:** Pagination controls built with raw divs and symbols are opaque to screen readers, missing structural context and element purpose.
**Action:** Always wrap pagination in a <nav aria-label="..."> and provide explicit aria-labels for navigation buttons, and aria-current for the active page.
