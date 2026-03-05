## 2024-03-05 - Missing ARIA expanded state on mobile hamburger menu
**Learning:** Hamburger menus are common in responsive PWAs like this one, but without `aria-expanded`, screen readers don't know if the menu is open or closed, leading to a confusing navigation experience.
**Action:** Always ensure that interactive elements that toggle visibility of other content include an accurate `aria-expanded` state tied to the component's reactivity system.
