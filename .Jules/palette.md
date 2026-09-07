## 2026-09-07 - Vue Modal Components Lack Accessible Icon Buttons
**Learning:** A persistent pattern exists in this application's Vue views where modal close (`&times;`) and delete (`×`) buttons are icon-only and lack `type="button"`, `aria-label`, and `title` attributes, causing accessibility barriers for screen readers and potential form submission bugs.
**Action:** Always verify that newly created icon-only buttons in Vue components include proper ARIA labels, descriptive titles in Polish, and explicit button types.
