## 2026-06-09 - Missing ARIA Labels on Modal Close Buttons
**Learning:** Modal close buttons that rely solely on HTML entities (like `&times;`) without `aria-label` attributes are completely inaccessible to screen reader users, who will just hear "button" or the entity name instead of the action's purpose.
**Action:** Always add descriptive `aria-label`s (localized, e.g., `aria-label="Zamknij"`) to icon-only interactive elements to ensure accessibility for all users.
