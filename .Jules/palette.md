## 2026-08-23 - Adding accessibility to close buttons
**Learning:** Close buttons (.close-button) with only a visual &times; lack semantic meaning for screen readers and can trigger form submissions without type="button".
**Action:** Always add type="button", aria-label="Zamknij", and title="Zamknij" to icon-only close buttons.
