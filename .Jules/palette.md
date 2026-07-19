## 2026-07-19 - Missing ARIA Labels on Icon-only Buttons
**Learning:** Modal close buttons and delete buttons in lists often rely solely on visual cues (`&times;` or `×`) without readable names for screen readers. They also lack explicit `type="button"` resulting in potential accidental form submissions when embedded in forms.
**Action:** Added `aria-label` and `type="button"` systematically to `.close-button` and `.btn-del` classes across Vue views. Ensure future interactive icon-only elements contain these accessibility properties from the start.
