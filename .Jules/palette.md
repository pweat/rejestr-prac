## 2026-07-21 - Added aria-labels and type attributes to icon-only buttons
**Learning:** Icon-only buttons (like `&times;` and `×`) lacked accessible names and explicit `type="button"` attributes, making them inaccessible to screen readers and potentially causing unintended form submissions.
**Action:** Added `aria-label="Zamknij"` and `aria-label="Usuń wpis"` along with `type="button"` to `.close-button` and `.btn-del` classes across all Vue components to improve accessibility and interaction stability.
