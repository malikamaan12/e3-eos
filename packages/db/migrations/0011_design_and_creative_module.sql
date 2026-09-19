-- Migration 0011: Design & Creative Management Module
-- Creates and extends tables for Design Workspaces, Items, Versions, Files, Previews, Artboards, Saved Views, Annotations, Comments, Review Rounds, Approvals, Change Requests, Releases, Adoptions, External Shares, Links, and Audit Logs.

CREATE TABLE IF NOT EXISTS design_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  description TEXT,
  responsible_department TEXT,
  owner_id UUID REFERENCES users(id),
  owner_name TEXT,
  default_reviewers JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_client_reviewers JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_workflow TEXT NOT NULL DEFAULT 'standard_14_step',
  linked_zones JSONB NOT NULL DEFAULT '[]'::jsonb,
  linked_locations JSONB NOT NULL DEFAULT '[]'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'all_members',
  color TEXT,
  icon TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_workspaces_proj ON design_workspaces(project_id);
CREATE INDEX IF NOT EXISTS idx_design_workspaces_org ON design_workspaces(organisation_id);

-- Alter designs table to ensure all new fields exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='workspace_id') THEN
    ALTER TABLE designs ADD COLUMN workspace_id UUID REFERENCES design_workspaces(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='design_code') THEN
    ALTER TABLE designs ADD COLUMN design_code TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='description') THEN
    ALTER TABLE designs ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='asset_type') THEN
    ALTER TABLE designs ADD COLUMN asset_type TEXT NOT NULL DEFAULT '2d_design';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='project_phase') THEN
    ALTER TABLE designs ADD COLUMN project_phase TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='discipline') THEN
    ALTER TABLE designs ADD COLUMN discipline TEXT NOT NULL DEFAULT 'staging';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='department') THEN
    ALTER TABLE designs ADD COLUMN department TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='owner_id') THEN
    ALTER TABLE designs ADD COLUMN owner_id UUID REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='owner_name') THEN
    ALTER TABLE designs ADD COLUMN owner_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='internal_reviewer_id') THEN
    ALTER TABLE designs ADD COLUMN internal_reviewer_id UUID REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='internal_reviewer_name') THEN
    ALTER TABLE designs ADD COLUMN internal_reviewer_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='client_reviewer_id') THEN
    ALTER TABLE designs ADD COLUMN client_reviewer_id UUID REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='client_reviewer_name') THEN
    ALTER TABLE designs ADD COLUMN client_reviewer_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='due_date') THEN
    ALTER TABLE designs ADD COLUMN due_date TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='priority') THEN
    ALTER TABLE designs ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='current_version_number') THEN
    ALTER TABLE designs ADD COLUMN current_version_number INTEGER NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='current_revision_code') THEN
    ALTER TABLE designs ADD COLUMN current_revision_code TEXT NOT NULL DEFAULT 'Rev A';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='current_status') THEN
    ALTER TABLE designs ADD COLUMN current_status TEXT NOT NULL DEFAULT 'draft';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='approval_purpose') THEN
    ALTER TABLE designs ADD COLUMN approval_purpose TEXT NOT NULL DEFAULT 'concept';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='confidentiality') THEN
    ALTER TABLE designs ADD COLUMN confidentiality TEXT NOT NULL DEFAULT 'internal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='client_visibility') THEN
    ALTER TABLE designs ADD COLUMN client_visibility BOOLEAN NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='tags') THEN
    ALTER TABLE designs ADD COLUMN tags JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='zones') THEN
    ALTER TABLE designs ADD COLUMN zones JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='locations') THEN
    ALTER TABLE designs ADD COLUMN locations JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='scope_package_ids') THEN
    ALTER TABLE designs ADD COLUMN scope_package_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='requirement_ids') THEN
    ALTER TABLE designs ADD COLUMN requirement_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='boq_item_ids') THEN
    ALTER TABLE designs ADD COLUMN boq_item_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='task_ids') THEN
    ALTER TABLE designs ADD COLUMN task_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='production_package_ids') THEN
    ALTER TABLE designs ADD COLUMN production_package_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='supplier_ids') THEN
    ALTER TABLE designs ADD COLUMN supplier_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='related_design_item_ids') THEN
    ALTER TABLE designs ADD COLUMN related_design_item_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='external_url') THEN
    ALTER TABLE designs ADD COLUMN external_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='is_archived') THEN
    ALTER TABLE designs ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designs' AND column_name='updated_at') THEN
    ALTER TABLE designs ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_designs_project ON designs(project_id);
