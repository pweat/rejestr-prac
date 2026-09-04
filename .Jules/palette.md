## $(date +%Y-%m-%d) - Modal Close Button Accessibility
**Learning:** Icon-only close buttons (`&times;`) across all modal components lacked proper ARIA attributes, tooltips, and explicit `type="button"`, causing potential accessibility issues for screen reader users and missing visual hover context for sighted users.
**Action:** When creating or maintaining modal dialogs in this Vue application, ensure the `.close-button` class is accompanied by `type="button"`, `aria-label="Zamknij"`, and `title="Zamknij"` to align with the application's Polish localization and accessibility standards.
