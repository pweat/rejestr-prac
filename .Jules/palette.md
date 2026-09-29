## 2024-05-18 - Added ARIA attributes and type="button" to icon-only buttons
**Learning:** Found multiple icon-only buttons (close modals, delete entries) across Vue components missing `aria-label`, `title`, and `type="button"`. This causes screen readers to read out raw characters like "times" and "multiply" without context, and can lead to accidental form submissions inside forms.
**Action:** Always add `type="button"`, `aria-label`, and `title` to all icon-only buttons across components to ensure full accessibility and prevent unintended form submissions.
