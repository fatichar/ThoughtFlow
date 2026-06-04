## 2024-06-04 - Missing ARIA Labels on Icon-Only Buttons
**Learning:** Found several icon-only buttons in the FlowEditor component (Play, Copy, Trash, ListTree) that lacked ARIA labels and titles, making them inaccessible to screen readers.
**Action:** Added `title` and `aria-label` attributes to these buttons. Also added `aria-expanded` to the toggle button and disabled state to the start node delete button.
