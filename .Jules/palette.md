## 2026-04-19 - Pagination Accessibility
**Learning:** Adding ARIA labels to pagination controls with `aria-label` and replacing `<div>` with `<nav>` ensures correct screen reader support. Handling ellipsis buttons requires careful ARIA handling (setting aria-label to null) to avoid misleading readouts.
**Action:** Use `<nav aria-label="...">` instead of `<div>` for pagination, and add specific ARIA labels for 'Previous', 'Next', and specific pages, ensuring no labels are added to empty/ellipsis buttons.
