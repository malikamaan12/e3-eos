-- Expand the existing document register without certifying earlier uploaded data.
-- No legacy revision is backfilled as scanned, verified or approved by this change.
ALTER TABLE controlled_documents ADD COLUMN IF NOT EXISTS row_version integer NOT NULL DEFAULT 1;
ALTER TABLE controlled_documents ADD COLUMN IF NOT EXISTS provenance_state text NOT NULL DEFAULT 'legacy_unverified';
ALTER TABLE controlled_documents ALTER COLUMN current_revision_code DROP NOT NULL;
ALTER TABLE controlled_documents ALTER COLUMN revisions_count SET DEFAULT 0;
ALTER TABLE controlled_documents ADD CONSTRAINT controlled_documents_row_version_positive CHECK (row_version > 0);
ALTER TABLE controlled_documents ADD CONSTRAINT controlled_documents_provenance CHECK (provenance_state IN ('legacy_unverified','metadata_only'));

ALTER TABLE controlled_document_revisions ADD COLUMN IF NOT EXISTS provenance_state text NOT NULL DEFAULT 'legacy_unverified';
ALTER TABLE controlled_document_revisions ADD COLUMN IF NOT EXISTS change_summary text;
ALTER TABLE controlled_document_revisions ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'for_information';
ALTER TABLE controlled_document_revisions ALTER COLUMN storage_object_path DROP NOT NULL;
ALTER TABLE controlled_document_revisions ALTER COLUMN original_filename DROP NOT NULL;
ALTER TABLE controlled_document_revisions ALTER COLUMN mime_type DROP NOT NULL;
ALTER TABLE controlled_document_revisions ALTER COLUMN size DROP NOT NULL;
ALTER TABLE controlled_document_revisions ALTER COLUMN calculated_sha256 DROP NOT NULL;
ALTER TABLE controlled_document_revisions ALTER COLUMN quarantine_scan_state SET DEFAULT 'not_scanned';
ALTER TABLE controlled_document_revisions ALTER COLUMN approval_state SET DEFAULT 'draft';
ALTER TABLE controlled_document_revisions ADD CONSTRAINT controlled_revision_provenance CHECK (
  provenance_state = 'legacy_unverified' OR (
    provenance_state = 'metadata_only' AND storage_object_path IS NULL AND size IS NULL AND calculated_sha256 IS NULL
    AND quarantine_scan_state = 'not_scanned' AND approval_state = 'draft'
  )
);
-- Only new metadata records participate; preserve legacy numbering for review.
CREATE UNIQUE INDEX controlled_documents_metadata_number ON controlled_documents(organisation_id,project_id,document_number)
  WHERE provenance_state='metadata_only';
CREATE UNIQUE INDEX controlled_revisions_metadata_code ON controlled_document_revisions(organisation_id,document_id,revision)
  WHERE provenance_state='metadata_only';
CREATE INDEX controlled_documents_scoped_register ON controlled_documents(organisation_id,project_id,created_at DESC,id);
CREATE INDEX controlled_revisions_scoped_register ON controlled_document_revisions(organisation_id,document_id,uploaded_at DESC,id);
