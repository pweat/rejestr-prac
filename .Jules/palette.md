## 2026-05-20 - Modal close button accessibility
**Learning:** Icon-only close buttons (like `&times;` in modals) lack context for screen reader users and prevent equal access to UI navigation.
**Action:** Always add `aria-label="Zamknij"` (for Polish localization) to `<button class="close-button">` elements across views to ensure they are properly announced by screen readers.
