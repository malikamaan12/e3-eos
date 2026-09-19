-- Migration 0012: RFP & Document Intelligence Integration
-- Schema extensions for quantity comparators, bases, provenance spans, reviewer decision memory, and controlled publication batches

-- 1. Extend requirements table
ALTER TABLE requirements
  ADD COLUMN IF NOT EXISTS quantity_comparator VARCHAR(20) DEFAULT 'exact',
  ADD COLUMN IF NOT EXISTS quantity_basis VARCHAR(30) DEFAULT 'unspecified',
  ADD COLUMN IF NOT EXISTS source_evidence_spans JSONB DEFAULT '[]'::jsonb;

-- 2. Extend extraction_candidates table
ALTER TABLE extraction_candidates
  ADD COLUMN IF NOT EXISTS quantity_comparator VARCHAR(20) DEFAULT 'exact',
  ADD COLUMN IF NOT EXISTS quantity_basis VARCHAR(30) DEFAULT 'unspecified',
  ADD COLUMN IF NOT EXISTS source_evidence_spans JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS unresolved_issues JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS blocking_issues JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS proposed_action VARCHAR(50),
  ADD COLUMN IF NOT EXISTS modality VARCHAR(30) DEFAULT 'mandatory';

-- 3. Create parser_decision_memory table (Persistent Reviewer Memory across reruns)
CREATE TABLE IF NOT EXISTS parser_decision_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  candidate_signature TEXT NOT NULL,
  target_requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
  decision_action VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parser_decision_memory_project_sig ON parser_decision_memory(project_id, candidate_signature);

-- 4. Create scope_import_batches table (Controlled Publication & Idempotency)
CREATE TABLE IF NOT EXISTS scope_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'published' NOT NULL,
  published_requirement_ids JSONB DEFAULT '[]'::jsonb NOT NULL,
  published_allocation_ids JSONB DEFAULT '[]'::jsonb NOT NULL,
  published_evidence_links_count INTEGER DEFAULT 0 NOT NULL,
  published_revisions_count INTEGER DEFAULT 0 NOT NULL,
  published_by TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rollback_reason TEXT,
  rolled_back_at TIMESTAMPTZ,
  CONSTRAINT uq_scope_import_batches_idempotency UNIQUE(project_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_scope_import_batches_project_job ON scope_import_batches(project_id, job_id);
