## 2026-05-31 - Accessibility improvements in FlowEditor
**Learning:** Found several icon-only buttons in the FlowEditor component (outline toggle, node controls like play/duplicate/delete, choice/CTA deletion) that lacked ARIA labels and titles, hindering accessibility and usability for screen reader and keyboard users.
**Action:** Always ensure that icon-only interactive elements (like buttons with only icons inside) have descriptive `aria-label` and `title` attributes that convey their purpose or state (e.g., dynamically toggling labels for Expand/Collapse states).
