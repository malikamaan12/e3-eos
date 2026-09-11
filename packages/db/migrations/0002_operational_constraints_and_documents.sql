-- ==============================================================================
-- E3-EOS v1.0.0 — Operational Constraints & Controlled Documents RLS Migration
-- ==============================================================================

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS operational_constraints (
  id TEXT PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  constraint_type TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_organisation TEXT,
  location_zone TEXT NOT NULL,
  effective_from TIMESTAMP WITH TIME ZONE,
  effective_to TIMESTAMP WITH TIME ZONE,
  time_window TEXT NOT NULL,
  limit_value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  applicability BOOLEAN NOT NULL DEFAULT TRUE,
  priority TEXT NOT NULL DEFAULT 'medium',
  override_authority TEXT,
  verification_status TEXT NOT NULL DEFAULT 'Draft',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS constraint_source_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  constraint_id TEXT NOT NULL REFERENCES operational_constraints(id) ON DELETE CASCADE,
  controlled_document_id TEXT NOT NULL,
  document_revision_id TEXT NOT NULL,
  calculated_sha256 TEXT NOT NULL,
  page_clause_section TEXT,
  linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  linked_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS constraint_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  constraint_id TEXT NOT NULL REFERENCES operational_constraints(id) ON DELETE CASCADE,
  verifier_user_id UUID NOT NULL REFERENCES users(id),
  verifier_role TEXT NOT NULL,
  extracted_rule_value TEXT NOT NULL,
  applicability_statement TEXT NOT NULL,
  reviewer_comment TEXT,
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  audit_event_id TEXT NOT NULL,
  source_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS controlled_documents (
  id TEXT PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  project_code TEXT NOT NULL,
  document_number TEXT NOT NULL,
  title TEXT NOT NULL,
  discipline TEXT NOT NULL,
  document_type TEXT NOT NULL,
  confidentiality_level TEXT NOT NULL,
  current_revision_code TEXT NOT NULL,
  revisions_count INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS controlled_document_revisions (
  id TEXT PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  document_id TEXT NOT NULL REFERENCES controlled_documents(id) ON DELETE CASCADE,
  revision TEXT NOT NULL,
  storage_object_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  calculated_sha256 TEXT NOT NULL,
  quarantine_scan_state TEXT NOT NULL DEFAULT 'passed',
  approval_state TEXT NOT NULL DEFAULT 'approved',
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Enable and Force Row Level Security (RLS)
ALTER TABLE IF EXISTS operational_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS operational_constraints FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS constraint_source_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS constraint_source_links FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS constraint_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS constraint_verifications FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS controlled_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS controlled_documents FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS controlled_document_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS controlled_document_revisions FORCE ROW LEVEL SECURITY;

-- 3. Create Tenant Isolation Policies with session context
DROP POLICY IF EXISTS tenant_isolation_operational_constraints ON operational_constraints;
CREATE POLICY tenant_isolation_operational_constraints ON operational_constraints
  AS PERMISSIVE FOR ALL
  TO public
  USING (organisation_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation_constraint_source_links ON constraint_source_links;
CREATE POLICY tenant_isolation_constraint_source_links ON constraint_source_links
  AS PERMISSIVE FOR ALL
  TO public
  USING (organisation_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation_constraint_verifications ON constraint_verifications;
CREATE POLICY tenant_isolation_constraint_verifications ON constraint_verifications
  AS PERMISSIVE FOR ALL
  TO public
  USING (organisation_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation_controlled_documents ON controlled_documents;
CREATE POLICY tenant_isolation_controlled_documents ON controlled_documents
  AS PERMISSIVE FOR ALL
  TO public
  USING (organisation_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation_controlled_document_revisions ON controlled_document_revisions;
CREATE POLICY tenant_isolation_controlled_document_revisions ON controlled_document_revisions
  AS PERMISSIVE FOR ALL
  TO public
  USING (organisation_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);
