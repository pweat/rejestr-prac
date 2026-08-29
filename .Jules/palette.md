## 2026-07-14 - Accessible Icon-Only Buttons
**Learning:** Found multiple instances of icon-only buttons (`&times;` and `×`) across Vue components that lacked accessibility labels or `type="button"` attributes. In Polish localization, screen readers require specific labels like 'Zamknij' or 'Usuń wpis' for these common interactions.
**Action:** Always add `type="button"` to prevent accidental form submission and include descriptive `aria-label`s on any icon-only interactive elements in our Vue templates.
