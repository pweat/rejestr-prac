## 2026-09-09 - Accessibility for Icon-only Buttons
**Learning:** Icon-only interactive elements like close buttons (`.close-button` with `&times;`) and delete buttons (`.btn-del` with `×`) lack semantic accessibility and default type attributes in this app.
**Action:** Always add `type="button"`, `aria-label`, and `title` to such buttons to ensure proper functionality, screen reader support, and hover tooltips.
