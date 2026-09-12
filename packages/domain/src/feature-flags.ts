export type FeatureFlagScope = 'system' | 'organisation' | 'country' | 'project';

export interface FeatureFlagDto {
  key: string;
  name: string;
  description: string;
  category: 'core_platform' | 'ai_intelligence' | 'integrations' | 'country_packs' | 'experimental';
  enabled: boolean;
  scope: FeatureFlagScope;
  scopeValue?: string;
  isCore: boolean;
  requiresRestart: boolean;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export interface FeatureFlagAuditEntry {
  key: string;
  previousState: boolean;
  newState: boolean;
  reason: string;
  modifiedBy: string;
  modifiedAt: Date;
  environment: string;
}

export const INITIAL_FEATURE_FLAGS: FeatureFlagDto[] = [
  {
    key: 'core.project_onboarding',
    name: 'Project Onboarding & Requirements Matrix',
    description: 'Core project initialization, milestone gates, and requirements tracing.',
    category: 'core_platform',
    enabled: true,
    scope: 'system',
    isCore: true,
    requiresRestart: false,
    lastModifiedBy: 'system',
    lastModifiedAt: '2026-09-12T00:00:00Z',
  },
  {
    key: 'core.commercial_boq',
    name: 'Commercial BOQ & Variations Engine',
    description: 'Hierarchical BOQ lines, markups, client variations, and commercial closeout.',
    category: 'core_platform',
    enabled: true,
    scope: 'system',
    isCore: true,
    requiresRestart: false,
    lastModifiedBy: 'system',
    lastModifiedAt: '2026-09-12T00:00:00Z',
  },
  {
    key: 'core.procurement_flow',
    name: 'Procurement, RFQ & Purchase Orders',
    description: 'Vendor RFQs, quotes comparison, three-way PO matching, and supplier management.',
    category: 'core_platform',
    enabled: true,
    scope: 'system',
    isCore: true,
    requiresRestart: false,
    lastModifiedBy: 'system',
    lastModifiedAt: '2026-09-12T00:00:00Z',
  },
  {
    key: 'core.site_operations',
    name: 'Site Operations, HSE & Run Sheets',
    description: 'Live field operations, badge scanning, HSE stop-work, offline sync, and command center.',
    category: 'core_platform',
    enabled: true,
    scope: 'system',
    isCore: true,
    requiresRestart: false,
    lastModifiedBy: 'system',
    lastModifiedAt: '2026-09-12T00:00:00Z',
  },
  {
    key: 'core.finance_reconciliation',
    name: 'Finance Reconciliation & Billing',
    description: 'Cost accruals, progress claims, milestone billing, and ledger exports.',
    category: 'core_platform',
    enabled: true,
    scope: 'system',
    isCore: true,
    requiresRestart: false,
    lastModifiedBy: 'system',
    lastModifiedAt: '2026-09-12T00:00:00Z',
  },
  {
    key: 'ai.copilot_assistant',
    name: 'AI Delivery Copilot & Assistant',
    description: 'Autonomous context-aware project copilot with citation tracing and prompt defense.',
    category: 'ai_intelligence',
    enabled: false,
    scope: 'system',
    isCore: false,
    requiresRestart: false,
    lastModifiedBy: 'system',
    lastModifiedAt: '2026-09-12T00:00:00Z',
  },
  {
    key: 'ai.historical_estimator',
    name: 'Historical Estimating & Margin Predictor',
    description: 'Machine-learning similarity search across historical delivered project costs and margins.',
    category: 'ai_intelligence',
    enabled: false,
    scope: 'system',
    isCore: false,
    requiresRestart: false,
    lastModifiedBy: 'system',
    lastModifiedAt: '2026-09-12T00:00:00Z',
  },
  {
    key: 'ai.policy_simulator',
    name: 'Visual Workflow Builder & Policy Simulator',
    description: 'Dynamic stage graph customizer and what-if financial/governance simulation sandbox.',
    category: 'ai_intelligence',
    enabled: false,
    scope: 'system',
    isCore: false,
    requiresRestart: false,
    lastModifiedBy: 'system',
    lastModifiedAt: '2026-09-12T00:00:00Z',
  },
  {
    key: 'country_pack.qatar_compliance',
    name: 'Qatar Regulatory Pack (QCB, Labour & 0% VAT)',
    description: 'Qatar Central Bank WPS compliance, Summer Midday Work Ban, and Qatar labour laws.',
    category: 'country_packs',
    enabled: true,
    scope: 'country',
    scopeValue: 'QA',
    isCore: false,
    requiresRestart: false,
    lastModifiedBy: 'system',
    lastModifiedAt: '2026-09-12T00:00:00Z',
  },
  {
    key: 'country_pack.saudi_zatca',
    name: 'Saudi ZATCA Phase 2 & 15% VAT Pack',
    description: 'Saudi ZATCA e-invoicing cryptographic signatures, QR generation, and 15% VAT rules.',
    category: 'country_packs',
    enabled: false,
    scope: 'country',
    scopeValue: 'SA',
    isCore: false,
    requiresRestart: false,
    lastModifiedBy: 'system',
    lastModifiedAt: '2026-09-12T00:00:00Z',
  },
  {
    key: 'country_pack.uae_fta',
    name: 'UAE FTA & 5% VAT Pack',
    description: 'Federal Tax Authority compliant tax invoices, TRN validation, and MOHRE compliance.',
    category: 'country_packs',
    enabled: false,
    scope: 'country',
    scopeValue: 'AE',
    isCore: false,
    requiresRestart: false,
    lastModifiedBy: 'system',
    lastModifiedAt: '2026-09-12T00:00:00Z',
  },
  {
    key: 'integrations.sap_finance',
    name: 'SAP S/4HANA Enterprise Financial Bridge',
    description: 'Outbox-driven bi-directional sync of approved purchase orders and posted actual costs.',
    category: 'integrations',
    enabled: true,
    scope: 'system',
    isCore: false,
    requiresRestart: false,
    lastModifiedBy: 'system',
    lastModifiedAt: '2026-09-12T00:00:00Z',
  },
  {
    key: 'integrations.oracle_erp',
    name: 'Oracle NetSuite / Fusion Cloud Connector',
    description: 'Secondary enterprise ERP bridge for multi-entity international procurement.',
    category: 'integrations',
    enabled: false,
    scope: 'system',
    isCore: false,
    requiresRestart: false,
    lastModifiedBy: 'system',
    lastModifiedAt: '2026-09-12T00:00:00Z',
  },
];

export class FeatureFlagEngine {
  private flags: Map<string, FeatureFlagDto> = new Map();
  private auditLog: FeatureFlagAuditEntry[] = [];

