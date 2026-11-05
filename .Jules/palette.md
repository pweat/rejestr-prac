## 2024-11-05 - Initialization
**Learning:** Initializing Palette's journal for critical UX/a11y learnings.
**Action:** Document important patterns discovered here.
## 2024-11-05 - Pagination Accessibility
**Learning:** Found that custom pagination controls lacked semantic navigation landmarks and state indicators. Screen readers announced them as a list of unlabelled buttons, and dynamically rendered buttons required conditional aria-labels.
**Action:** Always wrap pagination components in `<nav aria-label="...">`, provide descriptive labels for previous/next icons, and use `aria-current="page"` and dynamic `aria-label`s for the page indicators, handling ellipsis correctly.
