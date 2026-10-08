## 2024-05-14 - Pagination and Modal Accessibility
**Learning:** Found several components lacking ARIA attributes for pagination and close buttons (`PaginationControls.vue`, `HistoryPanel.vue`, `CategoryManager.vue`, `AddItemModal.vue`). Icon-only buttons lacking `aria-label` and `type="button"` are common here.
**Action:** Add proper `aria-label` and `type="button"` to close buttons and pagination controls. For pagination, we'll wrap it in a `<nav>` with `aria-label="Pagination"`.
