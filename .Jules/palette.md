## 2026-06-13 - Add ARIA Labels to Modal Close Buttons
**Learning:** Many modals in this application use an icon-only close button (`&times;`) without accessible text, making them unreadable by screen readers.
**Action:** Added `aria-label="Zamknij"` (Polish for "Close") to these icon-only buttons across all Vue views to improve accessibility.
