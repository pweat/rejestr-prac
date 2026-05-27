## 2026-05-27 - Add ARIA Labels to Modal Close Buttons
**Learning:** Icon-only close buttons in modals lack accessible names (e.g., `&times;` symbols without `aria-label`). This is a common accessibility issue across various views (ClientsView, EmployeesView, InventoryView, etc.) where screen readers would only announce "times" or "x", instead of "Zamknij" (Close).
**Action:** Add `aria-label="Zamknij"` to all instances of `<button class="close-button">` in the Vue component files.
