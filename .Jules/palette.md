## 2024-05-24 - Accessibility pattern: icon-only close buttons
**Learning:** In the Zentroo app's Vue components, many modal dialogs use an icon-only close button (`&times;`) that lacks an `aria-label`. This makes it difficult for screen reader users to identify the purpose of the button.
**Action:** Always add `aria-label="Zamknij"` (Polish for "Close") to icon-only close buttons in Vue components.
