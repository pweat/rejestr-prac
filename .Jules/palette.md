
## 2026-05-22 - Polish Localization for Icon-only Close Buttons
**Learning:** Modal dialogs in this application consistently use icon-only close buttons (`&times;`), which require localized screen reader support (Polish) to meet accessibility standards.
**Action:** Added `aria-label="Zamknij"` to all `.close-button` elements in views to ensure screen readers accurately announce the close action in Polish.
