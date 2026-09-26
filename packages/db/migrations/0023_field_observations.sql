-- Notes are append-only observations. They never mutate task completion,
-- qualification, acceptance, readiness or an approved record.
CREATE UNIQUE INDEX task_instance_observation_scope_idx ON task_instances(organisation_id,project_id,id);

CREATE TABLE field_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  project_id uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id),
  client_operation_id uuid NOT NULL,
  device_id uuid NOT NULL,
  captured_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  task_id uuid,
  base_version integer CHECK (base_version > 0),
  current_task_version integer CHECK (current_task_version > 0),
  note text NOT NULL CHECK (length(trim(note)) BETWEEN 1 AND 2000),
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 2000),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL CHECK (status IN ('accepted','accepted_as_observation_with_conflict')),
  audit_event_id uuid NOT NULL UNIQUE REFERENCES audit_events(id),
  event_id text NOT NULL UNIQUE REFERENCES outbox(event_id),
  CONSTRAINT field_observation_project_scope_fk FOREIGN KEY (organisation_id,project_id) REFERENCES projects(organisation_id,id),
  CONSTRAINT field_observation_task_scope_fk FOREIGN KEY (organisation_id,project_id,task_id) REFERENCES task_instances(organisation_id,project_id,id),
  CONSTRAINT field_observation_operation_unique UNIQUE (organisation_id,actor_id,client_operation_id),
  CONSTRAINT field_observation_version_target_check CHECK (
    (task_id IS NULL AND base_version IS NULL AND current_task_version IS NULL AND status='accepted') OR
    (task_id IS NOT NULL AND current_task_version IS NOT NULL AND
      ((status='accepted' AND (base_version IS NULL OR base_version=current_task_version)) OR
       (status='accepted_as_observation_with_conflict' AND base_version IS NOT NULL AND base_version<>current_task_version)))
  )
);
CREATE INDEX field_observation_project_received_idx ON field_observations(organisation_id,project_id,received_at DESC,id);
CREATE INDEX field_observation_actor_received_idx ON field_observations(organisation_id,actor_id,received_at DESC);

CREATE FUNCTION protect_field_observation_updates() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Field observations are append-only; capture a new observation for a correction.';
END;
$$;
CREATE TRIGGER field_observation_immutable BEFORE UPDATE ON field_observations
  FOR EACH ROW EXECUTE FUNCTION protect_field_observation_updates();

ALTER TABLE field_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_observations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_field_observations ON field_observations
  USING (organisation_id = NULLIF(current_setting('app.current_org_id',true),'')::uuid)
  WITH CHECK (organisation_id = NULLIF(current_setting('app.current_org_id',true),'')::uuid);
