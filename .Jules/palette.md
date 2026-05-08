## 2026-05-08 - Localized ARIA labels for icon-only buttons
**Learning:** Screen readers cannot infer the meaning of a literal `&times;` (multiplication sign) used as a close icon. We must provide explicit localization.
**Action:** Always add descriptive `aria-label="Zamknij"` (Polish for "Close") to icon-only close buttons in modals across the application.
