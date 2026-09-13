/**
 * E3-EOS Unified Design System
 * Master Export conforming to the E3-EOS UI System and Framer Component Plan.
 */

// Layer 1: Foundations
export * from './foundations/tokens.js';
export * from './foundations/typography.js';

// Layer 2: Primitives
export * from './primitives/Button.js';
export * from './primitives/Badge.js';
export * from './primitives/Input.js';
export * from './primitives/Select.js';
export * from './primitives/Skeleton.js';
export * from './primitives/Switch.js';

// Layer 3: Composites & Data Display
export * from './composites/KPICard.js';
export * from './composites/DataTable.js';
export * from './composites/Overlay.js';
export * from './composites/EmptyState.js';

// Layer 3b: Governance & Invariants
export * from './governance/LinkageBar.js';
export * from './governance/ControlledRecordHeader.js';
export * from './governance/StageTracker.js';
export * from './governance/ApprovalCard.js';
export * from './governance/AISuggestionCard.js';

// Layer 4: Shells & Templates
export * from './shells/InternalShell.js';
export * from './shells/ClientPortalShell.js';
export * from './shells/FieldShell.js';
export * from './templates/DashboardTemplate.js';
export * from './templates/ListRegisterTemplate.js';
export * from './templates/ProjectWorkspaceTemplate.js';
