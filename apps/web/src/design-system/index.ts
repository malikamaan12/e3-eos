/**
 * E3-EOS Unified Design System
 * Master Export conforming to E3-EOS Global UI Component Rules (specs/12_GLOBAL_UI_COMPONENT_RULES.md).
 */

// Layer 1: Foundations & Motion
export * from './foundations/tokens.js';
export * from './foundations/typography.js';
export * from './foundations/motion.js';

// Layer 2: Primitives & Standardized Eos Primitives
export * from './primitives/Button.js';
export * from './primitives/Badge.js';
export * from './primitives/Input.js';
export * from './primitives/Select.js';
export * from './primitives/Skeleton.js';
export * from './primitives/Switch.js';
export * from './primitives/EosButton.js';
export * from './primitives/EosStatusBadge.js';
export * from './primitives/EosFormField.js';

// Layer 3: Composites & Standardized Eos Composites
export * from './composites/KPICard.js';
export * from './composites/DataTable.js';
export * from './composites/Overlay.js';
export * from './composites/EmptyState.js';
export * from './composites/EosTabs.js';
export * from './composites/EosDialog.js';
export * from './composites/EosDrawer.js';
export * from './composites/EosToast.js';

// Canonical Eos Naming Aliases (Section 26 & Section 31)
export { DataTable as EosDataTable } from './composites/DataTable.js';
export { EmptyState as EosEmptyState } from './composites/EmptyState.js';
export { Skeleton as EosSkeleton } from './primitives/Skeleton.js';
export { Select as EosSelect } from './primitives/Select.js';

// Layer 3b: Governance & Invariants
export * from './governance/LinkageBar.js';
export * from './governance/ControlledRecordHeader.js';
export * from './governance/StageTracker.js';
export * from './governance/ApprovalCard.js';
export * from './governance/AISuggestionCard.js';

export { StageTracker as EosLifecycleTracker } from './governance/StageTracker.js';
export { ApprovalCard as EosApprovalPanel } from './governance/ApprovalCard.js';

// Layer 4: Shells & Templates
export * from './shells/InternalShell.js';
export * from './shells/ClientPortalShell.js';
export * from './shells/FieldShell.js';
export * from './templates/DashboardTemplate.js';
export * from './templates/ListRegisterTemplate.js';
export * from './templates/ProjectWorkspaceTemplate.js';
