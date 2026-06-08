## 2026-06-08 - Icon-Only Close Buttons Need Polish ARIA Labels
**Learning:** Icon-only close buttons (`&times;`) in modal dialogs require localized ARIA labels (`aria-label="Zamknij"`) for screen reader accessibility in a Polish locale application.
**Action:** Always add `aria-label="Zamknij"` to `<button class="close-button">&times;</button>` elements to ensure semantic meaning is conveyed to screen readers.
