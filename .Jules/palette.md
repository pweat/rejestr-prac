
## 2026-07-27 - Accessible icon-only delete buttons
**Learning:** Icon-only delete buttons ("×") in the settlement tables lack screen-reader context and are announced unhelpfully (e.g., "times" or "multiply"). Without an explicit type="button", they also risk triggering unintended default browser behaviors like form submissions when placed near or inside forms.
**Action:** Consistently apply descriptive aria-label attributes (e.g., aria-label="Usuń wpis") to icon-only buttons and explicitly set type="button" to guarantee accessibility and predictable behavior.
