## 2026-06-04 - Missing ARIA Labels on Modal Close Buttons
**Learning:** The application uses icon-only (`&times;`) close buttons across all modal components. Without `aria-label="Zamknij"`, screen readers do not provide meaningful context to visually impaired users, reducing the accessibility of critical overlays like forms and dialogs.
**Action:** Add `aria-label="Zamknij"` to all `<button class="close-button">` instances across all view components to ensure proper localization and screen reader accessibility.
