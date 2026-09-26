-- Forecasts are planning records. They do not alter a baseline or actual dates.
ALTER TABLE task_instances ADD COLUMN forecast_start timestamptz;
ALTER TABLE task_instances ADD COLUMN forecast_finish timestamptz;
ALTER TABLE task_instances ADD COLUMN forecast_timezone text;
ALTER TABLE task_instances ADD COLUMN forecast_version integer NOT NULL DEFAULT 0 CHECK (forecast_version>=0);
ALTER TABLE task_instances ADD COLUMN current_forecast_revision_id uuid;
ALTER TABLE task_instances ADD CONSTRAINT task_forecast_window CHECK (
  (forecast_start IS NULL AND forecast_finish IS NULL AND forecast_timezone IS NULL) OR
  (forecast_start IS NOT NULL AND forecast_finish IS NOT NULL AND forecast_finish>=forecast_start
    AND forecast_timezone IS NOT NULL AND length(forecast_timezone) BETWEEN 1 AND 100));
CREATE TABLE task_forecast_revisions (
  id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES organisations(id), project_id uuid NOT NULL,
  task_id uuid NOT NULL, revision_number integer NOT NULL CHECK (revision_number>0),
  snapshot jsonb NOT NULL, snapshot_hash text NOT NULL CHECK (snapshot_hash ~ '^[a-f0-9]{64}$'),
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 2000), actor_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (task_id,revision_number), UNIQUE(organisation_id,project_id,task_id,id),
  FOREIGN KEY(organisation_id,project_id,task_id) REFERENCES task_instances(organisation_id,project_id,id),
  CHECK (jsonb_typeof(snapshot)='object' AND (snapshot->>'taskId') IS NOT DISTINCT FROM task_id::text
    AND (snapshot->>'projectId') IS NOT DISTINCT FROM project_id::text
    AND (snapshot->>'forecastVersion') IS NOT DISTINCT FROM revision_number::text
    AND (snapshot->>'authorityEffect') IS NOT DISTINCT FROM 'forecast_only')
);
ALTER TABLE task_instances ADD CONSTRAINT task_current_forecast_scope_fk
  FOREIGN KEY(organisation_id,project_id,id,current_forecast_revision_id)
  REFERENCES task_forecast_revisions(organisation_id,project_id,task_id,id);
CREATE INDEX task_forecast_calendar ON task_instances(organisation_id,forecast_start,forecast_finish) WHERE forecast_start IS NOT NULL;
CREATE INDEX task_forecast_history ON task_forecast_revisions(organisation_id,project_id,task_id,revision_number DESC);
CREATE FUNCTION protect_schedule_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Schedule history is immutable; append a new change.'; END; $$;
CREATE TRIGGER immutable_task_forecast BEFORE UPDATE ON task_forecast_revisions FOR EACH ROW EXECUTE FUNCTION protect_schedule_history();
ALTER TABLE task_forecast_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_forecast_scope ON task_forecast_revisions
  USING(organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid)
  WITH CHECK(organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid);
