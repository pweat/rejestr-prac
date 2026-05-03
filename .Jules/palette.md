## 2026-05-03 - Missing ARIA Labels on Close Buttons
**Learning:** Icon-only close buttons (like `&times;`) in Vue modal dialogs lack descriptive names, causing screen readers to announce "button" without context, severely hindering accessibility for visually impaired users.
**Action:** Added `aria-label="Zamknij"` to all instances of `<button class="close-button">` across the app to ensure proper Polish localization and accessibility context.
