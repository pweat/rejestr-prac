## 2026-07-20 - Accessible Icon Buttons in Modals
**Learning:** Icon-only interactive elements (like `&times;` and `×`) used for closing modals or deleting items lack semantic meaning for screen readers in Polish, and without `type="button"`, they can trigger accidental form submissions.
**Action:** Ensure all `.close-button` and `.btn-del` elements explicitly declare `type="button"` and include a descriptive `aria-label` (e.g., `aria-label="Zamknij"` and `aria-label="Usuń wpis"`).