  constructor(initialFlags: FeatureFlagDto[] = INITIAL_FEATURE_FLAGS) {
    for (const flag of initialFlags) {
      this.flags.set(flag.key, { ...flag });
    }
  }

  listFlags(scope?: FeatureFlagScope, scopeValue?: string): FeatureFlagDto[] {
    const list = Array.from(this.flags.values());
    if (!scope) return list;
    return list.filter((f) => {
      if (f.scope !== scope) return false;
      if (scopeValue && f.scopeValue && f.scopeValue !== scopeValue) return false;
      return true;
    });
  }

  getFlag(key: string): FeatureFlagDto | undefined {
    return this.flags.get(key);
  }

  isEnabled(
    key: string,
    context?: { countryCode?: string; organisationId?: string }
  ): boolean {
    const flag = this.flags.get(key);
    if (!flag) return false;
    if (!flag.enabled) return false;

    if (flag.scope === 'country' && context?.countryCode && flag.scopeValue) {
      return flag.scopeValue.toUpperCase() === context.countryCode.toUpperCase();
    }

    return true;
  }

  toggleFlag(
    key: string,
    enabled: boolean,
    reason: string,
    user: string,
    environment: 'production' | 'staging' | 'development' = 'production'
  ): { flag: FeatureFlagDto; audit: FeatureFlagAuditEntry } {
    const flag = this.flags.get(key);
    if (!flag) {
      throw new Error(`FEATURE_FLAG_NOT_FOUND: Feature flag '${key}' does not exist.`);
    }

    // Invariant: Core platform features cannot be disabled in production
    if (flag.isCore && !enabled && environment === 'production') {
      throw new Error(
        `CORE_FLAG_IMMUTABLE: Cannot disable core feature flag '${key}' in production environment.`
      );
    }

    const previousState = flag.enabled;
    flag.enabled = enabled;
    flag.lastModifiedBy = user;
    flag.lastModifiedAt = new Date().toISOString();

    const audit: FeatureFlagAuditEntry = {
      key,
      previousState,
      newState: enabled,
      reason,
      modifiedBy: user,
      modifiedAt: new Date(),
      environment,
    };

    this.auditLog.push(audit);
    return { flag, audit };
  }

  getAuditLog(key?: string): FeatureFlagAuditEntry[] {
    if (key) {
      return this.auditLog.filter((a) => a.key === key);
    }
    return [...this.auditLog];
  }
}
