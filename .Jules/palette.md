## $(date +%Y-%m-%d) - Pagination Accessibility Localization
**Learning:** This application's accessibility features must be localized natively in Polish. Relying on default English a11y texts creates a disconnected screen reader experience, as all other application strings use Polish.
**Action:** Always map standard UX aria-labels (like 'next', 'previous', 'page') to their precise Polish equivalents ('Następna strona', 'Poprzednia strona', 'Strona X') when adding semantic tags in localized components.
