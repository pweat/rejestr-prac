## 2026-08-06 - Enhanced Interactive Element Accessibility
**Learning:** Missing ARIA labels and `type="button"` on icon-only buttons (like `&times;` and `&laquo;`) cause accessibility issues for screen readers and prevent form submission overrides. Using native elements correctly with ARIA significantly improves the app's structural semantics.
**Action:** Always wrap pagination in a `<nav aria-label="...">`, apply `aria-current="page"` on the active page, and ensure all icon-only buttons have explicit ARIA labels and title attributes.
