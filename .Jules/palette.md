## 2026-07-06 - Icon-Only Buttons Accessibility
**Learning:** Many icon-only buttons (like `&times;` close buttons and `×` delete buttons) in Vue components lacked `aria-label` and `type="button"`, causing poor screen reader experiences and potential form submission bugs.
**Action:** Added `aria-label` for Polish localization and `type="button"` to ensure accessibility and proper functionality.