CREATE INDEX IF NOT EXISTS idx_designs_workspace ON designs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_designs_code ON designs(design_code);
CREATE INDEX IF NOT EXISTS idx_designs_status ON designs(current_status);

-- Alter design_versions table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_versions' AND column_name='revision_code') THEN
    ALTER TABLE design_versions ADD COLUMN revision_code TEXT NOT NULL DEFAULT 'Rev A';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_versions' AND column_name='revision_description') THEN
    ALTER TABLE design_versions ADD COLUMN revision_description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_versions' AND column_name='uploaded_by_name') THEN
    ALTER TABLE design_versions ADD COLUMN uploaded_by_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_versions' AND column_name='is_locked') THEN
    ALTER TABLE design_versions ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_versions' AND column_name='addressed_comment_ids') THEN
    ALTER TABLE design_versions ADD COLUMN addressed_comment_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_versions' AND column_name='carried_forward_comment_ids') THEN
    ALTER TABLE design_versions ADD COLUMN carried_forward_comment_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_versions' AND column_name='rejected_comment_ids') THEN
    ALTER TABLE design_versions ADD COLUMN rejected_comment_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_versions' AND column_name='cost_impact_flag') THEN
    ALTER TABLE design_versions ADD COLUMN cost_impact_flag BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_versions' AND column_name='schedule_impact_flag') THEN
    ALTER TABLE design_versions ADD COLUMN schedule_impact_flag BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_versions' AND column_name='scope_impact_flag') THEN
    ALTER TABLE design_versions ADD COLUMN scope_impact_flag BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_versions' AND column_name='safety_impact_flag') THEN
    ALTER TABLE design_versions ADD COLUMN safety_impact_flag BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_versions' AND column_name='procurement_impact_flag') THEN
    ALTER TABLE design_versions ADD COLUMN procurement_impact_flag BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_versions' AND column_name='structural_engineer_signoff') THEN
    ALTER TABLE design_versions ADD COLUMN structural_engineer_signoff JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_versions' AND column_name='hse_signoff') THEN
    ALTER TABLE design_versions ADD COLUMN hse_signoff JSONB;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_design_versions_design ON design_versions(design_id);
CREATE INDEX IF NOT EXISTS idx_design_versions_num ON design_versions(design_id, version_number);

