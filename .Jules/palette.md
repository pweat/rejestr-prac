## 2025-03-01 - Accessible Modal Close Buttons
**Learning:** Modal dialogs using generic `&times;` symbols for close buttons are unhelpful for screen reader users, especially in localized applications where the fallback announcement might not match the primary language.
**Action:** Always provide localized ARIA labels (e.g., `aria-label="Zamknij"`) on icon-only buttons to ensure clear context across all views.
