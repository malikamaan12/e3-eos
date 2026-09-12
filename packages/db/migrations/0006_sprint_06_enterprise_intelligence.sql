-- ==============================================================================
-- E3-EOS Sprint 06 — Enterprise Intelligence, Historical Estimating, Workflow Builder, Country Packs & Enterprise Scale
-- ==============================================================================

-- 1. Workflow Definitions Table
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  workflow_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  stages_json JSONB NOT NULL,
  gates_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Policy Simulation Runs Table
CREATE TABLE IF NOT EXISTS policy_simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  policy_name TEXT NOT NULL,
  proposed_thresholds_json JSONB NOT NULL,
  simulation_metrics_json JSONB NOT NULL,
  sample_projects_evaluated INTEGER NOT NULL DEFAULT 0,
  recommended_disposition TEXT NOT NULL,
  run_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Historical Project Benchmarks Table
CREATE TABLE IF NOT EXISTS historical_project_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_type TEXT NOT NULL,
  venue_type TEXT NOT NULL,
  scale_capacity INTEGER NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 1,
  currency TEXT NOT NULL DEFAULT 'QAR',
  total_direct_cost NUMERIC NOT NULL,
  cost_per_capacity NUMERIC NOT NULL,
  category_spend_breakdown_json JSONB NOT NULL,
  margin_variance_percent NUMERIC NOT NULL,
  sample_count INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Country Pack Configurations Table
CREATE TABLE IF NOT EXISTS country_pack_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  country_code TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  primary_currency TEXT NOT NULL DEFAULT 'QAR',
  vat_rate_percent NUMERIC NOT NULL DEFAULT 0,
  labour_max_daily_hours INTEGER NOT NULL DEFAULT 10,
  summer_outdoor_work_restriction_json JSONB NOT NULL,
  zatca_compliance_enabled BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_org ON workflow_definitions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_code ON workflow_definitions(workflow_code);
CREATE INDEX IF NOT EXISTS idx_policy_simulation_runs_org ON policy_simulation_runs(organisation_id);
CREATE INDEX IF NOT EXISTS idx_hist_benchmarks_org_type ON historical_project_benchmarks(organisation_id, project_type);
CREATE INDEX IF NOT EXISTS idx_country_pack_configs_org ON country_pack_configurations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_country_pack_configs_code ON country_pack_configurations(country_code);

-- ==============================================================================
-- Enable Row Level Security (RLS)
-- ==============================================================================
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_project_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_pack_configurations ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- Tenant Isolation Policies
-- ==============================================================================
CREATE POLICY tenant_isolation_workflow_definitions ON workflow_definitions USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_policy_simulation_runs ON policy_simulation_runs USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_historical_project_benchmarks ON historical_project_benchmarks USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_country_pack_configurations ON country_pack_configurations USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
