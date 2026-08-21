## 2026-08-21 - Adding ARIA labels and type to icon-only buttons
**Learning:** Modal close buttons (`.close-button`) and delete buttons (`.btn-del`) containing only symbols (&times;, ×) lack `aria-label` attributes and `type="button"`. This causes screen readers to misinterpret them and potentially triggers unwanted form submissions.
**Action:** Always add `type="button"`, `aria-label="Zamknij"` (or specific label), and `title` to icon-only interactive elements in Vue components to ensure accessibility and proper localization.
