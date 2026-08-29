## 2026-07-29 - Accessible Icon-only Buttons
**Learning:** Icon-only interactive elements (like `&times;` close buttons or `×` delete buttons) missing semantic labels cause significant accessibility barriers in this app. Furthermore, without `type="button"`, they risk triggering unintended form submissions.
**Action:** Always ensure icon-only buttons include descriptive `aria-label` attributes (localized, e.g., "Zamknij", "Usuń wpis") and explicit `type="button"` to prevent form submission bugs and guarantee screen reader compatibility.
