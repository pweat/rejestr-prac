## 2026-05-24 - Missing ARIA labels on modal close buttons
**Learning:** In this Polish-localized application, modal dialog close buttons were implemented as icon-only `<button>&times;</button>` without accessible names, meaning screen reader users would not know their purpose.
**Action:** Added `aria-label="Zamknij"` (Polish for "Close") to all `.close-button` instances across all views (Clients, Vehicles, Inventory, Offers, Employees, Jobs) to ensure full accessibility for screen readers.
