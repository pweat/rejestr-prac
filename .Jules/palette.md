## 2026-10-25 - Pagination Accessibility
**Learning:** Generic div wrappers for pagination controls prevent screen readers from announcing them as navigation landmarks, and generic numbered buttons lack context. Icon-only pagination buttons also need tooltips and explicit button types.
**Action:** Always wrap pagination in a semantic `<nav aria-label="...">`, add explicit `aria-label`, `title`, and `type="button"` to prev/next buttons, and use `aria-current="page"` and descriptive `aria-label` for page numbers.
