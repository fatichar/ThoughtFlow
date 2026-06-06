## 2024-06-06 - [Added ARIA Labels to FlowEditor Icon Buttons]
**Learning:** This app's editor components frequently use icon-only buttons (like `Trash2`, `Copy`, `ListTree`, `Play`) without `aria-label` or `title` attributes. This makes screen-reader usage difficult and hides functionality from sighted users.
**Action:** Always verify that icon-only buttons have descriptive `aria-label` and `title` attributes, especially in complex components like the FlowEditor where multiple distinct actions (deleting nodes, choices, CTAs) use similar or identical icons.
