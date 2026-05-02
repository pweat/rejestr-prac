## 2026-05-02 - Missing ARIA Labels on Modal Close Buttons
**Learning:** Icon-only buttons like `&times;` for closing modals lack accessible names, making them unreadable or confusing for screen reader users in the Polish localization.
**Action:** Always add explicit, translated ARIA labels (e.g., `aria-label="Zamknij"`) to all icon-only interactive elements in modals.
