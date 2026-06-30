## 2026-06-30 - Accessibility for icon-only buttons
**Learning:** Found multiple instances of icon-only delete (`×`) and close (`&times;`) buttons lacking `type="button"` and `aria-label` attributes across Vue components.
**Action:** Added `type="button"` and `aria-label` (e.g., "Zamknij" or "Usuń wpis") to `.close-button` and `.btn-del` instances to prevent accidental form submissions and ensure screen reader accessibility.
