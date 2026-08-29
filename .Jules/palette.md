## 2026-07-04 - Accessible Icon Buttons
**Learning:** Icon-only delete buttons (`.btn-del` with `×`) lack ARIA labels, making them inaccessible to screen readers in Polish locale. They also need `type="button"` to prevent unintended form submissions if ever wrapped in a form.
**Action:** Always add `type="button"` and `aria-label="Usuń wpis"` to icon-only buttons to ensure they are accessible and semantically correct.
