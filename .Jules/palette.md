## 2026-06-15 - Adding ARIA labels to icon-only buttons
**Learning:** Modal close buttons and table delete buttons currently rely solely on visual symbols (like `&times;` or `×`), making them inaccessible to screen readers in a Polish-localized app.
**Action:** Ensure all icon-only interactive elements receive descriptive `aria-label` attributes (e.g., `aria-label="Zamknij"`, `aria-label="Usuń wpis"`) for proper accessibility.
