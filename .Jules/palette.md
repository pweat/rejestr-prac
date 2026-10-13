## 2026-10-13 - ARIA Labels on Icon-Only Buttons
**Learning:** Many icon-only interactive elements in the application (like `&times;` close buttons or `×` delete buttons) lacked proper ARIA attributes, making them inaccessible to screen readers.
**Action:** Always verify that buttons containing only visual symbols have descriptive `aria-label` and `title` attributes, and include `type="button"` to avoid accidental form submissions. Apply to `.close-button` and `.btn-del` classes.
