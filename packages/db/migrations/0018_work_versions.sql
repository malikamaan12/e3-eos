-- Expand existing work records without asserting acceptance or inventing evidence.
ALTER TABLE work_packages ADD COLUMN row_version integer NOT NULL DEFAULT 1;
ALTER TABLE work_packages ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE work_packages ADD CONSTRAINT work_package_version_positive CHECK (row_version > 0);

ALTER TABLE task_instances ADD COLUMN row_version integer NOT NULL DEFAULT 1;
ALTER TABLE task_instances ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE task_instances ADD COLUMN completed_by uuid REFERENCES users(id);
ALTER TABLE task_instances ADD COLUMN completion_evidence text;
ALTER TABLE task_instances ADD CONSTRAINT task_instance_version_positive CHECK (row_version > 0);

CREATE INDEX work_packages_scope_idx ON work_packages(organisation_id, project_id);
CREATE INDEX task_instances_scope_idx ON task_instances(organisation_id, project_id, package_id);
