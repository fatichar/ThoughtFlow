## 2026-05-30 - Add ARIA labels to icon-only buttons
**Learning:** Found multiple icon-only buttons in the FlowEditor component that lacked both `aria-label` and `title` properties, making them inaccessible to screen readers and lacking helpful context for mouse users.
**Action:** Always verify that icon-only buttons have descriptive `title` and `aria-label` properties, especially in complex interactive components like editors.
