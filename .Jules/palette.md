## 2024-06-06 - Missing ARIA labels on modal close buttons
**Learning:** Across various views (ClientsView, EmployeesView, InventoryView, etc.), modal dialogs use icon-only close buttons (`&times;`) without accessible names, making them inaccessible to screen reader users in this Polish-localized app.
**Action:** Always add `aria-label="Zamknij"` to all icon-only close buttons within modals to ensure screen readers announce the action correctly.
