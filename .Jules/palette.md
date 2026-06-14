## 2024-06-14 - Add ARIA Labels to Icon-Only Buttons
**Learning:** Modal close buttons (`&times;`) and delete buttons (`×`) lack accessible names, preventing screen reader users from understanding their purpose. Relying on visual context alone creates significant accessibility barriers.
**Action:** Ensure all icon-only interactive elements receive descriptive `aria-label` attributes (e.g., `aria-label="Zamknij"`, `aria-label="Usuń wpis"`) to provide clear, accessible names.
