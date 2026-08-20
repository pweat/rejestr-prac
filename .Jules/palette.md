## 2026-08-20 - Accessible Pagination Component
**Learning:** Standard pagination controls often rely entirely on visual cues (active colors, chevrons) and lack semantic wrappers, making screen reader navigation difficult.
**Action:** Use `<nav aria-label="Nawigacja po stronach">` as a wrapper, provide explicit `aria-label`s for previous/next/page buttons, and apply `aria-current="page"` to the active item to clarify component intent and state.
