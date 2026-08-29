## 2023-07-24 - Accessibility for icon-only buttons
**Learning:** Found multiple instances of close (`&times;`) and delete (`×`) buttons without `aria-label` or `type="button"`, which is an accessibility issue for screen readers in Polish locale. Adding correct `type="button"` also prevents accidental form submissions inside modal dialogues.
**Action:** Always add `type="button"` and `aria-label` (e.g. `Zamknij`, `Usuń wpis`) to icon-only buttons like modal close buttons or delete buttons.
