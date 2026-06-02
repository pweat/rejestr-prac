## 2026-06-02 - Add aria-label to modal close buttons
**Learning:** Icon-only close buttons (`&times;`) in modal dialogs across various views lack `aria-label` attributes, making them inaccessible to screen readers.
**Action:** Added `aria-label="Zamknij"` to all `.close-button` elements in Vue components to ensure proper Polish localization and accessibility for screen readers.
