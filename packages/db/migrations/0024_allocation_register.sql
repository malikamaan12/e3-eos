-- Expand the canonical allocation table. Legacy values remain unverified and
-- are not relabelled as controlled planning or approved delivery quantities.
ALTER TABLE requirement_allocations ALTER COLUMN quantity DROP NOT NULL;
ALTER TABLE requirement_allocations ALTER COLUMN unit DROP DEFAULT;
ALTER TABLE requirement_allocations ALTER COLUMN location DROP NOT NULL;
ALTER TABLE requirement_allocations ALTER COLUMN zone DROP NOT NULL;
ALTER TABLE requirement_allocations ADD COLUMN row_version integer NOT NULL DEFAULT 1;
ALTER TABLE requirement_allocations ADD COLUMN provenance_state text NOT NULL DEFAULT 'legacy_unverified';
ALTER TABLE requirement_allocations ADD COLUMN current_revision_id uuid;
ALTER TABLE requirement_allocations ADD COLUMN requirement_revision_id uuid;
ALTER TABLE requirement_allocations ADD COLUMN requirement_version integer;
ALTER TABLE requirement_allocations ADD COLUMN department text;
ALTER TABLE requirement_allocations ADD COLUMN owner_id uuid REFERENCES users(id);
ALTER TABLE requirement_allocations ADD COLUMN created_by uuid REFERENCES users(id);
ALTER TABLE requirement_allocations ADD CONSTRAINT allocation_register_version CHECK (row_version>0);
ALTER TABLE requirement_allocations ADD CONSTRAINT allocation_register_provenance CHECK (
  provenance_state='legacy_unverified' OR (provenance_state='manually_recorded'
    AND requirement_revision_id IS NOT NULL AND requirement_version IS NOT NULL AND requirement_version>0
    AND status='draft' AND revision>0 AND created_by IS NOT NULL
    AND (quantity IS NULL OR (quantity>=0 AND quantity<1000000000000000000 AND scale(quantity)<=6))
    AND design_variant_id IS NULL AND required_date IS NULL AND installation_date IS NULL
    AND completion_pct=0 AND evidence_ref IS NULL)
);
CREATE UNIQUE INDEX requirement_allocations_scope_id ON requirement_allocations(organisation_id,project_id,id);
CREATE INDEX allocation_register_project ON requirement_allocations(organisation_id,project_id,created_at DESC,id);
CREATE INDEX allocation_register_requirement ON requirement_allocations(organisation_id,project_id,requirement_id);
ALTER TABLE requirement_allocations ADD CONSTRAINT allocation_requirement_scope_fk
  FOREIGN KEY(organisation_id,project_id,requirement_id) REFERENCES requirements(organisation_id,project_id,id) NOT VALID;
ALTER TABLE requirement_allocations ADD CONSTRAINT allocation_requirement_revision_scope_fk
  FOREIGN KEY(organisation_id,project_id,requirement_id,requirement_revision_id)
  REFERENCES requirement_revisions(organisation_id,project_id,requirement_id,id);

CREATE TABLE requirement_allocation_revisions (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  project_id uuid NOT NULL,
  allocation_id uuid NOT NULL,
  revision_number integer NOT NULL CHECK (revision_number>0),
  snapshot jsonb NOT NULL,
  snapshot_hash text NOT NULL CHECK (snapshot_hash ~ '^[a-f0-9]{64}$'),
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 2000),
  author_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT allocation_revision_scope_fk FOREIGN KEY(organisation_id,project_id,allocation_id)
    REFERENCES requirement_allocations(organisation_id,project_id,id),
  CONSTRAINT allocation_revision_scope_id UNIQUE(organisation_id,project_id,allocation_id,id),
  CONSTRAINT allocation_revision_number UNIQUE(allocation_id,revision_number),
  CONSTRAINT allocation_revision_snapshot_identity CHECK (jsonb_typeof(snapshot)='object'
    AND (snapshot->>'allocationId') IS NOT DISTINCT FROM allocation_id::text
    AND (snapshot->>'projectId') IS NOT DISTINCT FROM project_id::text
    AND (snapshot->>'revisionNumber') IS NOT DISTINCT FROM revision_number::text
    AND (snapshot->>'status') IS NOT DISTINCT FROM 'draft'
    AND (snapshot->>'authorityEffect') IS NOT DISTINCT FROM 'planning_only')
);
ALTER TABLE requirement_allocations ADD CONSTRAINT allocation_current_revision_scope_fk
  FOREIGN KEY(organisation_id,project_id,id,current_revision_id)
  REFERENCES requirement_allocation_revisions(organisation_id,project_id,allocation_id,id);
CREATE INDEX allocation_revision_history ON requirement_allocation_revisions(organisation_id,project_id,allocation_id,revision_number DESC);
CREATE FUNCTION protect_allocation_revision_updates() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Allocation planning revisions are immutable; insert a new revision.';
END;
$$;
CREATE TRIGGER immutable_allocation_revision BEFORE UPDATE ON requirement_allocation_revisions
  FOR EACH ROW EXECUTE FUNCTION protect_allocation_revision_updates();
ALTER TABLE requirement_allocation_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_allocation_revisions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_allocation_revisions ON requirement_allocation_revisions
  USING (organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid)
  WITH CHECK (organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid);
