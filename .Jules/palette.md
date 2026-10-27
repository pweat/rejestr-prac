## 2024-05-18 - Improve icon-only buttons
**Learning:** Icon-only buttons (like `&times;` and `×`) missing `aria-label` and `type="button"` are common in this app. The expected language for `aria-label` and `title` is Polish.
**Action:** Always add `type="button"`, `aria-label="Zamknij"`, and `title="Zamknij"` (or equivalent like "Usuń wpis") to icon-only interactive elements like close and delete buttons.
