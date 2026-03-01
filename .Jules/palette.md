# Palette's UX Journal

## 2024-05-24 - Added aria-label to modal close buttons
**Learning:** Icon-only modal close buttons (`&times;`) across all Vue views systematically lacked ARIA labels. This causes screen readers to read out meaningless text like "times" or "X" instead of announcing the button's action.
**Action:** When creating or reviewing modals or icon-only buttons in this Vue ecosystem, always ensure an `aria-label` (like "Zamknij" in Polish) is provided for accessibility.