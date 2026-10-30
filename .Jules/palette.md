## 2026-08-11 - Accessible Pagination Controls
**Learning:** Pagination controls lacked semantic nav wrappers, aria-label, and aria-current attributes, making screen reader navigation difficult.
**Action:** Always wrap pagination in <nav aria-label="...">, provide clear labels for prev/next buttons, and use aria-current="page" for the active page.
