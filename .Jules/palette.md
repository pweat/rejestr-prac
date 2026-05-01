## 2026-05-01 - Missing ARIA labels on modal close buttons
**Learning:** Modal dialogs often use a generic `&times;` icon for close buttons. Without proper ARIA labels, screen readers may announce this obscurely or not at all, which breaks accessibility for visually impaired users.
**Action:** Always add `aria-label="Zamknij"` to all `.close-button` instances in `.vue` files that contain only an icon or an HTML entity like `&times;`.
