## 2026-05-31 - Accessibility for Icon-only Modal Close Buttons
**Learning:** Modal dialogs across the application use a standard `<button class="close-button">&times;</button>` pattern without accessible names, causing screen readers in this Polish-localized app to read generic or unhelpful text instead of the button's purpose.
**Action:** Consistently add `aria-label="Zamknij"` to all icon-only close buttons in modal components to ensure proper accessibility and localization.
