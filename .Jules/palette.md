
## 2026-08-07 - Accessible Icon-Only Buttons
**Learning:** Many interactive icon-only buttons (like `&times;` or `×` for close/delete actions) were lacking `type="button"`, causing potential accidental form submissions, and were missing `aria-label` / `title` attributes, severely reducing accessibility and lacking helpful tooltips for sighted users.
**Action:** Consistently apply `type="button"`, descriptive `aria-label`, and `title` attributes to all icon-only buttons across the app components.
