
## 2026-07-28 - Add ARIA Labels and Type attributes to Icon-only Buttons
**Learning:** Icon-only interactive elements (like modal close `&times;` and delete `×` buttons) without `type="button"` can cause accidental form submissions in Vue applications, and missing `aria-label`s hurt accessibility and Polish localization.
**Action:** Always ensure `.close-button` and `.btn-del` classes include `type="button"` and clear `aria-label="Zamknij"` / `aria-label="Usuń wpis"` attributes.
