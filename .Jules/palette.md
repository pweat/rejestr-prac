## 2026-05-28 - ARIA labels for icon-only modal close buttons
**Learning:** Modal dialogs in this app rely heavily on icon-only close buttons (using HTML entities like &times;), which are completely invisible to screen readers without proper aria attributes, severely degrading accessibility for visually impaired users.
**Action:** Always add aria-label="Zamknij" to these buttons so screen readers can announce the "Zamknij" (Close) action accurately in Polish.
