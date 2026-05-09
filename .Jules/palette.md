## 2026-05-09 - Accessible Modal Close Buttons
**Learning:** In a Polish localized application, icon-only modal close buttons (like `&times;`) must have an explicit Polish ARIA label to ensure proper screen reader support. Using `aria-label="Zamknij"` is the correct semantic approach for this design system.
**Action:** Add `aria-label="Zamknij"` to all `<button class="close-button">&times;</button>` instances across all Vue components.
