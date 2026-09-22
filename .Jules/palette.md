## 2026-09-22 - Missing ARIA labels on icon-only buttons
**Learning:** Many modals and list actions use icon-only elements (`&times;`, `×`) without proper accessibility semantics. The default codebase language is Polish. Interactive close/delete elements also lack `type="button"`, causing potential form submission side-effects if nested.
**Action:** Consistently add `type="button"`, `aria-label`, and `title` attributes with Polish localization (e.g., "Zamknij", "Usuń wpis") to icon-only interactive UI elements.
