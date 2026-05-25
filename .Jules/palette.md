## 2026-05-25 - Added ARIA labels to icon-only modal close buttons
**Learning:** In this application, many modals across different views use an icon-only `&times;` close button (`<button class="close-button">`). Without an `aria-label`, these are inaccessible to screen readers, especially since the app requires Polish localization.
**Action:** Added `aria-label="Zamknij"` to all instances of `class="close-button"` in Vue views to ensure consistent accessibility across all modal dialogs.
