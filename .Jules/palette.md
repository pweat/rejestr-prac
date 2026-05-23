## 2024-05-18 - Missing ARIA Labels on Close Buttons
**Learning:** Icon-only close buttons in modals across the application lack 'aria-label' attributes, negatively impacting screen reader accessibility in the Polish locale.
**Action:** Add `aria-label="Zamknij"` to all close buttons with the 'close-button' class.
