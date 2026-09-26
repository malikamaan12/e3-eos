-- Retain canonical design identities; imported approval claims are never promoted.
ALTER TABLE design_packages ADD COLUMN row_version integer NOT NULL DEFAULT 1 CHECK (row_version > 0);
ALTER TABLE design_packages ADD COLUMN provenance_state text NOT NULL DEFAULT 'legacy_unverified'
  CHECK (provenance_state IN ('legacy_unverified','manually_recorded'));
ALTER TABLE design_packages ADD COLUMN current_revision_id uuid;
ALTER TABLE design_packages ADD COLUMN location_zone text;
ALTER TABLE design_packages ALTER COLUMN approved_quantity DROP NOT NULL;
ALTER TABLE design_packages ALTER COLUMN approved_quantity DROP DEFAULT;
ALTER TABLE design_packages ALTER COLUMN released_quantity DROP NOT NULL;
ALTER TABLE design_packages ALTER COLUMN released_quantity DROP DEFAULT;
CREATE UNIQUE INDEX design_packages_register_scope_idx ON design_packages(organisation_id,project_id,id);
CREATE INDEX design_packages_register_project_idx ON design_packages(organisation_id,project_id,created_at DESC);
ALTER TABLE design_packages ADD CONSTRAINT design_register_project_scope_fk
  FOREIGN KEY(organisation_id,project_id) REFERENCES projects(organisation_id,id);

CREATE TABLE design_package_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  project_id uuid NOT NULL,
  design_package_id uuid NOT NULL,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot)='object'),
  snapshot_hash text NOT NULL CHECK (snapshot_hash ~ '^[a-f0-9]{64}$'),
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 2000),
  author_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT design_revision_parent_scope_fk FOREIGN KEY(organisation_id,project_id,design_package_id)
    REFERENCES design_packages(organisation_id,project_id,id),
  CONSTRAINT design_revision_scope_unique UNIQUE(organisation_id,project_id,design_package_id,id),
  CONSTRAINT design_revision_number_unique UNIQUE(organisation_id,design_package_id,revision_number),
  CONSTRAINT design_revision_snapshot_identity CHECK (
    (snapshot->>'designPackageId') IS NOT DISTINCT FROM design_package_id::text
    AND (snapshot->>'projectId') IS NOT DISTINCT FROM project_id::text
    AND (snapshot->>'revisionNumber') IS NOT DISTINCT FROM revision_number::text
    AND (snapshot->>'status') IS NOT DISTINCT FROM 'draft'
    AND (snapshot->>'fileStatus') IS NOT DISTINCT FROM 'missing'
    AND (snapshot->>'approvalState') IS NOT DISTINCT FROM 'not_approved'
    AND (snapshot->>'productionReleased') IS NOT DISTINCT FROM 'false'
    AND jsonb_typeof(snapshot->'requirements') IS NOT DISTINCT FROM 'array'
    AND jsonb_array_length(snapshot->'requirements') BETWEEN 1 AND 100
    AND jsonb_typeof(snapshot->'allocations') IS NOT DISTINCT FROM 'array'
    AND jsonb_array_length(snapshot->'allocations') <= 100
  )
);
ALTER TABLE design_packages ADD CONSTRAINT design_register_current_revision_scope_fk
  FOREIGN KEY(organisation_id,project_id,id,current_revision_id)
  REFERENCES design_package_revisions(organisation_id,project_id,design_package_id,id);
CREATE FUNCTION protect_design_register_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Design brief revisions cannot be updated; insert a new revision';
END;
$$;
CREATE TRIGGER design_register_revision_immutable BEFORE UPDATE ON design_package_revisions
  FOR EACH ROW EXECUTE FUNCTION protect_design_register_revision();
ALTER TABLE design_package_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_package_revisions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_design_package_revisions ON design_package_revisions
  USING(organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid)
  WITH CHECK(organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid);
