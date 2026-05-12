## 2026-05-12 - Missing ARIA Labels on Icon-only Close Buttons
**Learning:** Modal close buttons containing only the HTML entity '&times;' are entirely opaque to screen readers in Polish localization, resulting in "przycisk" (button) being announced without context.
**Action:** Always add 'aria-label="Zamknij"' to icon-only close buttons to ensure proper Polish accessibility.
