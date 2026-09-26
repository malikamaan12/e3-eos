-- Expand the existing requirement register; do not convert legacy scope or
-- imported approval flags into verified source evidence or controlled drafts.
ALTER TABLE requirements ADD COLUMN row_version integer NOT NULL DEFAULT 1;
ALTER TABLE requirements ADD COLUMN provenance_state text NOT NULL DEFAULT 'legacy_unverified';
ALTER TABLE requirements ADD COLUMN current_revision_id uuid;
ALTER TABLE requirements ADD CONSTRAINT requirement_intake_version_positive CHECK (row_version > 0);
ALTER TABLE requirements ADD CONSTRAINT requirement_intake_provenance CHECK (provenance_state IN ('legacy_unverified','manually_recorded'));

ALTER TABLE requirement_revisions ADD COLUMN snapshot jsonb;
ALTER TABLE requirement_revisions ADD COLUMN snapshot_hash text;
ALTER TABLE requirement_revisions ADD COLUMN provenance_state text NOT NULL DEFAULT 'legacy_unverified';
ALTER TABLE requirement_revisions ADD CONSTRAINT requirement_revision_provenance CHECK (provenance_state IN ('legacy_unverified','manually_recorded'));
ALTER TABLE requirement_revisions ADD CONSTRAINT requirement_revision_snapshot_valid CHECK (
  provenance_state='legacy_unverified' OR (
    snapshot IS NOT NULL AND jsonb_typeof(snapshot)='object'
    AND snapshot_hash IS NOT NULL AND snapshot_hash ~ '^[a-f0-9]{64}$'
    AND (snapshot->>'requirementId') IS NOT DISTINCT FROM requirement_id::text
    AND (snapshot->>'revisionNumber') IS NOT DISTINCT FROM revision_number::text
    AND revision_number > 0
  )
);

CREATE UNIQUE INDEX requirements_scope_identity_idx ON requirements(organisation_id,project_id,id);
CREATE UNIQUE INDEX requirement_revisions_scope_identity_idx ON requirement_revisions(organisation_id,project_id,requirement_id,id);
CREATE UNIQUE INDEX requirement_intake_revision_number_idx ON requirement_revisions(organisation_id,requirement_id,revision_number)
  WHERE provenance_state='manually_recorded';
CREATE INDEX requirement_intake_project_idx ON requirements(organisation_id,project_id,created_at DESC);
ALTER TABLE requirements ADD CONSTRAINT requirement_current_revision_scope_fk
  FOREIGN KEY(organisation_id,project_id,id,current_revision_id)
  REFERENCES requirement_revisions(organisation_id,project_id,requirement_id,id);

-- New reviewed snapshots are immutable. A subsequent correction is an INSERT,
-- never an UPDATE to an earlier revision. Retention deletion is not exposed by
-- the intake API and remains a separate database governance operation.
CREATE FUNCTION prevent_requirement_intake_revision_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.provenance_state='manually_recorded' THEN
    RAISE EXCEPTION 'Recorded requirement revisions cannot be updated; insert a new revision';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER requirement_intake_revision_immutable BEFORE UPDATE ON requirement_revisions
  FOR EACH ROW EXECUTE FUNCTION prevent_requirement_intake_revision_update();
