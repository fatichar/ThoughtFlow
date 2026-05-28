## 2024-05-28 - ARIA Labels for Icon-Only Buttons
**Learning:** Found an accessibility issue pattern specific to `FlowEditor.tsx` where icon-only buttons lacked accessible names, making them inaccessible to screen readers and lacking tooltips for mouse users.
**Action:** Added `aria-label` and `title` to these buttons. Next time, proactively check for `icon-button` classes and ensure they have accompanying labels.