CREATE TABLE IF NOT EXISTS design_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES design_versions(id) ON DELETE CASCADE,
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  file_role TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  sha256_hash TEXT NOT NULL,
  processing_state TEXT NOT NULL DEFAULT 'ready',
  processing_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS preview_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES design_files(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES design_versions(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  asset_type TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  page_number INTEGER NOT NULL DEFAULT 1,
  width INTEGER,
  height INTEGER,
  format TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_pages_artboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES design_versions(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  page_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  width NUMERIC,
  height NUMERIC,
  scale TEXT,
  unit TEXT DEFAULT 'mm',
  preview_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES design_versions(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  name TEXT NOT NULL,
  view_type TEXT NOT NULL,
  camera_data JSONB NOT NULL,
  section_plane JSONB,
  author_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alter design_annotations table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='design_id') THEN
    ALTER TABLE design_annotations ADD COLUMN design_id UUID REFERENCES designs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='author_name') THEN
    ALTER TABLE design_annotations ADD COLUMN author_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='pin_number') THEN
    ALTER TABLE design_annotations ADD COLUMN pin_number INTEGER NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='x_percent') THEN
    ALTER TABLE design_annotations ADD COLUMN x_percent NUMERIC NOT NULL DEFAULT 50.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='y_percent') THEN
    ALTER TABLE design_annotations ADD COLUMN y_percent NUMERIC NOT NULL DEFAULT 50.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='video_timestamp_sec') THEN
    ALTER TABLE design_annotations ADD COLUMN video_timestamp_sec NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='three_d_coordinates') THEN
    ALTER TABLE design_annotations ADD COLUMN three_d_coordinates JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='geometry_type') THEN
    ALTER TABLE design_annotations ADD COLUMN geometry_type TEXT NOT NULL DEFAULT 'point';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='geometry_data') THEN
    ALTER TABLE design_annotations ADD COLUMN geometry_data JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='title') THEN
    ALTER TABLE design_annotations ADD COLUMN title TEXT NOT NULL DEFAULT 'Review Callout';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='discipline') THEN
    ALTER TABLE design_annotations ADD COLUMN discipline TEXT NOT NULL DEFAULT 'staging';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='priority') THEN
    ALTER TABLE design_annotations ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='status') THEN
    ALTER TABLE design_annotations ADD COLUMN status TEXT NOT NULL DEFAULT 'open';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='comment_type') THEN
    ALTER TABLE design_annotations ADD COLUMN comment_type TEXT NOT NULL DEFAULT 'general_comment';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='visibility') THEN
    ALTER TABLE design_annotations ADD COLUMN visibility TEXT NOT NULL DEFAULT 'internal_only';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='assignee_id') THEN
    ALTER TABLE design_annotations ADD COLUMN assignee_id UUID REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='assignee_name') THEN
    ALTER TABLE design_annotations ADD COLUMN assignee_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='due_date') THEN
    ALTER TABLE design_annotations ADD COLUMN due_date TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='resolved_at') THEN
    ALTER TABLE design_annotations ADD COLUMN resolved_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='resolved_by') THEN
    ALTER TABLE design_annotations ADD COLUMN resolved_by UUID REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='resolution_evidence') THEN
    ALTER TABLE design_annotations ADD COLUMN resolution_evidence TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_annotations' AND column_name='updated_at') THEN
    ALTER TABLE design_annotations ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS design_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID NOT NULL REFERENCES design_annotations(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  author_id UUID NOT NULL REFERENCES users(id),
  author_name TEXT NOT NULL,
  author_role TEXT,
  discipline TEXT,
  message TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'internal_only',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_review_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES design_versions(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  purpose TEXT NOT NULL,
  reviewers JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  instructions TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  decision TEXT,
  completion_date TIMESTAMPTZ,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES design_versions(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  requested_by UUID NOT NULL REFERENCES users(id),
  approval_purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_approval_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES design_approval_requests(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES design_versions(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  approver_id UUID NOT NULL REFERENCES users(id),
  approver_name TEXT NOT NULL,
  role TEXT NOT NULL,
  decision TEXT NOT NULL,
  approval_purpose TEXT NOT NULL,
  comments TEXT,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_hash TEXT NOT NULL,
  digital_acknowledgement BOOLEAN NOT NULL DEFAULT true,
  structural_certification JSONB,
  hse_certification JSONB,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_approval_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES design_approval_decisions(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES design_versions(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  condition_text TEXT NOT NULL,
  assigned_to UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  resolution_evidence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES design_versions(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  classification TEXT NOT NULL,
  estimated_cost_delta_qar NUMERIC NOT NULL DEFAULT 0,
  estimated_schedule_delta_days INTEGER NOT NULL DEFAULT 0,
  affected_requirement_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_scope_package_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_boq_item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_task_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  escalate_to_variation BOOLEAN NOT NULL DEFAULT false,
  linked_variation_id TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_number TEXT NOT NULL,
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES design_versions(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  release_purpose TEXT NOT NULL,
  issued_by UUID NOT NULL REFERENCES users(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  required_acknowledgement_date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  materials_and_finishes_notes TEXT,
  fabrication_notes TEXT,
  installation_notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  superseded_by_release_id TEXT,
  included_file_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_release_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES design_releases(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  recipient_name TEXT NOT NULL,
  organization TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT,
  adoption_status TEXT NOT NULL DEFAULT 'clarification_required',
  acknowledged_at TIMESTAMPTZ,
  notes TEXT,
  production_started BOOLEAN NOT NULL DEFAULT false,
  production_start_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_external_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token TEXT NOT NULL,
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  version_id UUID REFERENCES design_versions(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  require_otp BOOLEAN NOT NULL DEFAULT false,
  otp_hash TEXT,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_comment BOOLEAN NOT NULL DEFAULT true,
  can_approve BOOLEAN NOT NULL DEFAULT false,
  can_download BOOLEAN NOT NULL DEFAULT false,
  watermark_text TEXT,
  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  version_id TEXT,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  actor_id UUID REFERENCES users(id),
  actor_name TEXT NOT NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  sha256_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
