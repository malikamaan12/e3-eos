-- Controlled internal reports use immutable snapshots of canonical project
-- records. Legacy generated examples are deliberately not imported or issued.
CREATE TABLE project_report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  project_id uuid NOT NULL,
  root_report_id uuid NOT NULL,
  report_code text NOT NULL CHECK (length(trim(report_code)) BETWEEN 1 AND 80),
  version integer NOT NULL CHECK (version > 0),
  target_audience text NOT NULL DEFAULT 'internal_command' CHECK (target_audience = 'internal_command'),
  status text NOT NULL DEFAULT 'draft' CHECK (status = 'draft'),
  period_start date NOT NULL,
  period_end date NOT NULL,
  data_as_of timestamptz NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  snapshot jsonb NOT NULL,
  revision_reason text NOT NULL CHECK (length(trim(revision_reason)) BETWEEN 1 AND 2000),
  supersedes_id uuid,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT report_snapshot_period_check CHECK (period_start <= period_end),
  CONSTRAINT report_snapshot_project_scope_fk FOREIGN KEY (organisation_id,project_id) REFERENCES projects(organisation_id,id),
  CONSTRAINT report_snapshot_scope_id_unique UNIQUE (organisation_id,project_id,id),
  CONSTRAINT report_snapshot_root_scope_fk FOREIGN KEY (organisation_id,project_id,root_report_id) REFERENCES project_report_snapshots(organisation_id,project_id,id),
  CONSTRAINT report_snapshot_previous_scope_fk FOREIGN KEY (organisation_id,project_id,supersedes_id) REFERENCES project_report_snapshots(organisation_id,project_id,id),
  CONSTRAINT report_snapshot_root_version_unique UNIQUE (root_report_id,version),
  CONSTRAINT report_snapshot_revision_check CHECK ((version=1 AND root_report_id=id AND supersedes_id IS NULL) OR (version>1 AND root_report_id<>id AND supersedes_id IS NOT NULL))
);
CREATE UNIQUE INDEX report_snapshot_project_code_idx ON project_report_snapshots(organisation_id,project_id,lower(report_code)) WHERE version=1;
CREATE INDEX report_snapshot_project_list_idx ON project_report_snapshots(organisation_id,project_id,created_at DESC);

CREATE FUNCTION protect_report_snapshot_updates() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Report snapshots are immutable; create a revision instead.';
END;
$$;
CREATE TRIGGER report_snapshot_immutable BEFORE UPDATE ON project_report_snapshots
  FOR EACH ROW EXECUTE FUNCTION protect_report_snapshot_updates();

ALTER TABLE project_report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_report_snapshots FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_report_snapshots ON project_report_snapshots
  USING (organisation_id = NULLIF(current_setting('app.current_org_id',true),'')::uuid)
  WITH CHECK (organisation_id = NULLIF(current_setting('app.current_org_id',true),'')::uuid);
