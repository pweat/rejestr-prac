## 2024-04-27 - Added ARIA Labels to Close Buttons
**Learning:** Found multiple instances of `<button class="close-button">&times;</button>` without `aria-label` across modal dialogs in various views. This pattern is common in the codebase, leading to poor accessibility for screen reader users who only hear "times" or "multiplication sign" instead of "Zamknij" (Close).
**Action:** Always add `aria-label="Zamknij"` to icon-only close buttons in modals across the application to ensure Polish localization and proper screen reader context.
