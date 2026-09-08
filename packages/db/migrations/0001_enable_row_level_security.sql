-- ==============================================================================
-- E3-EOS v1.0.0 — PostgreSQL 17 Production Row Level Security (RLS) Migration
-- ==============================================================================
-- Standard: specs/03_DATA_MODEL_AND_INVARIANTS.md §2 (Tenant Isolation Invariants)
-- Acceptance ID: AT-001, AT-007, AT-091
-- ==============================================================================

-- 1. Enable RLS across all multi-tenant domain tables
ALTER TABLE IF EXISTS organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stage_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stage_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS field_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS incident_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_events ENABLE ROW LEVEL SECURITY;

-- 2. Force RLS for table owners (prevents bypass by db owner role)
ALTER TABLE IF EXISTS organisations FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stage_instances FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stage_activities FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS boq_items FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS change_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchase_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory_resources FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservations FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS field_inspections FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS incident_records FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_events FORCE ROW LEVEL SECURITY;

-- 3. Create Restrictive Tenant Isolation Policies
-- Invariant: Sessions MUST set 'app.current_org_id' via TenantIsolation.setTenantContext()
-- Queries executed without context or under foreign tenant UUID evaluate to zero rows.

DROP POLICY IF EXISTS tenant_isolation_projects ON projects;
CREATE POLICY tenant_isolation_projects ON projects
    AS RESTRICTIVE
    FOR ALL
    USING (organisation_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation_stage_instances ON stage_instances;
CREATE POLICY tenant_isolation_stage_instances ON stage_instances
    AS RESTRICTIVE
    FOR ALL
    USING (organisation_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation_stage_activities ON stage_activities;
CREATE POLICY tenant_isolation_stage_activities ON stage_activities
    AS RESTRICTIVE
    FOR ALL
    USING (organisation_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation_boq_items ON boq_items;
CREATE POLICY tenant_isolation_boq_items ON boq_items
    AS RESTRICTIVE
    FOR ALL
    USING (organisation_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation_purchase_orders ON purchase_orders;
CREATE POLICY tenant_isolation_purchase_orders ON purchase_orders
    AS RESTRICTIVE
    FOR ALL
    USING (organisation_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation_audit_events ON audit_events;
CREATE POLICY tenant_isolation_audit_events ON audit_events
    AS RESTRICTIVE
    FOR ALL
    USING (organisation_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation_inventory ON inventory_resources;
CREATE POLICY tenant_isolation_inventory ON inventory_resources
    AS RESTRICTIVE
    FOR ALL
    USING (organisation_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);
