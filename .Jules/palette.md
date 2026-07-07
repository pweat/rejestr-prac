## 2026-07-07 - Improve accessibility of icon-only buttons
**Learning:** Found that close buttons and delete buttons in the application were missing `type="button"` and semantic `aria-label`s, causing poor accessibility for screen readers and potential unintended form submissions.
**Action:** Mass update all `.close-button`s and `.btn-del` elements to include `type="button"` and localized `aria-label` attributes (`Zamknij` and `Usuń wpis`).
