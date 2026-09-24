## 2026-09-24 - Accessible Icon-Only Buttons
**Learning:** Icon-only interactive elements (like modal close buttons `&times;` or delete buttons `×`) lack context for screen readers and can trigger accidental form submissions if missing `type="button"`.
**Action:** Always include `type="button"`, descriptive `aria-label` (e.g., "Zamknij"), and `title` attributes on icon-only buttons to ensure proper localization, accessibility, and hover tooltips.
