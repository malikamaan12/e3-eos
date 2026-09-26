-- Existing unverified text references are retained without granting new authority.
ALTER TABLE dependency_edges ADD COLUMN predecessor_task_id uuid;
ALTER TABLE dependency_edges ADD COLUMN successor_task_id uuid;
ALTER TABLE dependency_edges ADD COLUMN provenance_state text NOT NULL DEFAULT 'legacy_unverified';
ALTER TABLE dependency_edges ADD COLUMN row_version integer NOT NULL DEFAULT 1 CHECK(row_version>0);
ALTER TABLE dependency_edges ADD COLUMN is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE dependency_edges ADD COLUMN created_by uuid REFERENCES users(id);
ALTER TABLE dependency_edges ADD CONSTRAINT dependency_recorded_state CHECK (
  provenance_state='legacy_unverified' OR (provenance_state='manually_recorded'
    AND predecessor_task_id IS NOT NULL AND successor_task_id IS NOT NULL
    AND predecessor_task_id<>successor_task_id AND predecessor_id=predecessor_task_id::text
    AND successor_id=successor_task_id::text AND dependency_type IN ('FS','SS','FF') AND created_by IS NOT NULL));
ALTER TABLE dependency_edges ADD CONSTRAINT dependency_predecessor_scope_fk
  FOREIGN KEY(organisation_id,project_id,predecessor_task_id) REFERENCES task_instances(organisation_id,project_id,id);
ALTER TABLE dependency_edges ADD CONSTRAINT dependency_successor_scope_fk
  FOREIGN KEY(organisation_id,project_id,successor_task_id) REFERENCES task_instances(organisation_id,project_id,id);
CREATE UNIQUE INDEX dependency_scope_id ON dependency_edges(organisation_id,project_id,id);
CREATE UNIQUE INDEX active_controlled_dependency ON dependency_edges(organisation_id,project_id,predecessor_task_id,successor_task_id)
  WHERE provenance_state='manually_recorded' AND NOT is_archived;
CREATE TABLE dependency_changes (
  id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES organisations(id), project_id uuid NOT NULL,
  dependency_id uuid NOT NULL, revision_number integer NOT NULL CHECK(revision_number>0),
  action text NOT NULL CHECK(action IN ('created','archived')), snapshot jsonb NOT NULL,
  snapshot_hash text NOT NULL CHECK(snapshot_hash ~ '^[a-f0-9]{64}$'),
  reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 2000), actor_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(dependency_id,revision_number),
  FOREIGN KEY(organisation_id,project_id,dependency_id) REFERENCES dependency_edges(organisation_id,project_id,id),
  CHECK(jsonb_typeof(snapshot)='object' AND (snapshot->>'dependencyId') IS NOT DISTINCT FROM dependency_id::text
    AND (snapshot->>'projectId') IS NOT DISTINCT FROM project_id::text
    AND (snapshot->>'rowVersion') IS NOT DISTINCT FROM revision_number::text)
);
CREATE INDEX dependency_change_history ON dependency_changes(organisation_id,project_id,dependency_id,revision_number DESC);
CREATE TRIGGER immutable_dependency_change BEFORE UPDATE ON dependency_changes FOR EACH ROW EXECUTE FUNCTION protect_schedule_history();
ALTER TABLE dependency_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY dependency_change_scope ON dependency_changes
  USING(organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid)
  WITH CHECK(organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid);
