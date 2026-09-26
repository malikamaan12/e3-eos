# EOS global UI and interaction contract

Use the existing shared component system across Portfolio, Project Cockpit, My Work, Design, Requirements, Documents, Finance, Client Portal, Administration and Field Operations. The definitive detailed component rulebook is `../references/E3_EOS_GLOBAL_UI_COMPONENT_RULES.md`.

The executive dark theme uses canvas `#090D16` and bronze/gold accents `#D97706`, `#B45309`, `#F59E0B`, with corresponding semantic light and system themes. Feature modules consume tokens rather than hard-coded local styling. Shared tabs, tables, filters, cards, forms, drawers, dialogs, status badges, timelines, date/time controls, file viewers and approval actions behave consistently.

Every view supports English/Arabic and actual RTL mirroring. Responsive layouts preserve actions and context at 390px mobile width; bounded tables may scroll internally while the page itself does not. Minimum interactive target is 44 × 44px, with larger field controls. Keyboard focus, screen-reader labels, contrast, reduced motion, empty/loading/error/permission states and unsaved-change recovery are part of each component's definition.

Motion clarifies transition and status. It never delays an action, shifts the layout after data arrives or substitutes for a server-confirmed result. Backend authorization and workflow policy govern visible and executable actions; hiding a button is insufficient. Client projections must exclude confidential internal financial, procurement and approval data.

When repairing an existing screen, inspect its actual source, reuse and fix the common component, and verify the linked workflow, persistence and permission checks. A polished screenshot alone does not establish an operational UI.
