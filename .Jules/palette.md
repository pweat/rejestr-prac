## 2026-06-07 - Polish Localization for Icon-Only Buttons
**Learning:** Icon-only buttons (like `&times;` for closing modals) lack accessible names for screen readers, breaking keyboard and auditory navigation. In a Polish locale, English defaults or no labels are confusing.
**Action:** Always add explicit `aria-label="Zamknij"` to `&times;` close buttons to ensure proper accessibility and localization.
