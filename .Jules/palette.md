## 2026-04-30 - Icon-only Close Buttons Missing ARIA Labels
**Learning:** Modal dialogs across the application use an icon-only button (`&times;`) for closing, but lack accessible names, making them unannounced or confusing for screen reader users, particularly in a Polish localized app where 'Close' should be 'Zamknij'.
**Action:** Always include `aria-label="Zamknij"` on `<button class="close-button">` elements that only contain visual symbols like `&times;`.
