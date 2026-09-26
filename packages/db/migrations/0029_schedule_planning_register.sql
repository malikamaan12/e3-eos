-- Planning definitions and frozen review candidates do not publish approved baselines.
CREATE TABLE schedule_plan_records (
  id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES organisations(id), project_id uuid NOT NULL,
  kind text NOT NULL CHECK(kind IN ('calendar','milestone','baseline_candidate')),
  title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
  payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
  row_version integer NOT NULL DEFAULT 1 CHECK(row_version>0), current_revision_id uuid,
  created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(organisation_id,project_id,id),
  FOREIGN KEY(organisation_id,project_id) REFERENCES projects(organisation_id,id)
);
CREATE TABLE schedule_plan_revisions (
  id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES organisations(id), project_id uuid NOT NULL,
  record_id uuid NOT NULL, revision_number integer NOT NULL CHECK(revision_number>0),
  snapshot jsonb NOT NULL, snapshot_hash text NOT NULL CHECK(snapshot_hash ~ '^[a-f0-9]{64}$'),
  reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 2000), actor_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(record_id,revision_number), UNIQUE(organisation_id,project_id,record_id,id),
  FOREIGN KEY(organisation_id,project_id,record_id) REFERENCES schedule_plan_records(organisation_id,project_id,id),
  CHECK(jsonb_typeof(snapshot)='object'
    AND (snapshot->>'recordId') IS NOT DISTINCT FROM record_id::text
    AND (snapshot->>'projectId') IS NOT DISTINCT FROM project_id::text
    AND (snapshot->>'version') IS NOT DISTINCT FROM revision_number::text
    AND (snapshot->>'authorityEffect') IS NOT DISTINCT FROM 'planning_only')
);
ALTER TABLE schedule_plan_records ADD CONSTRAINT schedule_plan_revision_scope_fk
  FOREIGN KEY(organisation_id,project_id,id,current_revision_id)
  REFERENCES schedule_plan_revisions(organisation_id,project_id,record_id,id) DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX schedule_plan_project_kind ON schedule_plan_records(organisation_id,project_id,kind,created_at DESC);
CREATE INDEX schedule_plan_history ON schedule_plan_revisions(organisation_id,project_id,record_id,revision_number DESC);
CREATE TRIGGER immutable_schedule_plan_history BEFORE UPDATE ON schedule_plan_revisions
  FOR EACH ROW EXECUTE FUNCTION protect_schedule_history();
CREATE FUNCTION protect_baseline_candidate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.kind<>NEW.kind OR (OLD.kind='baseline_candidate' AND OLD.current_revision_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Frozen baseline candidates are immutable; capture a new candidate.';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER frozen_baseline_candidate BEFORE UPDATE ON schedule_plan_records
  FOR EACH ROW EXECUTE FUNCTION protect_baseline_candidate();
ALTER TABLE schedule_plan_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_plan_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY schedule_plan_scope ON schedule_plan_records
  USING(organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid)
  WITH CHECK(organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid);
CREATE POLICY schedule_plan_history_scope ON schedule_plan_revisions
  USING(organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid)
  WITH CHECK(organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid);
