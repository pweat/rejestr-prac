## 2026-09-30 - Close Buttons Accessibility
**Learning:** Icon-only close buttons (using `&times;`) across multiple modals lacked explicit `type="button"`, ARIA labels, and titles, reducing accessibility for screen readers and preventing hover tooltips.
**Action:** Ensure all icon-only buttons include `type="button"`, `aria-label`, and `title` attributes (using Polish localization like "Zamknij") in future components.
