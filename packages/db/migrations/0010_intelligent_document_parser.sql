-- Migration 0010: Intelligent RFP & Document Requirement Parser
-- Additive tables and columns for multi-pass parsing, 19 review queues, source provenance, and addenda comparison

-- 1. Extend document_parsing_jobs table
ALTER TABLE document_parsing_jobs
  ADD COLUMN IF NOT EXISTS parser_version VARCHAR(50) DEFAULT 'v3.0.0-neural-structured',
  ADD COLUMN IF NOT EXISTS model_provider VARCHAR(100) DEFAULT 'deterministic-structured',
  ADD COLUMN IF NOT EXISTS token_cost_metadata JSONB,
  ADD COLUMN IF NOT EXISTS structure_summary JSONB;

-- 2. Extend extraction_candidates table
ALTER TABLE extraction_candidates
  ADD COLUMN IF NOT EXISTS queue_type VARCHAR(50) DEFAULT 'master_scope_requirements',
  ADD COLUMN IF NOT EXISTS candidate_type VARCHAR(50) DEFAULT 'master_requirement',
  ADD COLUMN IF NOT EXISTS original_wording TEXT,
  ADD COLUMN IF NOT EXISTS source_provenance JSONB,
  ADD COLUMN IF NOT EXISTS field_attributions JSONB,
  ADD COLUMN IF NOT EXISTS confidence_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS suggested_allocations JSONB,
  ADD COLUMN IF NOT EXISTS unallocated_quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS design_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS client_approval_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fabrication_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS delivery_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS installation_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS missing_fields JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;

-- 3. Create extracted_document_blocks table
CREATE TABLE IF NOT EXISTS extracted_document_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES document_parsing_jobs(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  section_number TEXT,
  clause_number TEXT,
  sheet_name TEXT,
  table_id TEXT,
  slide_number INTEGER,
  block_type VARCHAR(50) NOT NULL,
  raw_text TEXT NOT NULL,
  bounding_box JSONB,
  extraction_method VARCHAR(50) DEFAULT 'deterministic_text',
  ocr_confidence NUMERIC(4, 3) DEFAULT 0.980,
  sequence_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extracted_document_blocks_job_id ON extracted_document_blocks(job_id);
CREATE INDEX IF NOT EXISTS idx_extracted_document_blocks_page ON extracted_document_blocks(job_id, page_number);

-- 4. Create document_comparisons table (Addenda Engine)
CREATE TABLE IF NOT EXISTS document_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prior_job_id TEXT,
  prior_document_name TEXT,
  new_job_id TEXT NOT NULL,
  new_document_name TEXT NOT NULL,
  change_type VARCHAR(50) NOT NULL,
  delta_data JSONB NOT NULL,
  review_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  applied_revision_id UUID REFERENCES requirement_revisions(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_comparisons_project_id ON document_comparisons(project_id);
