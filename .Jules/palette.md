## 2024-05-14 - Icon-only buttons accessibility
**Learning:** Icon-only interactive elements like close buttons (`&times;`) and delete buttons (`×`) often miss semantic attributes, which hurts accessibility. Since this application relies on Polish localization, `aria-label`s must be in Polish. Additionally, placing these inside forms without `type="button"` can trigger unintended submissions.
**Action:** When finding icon-only buttons, add `type="button"` and `aria-label="[Polish description]"` (e.g., `aria-label="Zamknij"` or `aria-label="Usuń wpis"`).
