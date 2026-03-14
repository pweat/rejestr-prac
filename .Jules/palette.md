## 2026-03-14 - Enhanced Pagination Accessibility
**Learning:** Pagination controls lacking semantic ARIA labels makes them unhelpful for screen readers, as they just see identical links. This is a common pattern in this app's components, where pagination controls lack 'aria-label' attributes.
**Action:** Added semantic HTML '<nav>' with 'aria-label' mapping pages accurately, and labels for next/prev buttons.
