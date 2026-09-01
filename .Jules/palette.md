## 2026-09-01 - Added Pagination ARIA roles
**Learning:** Pagination controls often use <div> and plain buttons with text like "&laquo;", which is inaccessible to screen readers.
**Action:** Always wrap pagination in a semantic <nav aria-label="..."> element, provide specific aria-labels for next/prev buttons, and use aria-current="page" on the active page indicator.
