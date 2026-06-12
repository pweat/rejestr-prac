## 2024-06-12 - Accessible Icon-only Modal Close Buttons
**Learning:** Icon-only close buttons (using HTML entities like `&times;`) without `aria-label` are interpreted by screen readers as visual symbols (e.g., "times"), confusing users who rely on assistive technologies.
**Action:** Always ensure icon-only buttons include a localized `aria-label` attribute (e.g., `aria-label="Zamknij"`) to provide clear, actionable context for screen reader users.
