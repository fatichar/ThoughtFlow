## 2026-06-05 - Added Aria Labels and Tooltips to Icon-Only Buttons
**Learning:** Found multiple icon-only buttons (Play, Duplicate, Delete) that lacked descriptive text for screen readers or standard hover tooltips. Providing these dramatically improves usability for both sighted and screen reader users without requiring design changes.
**Action:** When creating new interactive components using Lucide React icons, always pair them with `aria-label` and `title` attributes if no visible text is present.
