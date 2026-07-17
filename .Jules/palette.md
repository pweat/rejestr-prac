## 2026-07-17 - Accessible Icon-Only Buttons
**Learning:** Modal close buttons (`&times;`) and delete buttons (`×`) lack `aria-label`s and `type="button"`, causing accidental form submissions and poor screen reader support in Vue templates.
**Action:** Added semantic `type="button"` and Polish `aria-label` ("Zamknij", "Usuń wpis") attributes to icon-only buttons across all views.
