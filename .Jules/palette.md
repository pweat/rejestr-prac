## 2024-05-24 - Initial Setup
**Learning:** Initial Palette setup
**Action:** Explore application to find a micro-UX improvement.
## 2026-09-21 - Pagination Accessibility
**Learning:** Pagination controls lacked semantic wrapper, ARIA labels for icon-only buttons, and current page indication. Since internal variables are in English, English ARIA labels are required.
**Action:** Always wrap pagination in a semantic `<nav aria-label="Pagination">` and provide `aria-label` for previous/next/page buttons along with `aria-current="page"` for the active item.
