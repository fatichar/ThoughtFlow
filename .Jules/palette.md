## 2024-06-11 - Missing Accessibility Labels on Icon-Only Buttons
**Learning:** Found a common pattern in the design system where icon-only buttons (such as in `FlowEditor.tsx` for play, duplicate, delete, etc.) were missing crucial `aria-label` and `title` attributes. This made them opaque to screen readers and lacked helpful tooltips for mouse users.
**Action:** When implementing new icon buttons using the `.icon-button` or `.editor-small-button` classes, always ensure `title` and `aria-label` props are provided.
