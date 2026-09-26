-- Advisory impact history is pinned to one exact controlled target revision.
-- It never alters the allocation/design/source state or any approval/release.
CREATE TABLE impact_review_assessments (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  project_id uuid NOT NULL,
  allocation_id uuid,
  allocation_revision_id uuid,
  design_package_id uuid,
  design_revision_id uuid,
  target_version integer NOT NULL CHECK (target_version > 0),
  impact_fingerprint text NOT NULL CHECK (impact_fingerprint ~ '^[0-9a-f]{64}$'),
  source_snapshot jsonb NOT NULL CHECK (jsonb_typeof(source_snapshot)='object'),
  assessment text NOT NULL CHECK (length(trim(assessment)) BETWEEN 1 AND 4000),
  proposed_action text NOT NULL CHECK (length(trim(proposed_action)) BETWEEN 1 AND 2000),
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 2000),
  actor_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT impact_target_exact_type CHECK (
    (allocation_id IS NOT NULL AND allocation_revision_id IS NOT NULL AND design_package_id IS NULL AND design_revision_id IS NULL)
    OR (allocation_id IS NULL AND allocation_revision_id IS NULL AND design_package_id IS NOT NULL AND design_revision_id IS NOT NULL)),
  CONSTRAINT impact_review_snapshot_identity CHECK (
    (source_snapshot->>'contractVersion') IS NOT DISTINCT FROM 'impact-review.v1'
    AND (source_snapshot->>'projectId') IS NOT DISTINCT FROM project_id::text
    AND (source_snapshot->>'targetType') IS NOT DISTINCT FROM CASE WHEN allocation_id IS NOT NULL THEN 'allocation' ELSE 'design' END
    AND (source_snapshot->>'targetId') IS NOT DISTINCT FROM coalesce(allocation_id,design_package_id)::text
    AND (source_snapshot->>'targetRevisionId') IS NOT DISTINCT FROM coalesce(allocation_revision_id,design_revision_id)::text
    AND (source_snapshot->>'targetVersion') IS NOT DISTINCT FROM target_version::text
    AND (source_snapshot->>'authorityEffect') IS NOT DISTINCT FROM 'advisory_only'
    AND jsonb_typeof(source_snapshot->'sources') IS NOT DISTINCT FROM 'array'),
  CONSTRAINT impact_allocation_revision_scope_fk FOREIGN KEY(organisation_id,project_id,allocation_id,allocation_revision_id)
    REFERENCES requirement_allocation_revisions(organisation_id,project_id,allocation_id,id),
  CONSTRAINT impact_design_revision_scope_fk FOREIGN KEY(organisation_id,project_id,design_package_id,design_revision_id)
    REFERENCES design_package_revisions(organisation_id,project_id,design_package_id,id)
);
CREATE INDEX impact_review_project_history ON impact_review_assessments(organisation_id,project_id,created_at DESC,id);
CREATE INDEX impact_review_allocation_history ON impact_review_assessments(organisation_id,project_id,allocation_id,created_at DESC);
CREATE INDEX impact_review_design_history ON impact_review_assessments(organisation_id,project_id,design_package_id,created_at DESC);
CREATE FUNCTION protect_impact_assessment_updates() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Impact assessments are immutable; record a new advisory assessment.';
END;
$$;
CREATE TRIGGER immutable_impact_assessment BEFORE UPDATE ON impact_review_assessments
  FOR EACH ROW EXECUTE FUNCTION protect_impact_assessment_updates();
ALTER TABLE impact_review_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_review_assessments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_impact_review_assessments ON impact_review_assessments
  USING (organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid)
  WITH CHECK (organisation_id=NULLIF(current_setting('app.current_org_id',true),'')::uuid);
