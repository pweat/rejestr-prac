## 2026-06-05 - Accessibility of Icon-Only Close Buttons in Polish Locales
**Learning:** Modal close buttons that rely solely on the HTML entity `&times;` are often read unhelpfully or ignored by screen readers, particularly in localized contexts where an English default label might confuse users expecting Polish.
**Action:** Always ensure that icon-only buttons include an explicitly localized `aria-label` (e.g., `aria-label="Zamknij"` for Polish) to provide equivalent semantic meaning to assistive technologies.
