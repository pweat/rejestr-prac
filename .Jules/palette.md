## 2026-07-26 - Semantic Pagination Accessibility
**Learning:** Pagination controls built with standard HTML elements lack context for screen readers in this app's components, making it difficult for users to distinguish page numbers from generic buttons or understand their current location.
**Action:** Always wrap pagination in a nav element with aria-label="Nawigacja po stronach" and provide explicit aria-labels for prev/next/page buttons, conditionally setting aria-current="page" on the active item.
