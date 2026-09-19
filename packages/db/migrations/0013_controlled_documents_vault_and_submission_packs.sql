-- =========================================================================
-- Migration: 0013_controlled_documents_vault_and_submission_packs.sql
-- Description: Company Evidence Vault, Required Documents, and Submission Pack Builder
-- =========================================================================

-- 1. Company Evidence Vault
CREATE TABLE IF NOT EXISTS company_evidence_vault (
  id TEXT PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  evidence_code TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  legal_entity TEXT NOT NULL,
  document_class TEXT NOT NULL DEFAULT 'external_controlled',
  confidentiality TEXT NOT NULL DEFAULT 'internal',
  source_document_number TEXT,
  issuer TEXT,
  reporting_year TEXT,
  period_start TEXT,
  period_end TEXT,
  audit_status TEXT NOT NULL DEFAULT 'not_applicable',
  expiry_state TEXT NOT NULL DEFAULT 'unknown',
  expiry_date TEXT,
  current_revision_code TEXT NOT NULL DEFAULT 'Rev 01',
  verification_status TEXT NOT NULL DEFAULT 'pending_verification',
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  retention_hold BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cev_org_cat ON company_evidence_vault(organisation_id, category);
CREATE INDEX IF NOT EXISTS idx_cev_code ON company_evidence_vault(evidence_code);
CREATE INDEX IF NOT EXISTS idx_cev_entity ON company_evidence_vault(legal_entity);

-- 2. Evidence Vault Revisions
CREATE TABLE IF NOT EXISTS evidence_vault_revisions (
  id TEXT PRIMARY KEY,
  vault_item_id TEXT NOT NULL REFERENCES company_evidence_vault(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  revision_code TEXT NOT NULL,
  predecessor_revision_id TEXT,
  content_hash TEXT NOT NULL,
  calculated_sha256 TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  verification_status TEXT NOT NULL DEFAULT 'pending_verification',
  verification_notes TEXT,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evr_item_id ON evidence_vault_revisions(vault_item_id);
CREATE INDEX IF NOT EXISTS idx_evr_hash ON evidence_vault_revisions(content_hash);

-- 3. Project Required Document Slots
CREATE TABLE IF NOT EXISTS project_required_document_slots (
  id TEXT PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  requirement_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  requested_entity TEXT,
  requested_years JSONB NOT NULL DEFAULT '[]'::jsonb,
  requested_language TEXT NOT NULL DEFAULT 'any',
  requested_format TEXT NOT NULL DEFAULT 'pdf',
  certification_required BOOLEAN NOT NULL DEFAULT FALSE,
  signature_required BOOLEAN NOT NULL DEFAULT FALSE,
  stamp_required BOOLEAN NOT NULL DEFAULT FALSE,
  envelope TEXT NOT NULL DEFAULT 'technical',
  owner TEXT,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'missing',
  linked_evidence_vault_id TEXT,
  linked_evidence_revision_id TEXT,
  exclusion_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prds_proj ON project_required_document_slots(project_id);
CREATE INDEX IF NOT EXISTS idx_prds_req ON project_required_document_slots(requirement_id);

-- 4. Project Document Working Copies
CREATE TABLE IF NOT EXISTS project_document_working_copies (
  id TEXT PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  document_number TEXT NOT NULL,
  title TEXT NOT NULL,
  source_vault_template_id TEXT,
  source_vault_revision_id TEXT,
  discipline TEXT NOT NULL DEFAULT 'general',
  envelope TEXT NOT NULL DEFAULT 'technical',
  current_revision_code TEXT NOT NULL DEFAULT 'Rev 01',
  content_hash TEXT NOT NULL,
  is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  frozen_at TIMESTAMPTZ,
  frozen_by TEXT,
  status TEXT NOT NULL DEFAULT 'working',
  record_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdwc_proj ON project_document_working_copies(project_id);

-- 5. Submission Packs
CREATE TABLE IF NOT EXISTS submission_packs (
  id TEXT PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  pack_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tender_reference TEXT,
  envelope TEXT NOT NULL DEFAULT 'technical',
  status TEXT NOT NULL DEFAULT 'working',
  current_revision_number INTEGER NOT NULL DEFAULT 1,
  current_revision_code TEXT NOT NULL DEFAULT 'Rev 01',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sp_proj ON submission_packs(project_id);
CREATE INDEX IF NOT EXISTS idx_sp_code ON submission_packs(pack_code);

-- 6. Submission Pack Revisions
CREATE TABLE IF NOT EXISTS submission_pack_revisions (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL REFERENCES submission_packs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  revision_code TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'working',
  manifest_hash TEXT NOT NULL,
  is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  frozen_at TIMESTAMPTZ,
  frozen_by TEXT,
  freeze_notes TEXT,
  export_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spr_pack_id ON submission_pack_revisions(pack_id);

-- 7. Submission Pack Items
CREATE TABLE IF NOT EXISTS submission_pack_items (
  id TEXT PRIMARY KEY,
  pack_revision_id TEXT NOT NULL REFERENCES submission_pack_revisions(id) ON DELETE CASCADE,
  sequence_index INTEGER NOT NULL,
  section_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  source_revision_id TEXT NOT NULL,
  source_content_hash TEXT NOT NULL,
  submission_title TEXT NOT NULL,
  envelope TEXT NOT NULL DEFAULT 'technical',
  is_included BOOLEAN NOT NULL DEFAULT TRUE,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  exclusion_reason TEXT,
  selected_page_range TEXT NOT NULL DEFAULT 'all',
  stamp_required BOOLEAN NOT NULL DEFAULT FALSE,
  signature_required BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_spi_rev_id ON submission_pack_items(pack_revision_id);
CREATE INDEX IF NOT EXISTS idx_spi_seq ON submission_pack_items(pack_revision_id, sequence_index);

-- 8. Submission Pack Artifacts
CREATE TABLE IF NOT EXISTS submission_pack_artifacts (
  id TEXT PRIMARY KEY,
  pack_revision_id TEXT NOT NULL REFERENCES submission_pack_revisions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  manifest_hash TEXT NOT NULL,
  artifact_hash TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  page_count INTEGER NOT NULL,
  page_map JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_sealed BOOLEAN NOT NULL DEFAULT FALSE,
  sealed_at TIMESTAMPTZ,
  signed_marks_applied BOOLEAN NOT NULL DEFAULT FALSE,
  signing_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spa_rev ON submission_pack_artifacts(pack_revision_id);

-- 9. Document Comments
CREATE TABLE IF NOT EXISTS document_comments (
  id TEXT PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID REFERENCES projects(id),
  document_id TEXT NOT NULL,
  version_id TEXT,
  page_number INTEGER NOT NULL DEFAULT 1,
  x_percent NUMERIC,
  y_percent NUMERIC,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'internal_only',
  is_blocking BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_evidence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dc_doc ON document_comments(document_id);

-- 10. Authorized Stamp & Signature Assets
CREATE TABLE IF NOT EXISTS authorized_stamp_signature_assets (
  id TEXT PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  asset_type TEXT NOT NULL,
  asset_code TEXT NOT NULL,
  label TEXT NOT NULL,
  signatory_name TEXT NOT NULL,
  signatory_authority TEXT NOT NULL,
  confidentiality TEXT NOT NULL DEFAULT 'restricted',
  storage_key TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  allowed_actors JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assa_code ON authorized_stamp_signature_assets(asset_code);

-- 11. Transmittal Issue Records
CREATE TABLE IF NOT EXISTS transmittal_issue_records (
  id TEXT PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  pack_revision_id TEXT NOT NULL REFERENCES submission_pack_revisions(id),
  transmittal_number TEXT NOT NULL,
  recipient_organisation TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  channel TEXT NOT NULL,
  purpose TEXT NOT NULL,
  issued_by TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  artifact_hash TEXT NOT NULL,
  receipt_reference TEXT,
  receipt_acknowledged_by TEXT,
  receipt_acknowledged_at TIMESTAMPTZ,
  receipt_notes TEXT,
  receipt_document_url TEXT,
  status TEXT NOT NULL DEFAULT 'issued'
);

CREATE INDEX IF NOT EXISTS idx_tir_proj ON transmittal_issue_records(project_id);
CREATE INDEX IF NOT EXISTS idx_tir_num ON transmittal_issue_records(transmittal_number);

-- Enable Row Level Security (RLS) on all new tables
ALTER TABLE company_evidence_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_vault_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_required_document_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_document_working_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_pack_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_pack_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_pack_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorized_stamp_signature_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transmittal_issue_records ENABLE ROW LEVEL SECURITY;
