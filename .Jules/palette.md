## 2026-05-06 - Polish Localization for Icon-Only Close Buttons
**Learning:** In Polish-localized applications, generic icon-only close buttons (like `&times;`) lack necessary context for screen readers. Default English `aria-label="Close"` or no label creates a disjointed experience for non-visual Polish users.
**Action:** Consistently apply `aria-label="Zamknij"` to all such buttons (e.g., `<button aria-label="Zamknij" class="close-button">&times;</button>`) across all modal dialogs.
