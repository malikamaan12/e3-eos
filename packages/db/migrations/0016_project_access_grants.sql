-- Explicit project grants. Ownership and organisation membership grant no
-- project access by themselves; there is intentionally no backfill.
CREATE UNIQUE INDEX project_organisation_id_id_idx ON projects(organisation_id,id);
CREATE UNIQUE INDEX membership_organisation_id_id_idx ON memberships(organisation_id,id);

CREATE TABLE project_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  project_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  access_level text NOT NULL CHECK (access_level IN ('viewer','editor')),
  row_version integer NOT NULL DEFAULT 1 CHECK (row_version > 0),
  is_revoked boolean NOT NULL DEFAULT false,
  granted_by uuid NOT NULL REFERENCES users(id),
  granted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_by uuid REFERENCES users(id),
  revoked_at timestamptz,
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 2000),
  CONSTRAINT project_access_project_scope_fk FOREIGN KEY (organisation_id,project_id) REFERENCES projects(organisation_id,id),
  CONSTRAINT project_access_membership_scope_fk FOREIGN KEY (organisation_id,membership_id) REFERENCES memberships(organisation_id,id),
  CONSTRAINT project_access_revocation_state_check CHECK (
    (is_revoked AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL) OR
    (NOT is_revoked AND revoked_at IS NULL AND revoked_by IS NULL)
  )
);
CREATE UNIQUE INDEX project_access_active_membership_idx ON project_access_grants(organisation_id,project_id,membership_id) WHERE NOT is_revoked;
CREATE INDEX project_access_membership_lookup_idx ON project_access_grants(organisation_id,membership_id,project_id);
CREATE INDEX project_access_project_history_idx ON project_access_grants(organisation_id,project_id,granted_at DESC);

ALTER TABLE project_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_access_grants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_project_access ON project_access_grants
  USING (organisation_id = NULLIF(current_setting('app.current_org_id',true),'')::uuid)
  WITH CHECK (organisation_id = NULLIF(current_setting('app.current_org_id',true),'')::uuid);
