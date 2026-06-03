## 2024-05-18 - Missing ARIA Labels on Icon-Only Buttons in Editor
**Learning:** Found a pattern in `FlowEditor.tsx` where `.icon-button` classes were extensively used without any accessible labels or title attributes (e.g., play, duplicate, delete actions). This makes the editor highly inaccessible to screen-reader users and reduces usability for mouse users relying on tooltips.
**Action:** Always ensure that icon-only interactive elements receive `aria-label` and `title` attributes. Establish this as a baseline accessibility requirement for any new components or UI patterns introduced.
