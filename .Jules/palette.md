## 2024-05-29 - Missing ARIA Labels on Close Buttons
**Learning:** Found multiple instances of icon-only close buttons (`&times;`) in modals across various views (ClientsView, EmployeesView, InventoryView, etc.) missing aria-labels, which makes them inaccessible to screen reader users in the Polish localization.
**Action:** Always add `aria-label="Zamknij"` to icon-only close buttons in modals to ensure accessibility.
