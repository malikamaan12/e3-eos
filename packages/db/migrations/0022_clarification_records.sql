-- Preserve legacy questions as unverified. New records are internal, never
-- implicitly issued to a client or treated as approved operational scope.
ALTER TABLE clarifications ALTER COLUMN due_at DROP NOT NULL;
ALTER TABLE clarifications ADD COLUMN row_version integer NOT NULL DEFAULT 1;
ALTER TABLE clarifications ADD COLUMN owner_id uuid REFERENCES users(id);
ALTER TABLE clarifications ADD COLUMN respondent_id uuid REFERENCES users(id);
ALTER TABLE clarifications ADD COLUMN created_by uuid REFERENCES users(id);
ALTER TABLE clarifications ADD COLUMN source_attribution text;
ALTER TABLE clarifications ADD COLUMN requirement_id uuid REFERENCES requirements(id);
ALTER TABLE clarifications ADD COLUMN requirement_version integer;
ALTER TABLE clarifications ADD COLUMN requirement_revision_id uuid REFERENCES requirement_revisions(id);
ALTER TABLE clarifications ADD COLUMN latest_response_id uuid;
ALTER TABLE clarifications ADD COLUMN responded_at timestamptz;
ALTER TABLE clarifications ADD COLUMN updated_at timestamptz NOT NULL DEFAULT clock_timestamp();
ALTER TABLE clarifications ADD COLUMN provenance_state text NOT NULL DEFAULT 'legacy_unverified';
ALTER TABLE clarifications ADD CONSTRAINT clarification_record_version CHECK (row_version > 0);
ALTER TABLE clarifications ADD CONSTRAINT clarification_linked_requirement_pin CHECK (
  (requirement_id IS NULL AND requirement_version IS NULL AND requirement_revision_id IS NULL)
  OR (requirement_id IS NOT NULL AND requirement_version IS NOT NULL AND requirement_version > 0 AND requirement_revision_id IS NOT NULL)
);
ALTER TABLE clarifications ADD CONSTRAINT clarification_requirement_scope_fk
  FOREIGN KEY(organisation_id,project_id,requirement_id) REFERENCES requirements(organisation_id,project_id,id);
ALTER TABLE clarifications ADD CONSTRAINT clarification_requirement_revision_scope_fk
  FOREIGN KEY(organisation_id,project_id,requirement_id,requirement_revision_id)
  REFERENCES requirement_revisions(organisation_id,project_id,requirement_id,id);
ALTER TABLE clarifications ADD CONSTRAINT clarification_record_provenance CHECK (
  provenance_state='legacy_unverified' OR (
    provenance_state='internal_record' AND owner_id IS NOT NULL AND created_by IS NOT NULL
    AND source='internal_question' AND source_attribution IS NOT NULL
    AND length(trim(question)) BETWEEN 3 AND 4000 AND length(trim(source_attribution)) BETWEEN 1 AND 2000
    AND ((status='open' AND response IS NULL AND responded_by IS NULL AND responded_at IS NULL AND latest_response_id IS NULL)
      OR (status='answered' AND response IS NOT NULL AND responded_by IS NOT NULL AND responded_at IS NOT NULL AND latest_response_id IS NOT NULL))
  )
);
CREATE UNIQUE INDEX clarification_record_scoped_id ON clarifications(organisation_id,project_id,id);
CREATE INDEX clarification_record_register ON clarifications(organisation_id,project_id,provenance_state,created_at DESC,id);

CREATE TABLE clarification_responses (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  project_id uuid NOT NULL,
  clarification_id uuid NOT NULL,
  record_version integer NOT NULL CHECK (record_version > 1),
  response text NOT NULL CHECK (length(trim(response)) BETWEEN 1 AND 8000),
  respondent_attribution text NOT NULL CHECK (length(trim(respondent_attribution)) BETWEEN 1 AND 300),
  source_attribution text NOT NULL CHECK (length(trim(source_attribution)) BETWEEN 1 AND 2000),
  recorded_by uuid NOT NULL REFERENCES users(id),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT clarification_response_scope_fk FOREIGN KEY(organisation_id,project_id,clarification_id)
    REFERENCES clarifications(organisation_id,project_id,id),
  CONSTRAINT clarification_response_scoped_id UNIQUE(organisation_id,project_id,clarification_id,id),
  CONSTRAINT clarification_response_version UNIQUE(clarification_id,record_version)
);
ALTER TABLE clarifications ADD CONSTRAINT clarification_current_response_scope_fk
  FOREIGN KEY(organisation_id,project_id,id,latest_response_id)
  REFERENCES clarification_responses(organisation_id,project_id,clarification_id,id);

CREATE TABLE clarification_history (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  project_id uuid NOT NULL,
  clarification_id uuid NOT NULL,
  record_version integer NOT NULL CHECK (record_version > 0),
  action text NOT NULL CHECK (action IN ('created','responded','reopened')),
  actor_id uuid NOT NULL REFERENCES users(id),
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 2000),
  response_id uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT clarification_history_scope_fk FOREIGN KEY(organisation_id,project_id,clarification_id)
    REFERENCES clarifications(organisation_id,project_id,id),
  CONSTRAINT clarification_history_response_scope_fk FOREIGN KEY(organisation_id,project_id,clarification_id,response_id)
    REFERENCES clarification_responses(organisation_id,project_id,clarification_id,id),
  CONSTRAINT clarification_history_version UNIQUE(clarification_id,record_version),
  CONSTRAINT clarification_history_response_required CHECK (action<>'responded' OR response_id IS NOT NULL)
);
CREATE INDEX clarification_response_history ON clarification_responses(organisation_id,project_id,clarification_id,record_version DESC);
CREATE INDEX clarification_event_history ON clarification_history(organisation_id,project_id,clarification_id,record_version DESC);

CREATE FUNCTION protect_clarification_history_updates() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Clarification responses and history are immutable; record a new response or reopen the question.';
END;
$$;
CREATE TRIGGER immutable_clarification_response BEFORE UPDATE ON clarification_responses
  FOR EACH ROW EXECUTE FUNCTION protect_clarification_history_updates();
CREATE TRIGGER immutable_clarification_history BEFORE UPDATE ON clarification_history
  FOR EACH ROW EXECUTE FUNCTION protect_clarification_history_updates();

ALTER TABLE clarification_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clarification_responses FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_clarification_responses ON clarification_responses
  USING (organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid)
  WITH CHECK (organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid);
ALTER TABLE clarification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE clarification_history FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_clarification_history ON clarification_history
  USING (organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid)
  WITH CHECK (organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid);
