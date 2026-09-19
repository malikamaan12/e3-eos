-- Migration: 0009_scope_allocations_and_fulfilment.sql
-- Additive migration for Progressive Scope Phase 2

-- Add multi-dimensional tracking columns to requirements table
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS allocated_quantity NUMERIC;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS design_approved_quantity NUMERIC;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS released_quantity NUMERIC;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS produced_quantity NUMERIC;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS delivered_quantity NUMERIC;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS installed_quantity NUMERIC;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS accepted_quantity NUMERIC;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS allocation_status TEXT DEFAULT 'unallocated';
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS design_status TEXT DEFAULT 'required';
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS production_status TEXT DEFAULT 'not_released';
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS logistics_status TEXT DEFAULT 'pending';
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS installation_status TEXT DEFAULT 'not_started';

-- 1. Requirement Allocations
CREATE TABLE IF NOT EXISTS requirement_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  zone TEXT NOT NULL,
  location TEXT NOT NULL,
  sub_location TEXT,
  quantity NUMERIC NOT NULL,
  unit TEXT DEFAULT 'pcs',
  design_variant_id TEXT,
  required_date TIMESTAMPTZ,
  installation_date TIMESTAMPTZ,
  location_notes TEXT,
  status TEXT NOT NULL DEFAULT 'unassigned',
  responsible_team TEXT,
  completion_pct INTEGER NOT NULL DEFAULT 0,
  evidence_ref TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Design Packages
CREATE TABLE IF NOT EXISTS design_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  discipline TEXT,
  lead_designer_id UUID REFERENCES users(id),
  lead_designer_name TEXT,
  brief TEXT,
  specifications TEXT,
  materials TEXT,
  finishes TEXT,
  dimensions TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_progress',
  internal_approval BOOLEAN NOT NULL DEFAULT FALSE,
  client_approval BOOLEAN NOT NULL DEFAULT FALSE,
  production_release_status TEXT NOT NULL DEFAULT 'not_released',
  approved_quantity NUMERIC NOT NULL DEFAULT 0,
  released_quantity NUMERIC NOT NULL DEFAULT 0,
  linked_requirement_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  linked_allocation_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  comments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Design Variants
CREATE TABLE IF NOT EXISTS design_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_package_id UUID REFERENCES design_packages(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES requirements(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  code TEXT,
  dimensions TEXT,
  materials TEXT,
  finish TEXT,
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  quantity NUMERIC NOT NULL DEFAULT 0,
  approved_quantity NUMERIC NOT NULL DEFAULT 0,
  released_quantity NUMERIC NOT NULL DEFAULT 0,
  approval_status TEXT NOT NULL DEFAULT 'draft',
  production_release_status TEXT NOT NULL DEFAULT 'not_released',
  linked_allocation_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Fulfilment Items / BOM
CREATE TABLE IF NOT EXISTS fulfilment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  allocation_id UUID REFERENCES requirement_allocations(id) ON DELETE SET NULL,
  design_package_id UUID REFERENCES design_packages(id) ON DELETE SET NULL,
  design_variant_id UUID REFERENCES design_variants(id) ON DELETE SET NULL,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  item_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT DEFAULT 'pcs',
  classification TEXT NOT NULL DEFAULT 'make',
  material TEXT,
  department TEXT,
  responsible_owner_id UUID REFERENCES users(id),
  responsible_owner_name TEXT,
  supplier_id TEXT,
  boq_line_code TEXT,
  production_status TEXT NOT NULL DEFAULT 'not_started',
  qc_status TEXT NOT NULL DEFAULT 'pending',
  required_date TIMESTAMPTZ,
  notes TEXT,
  evidence TEXT,
  status TEXT NOT NULL DEFAULT 'draft_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Department Work Packages
CREATE TABLE IF NOT EXISTS department_work_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  responsible_owner_id UUID REFERENCES users(id),
  responsible_owner_name TEXT,
  supporting_department TEXT,
  supporting_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  approver_id UUID REFERENCES users(id),
  approver_name TEXT,
  start_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  dependency TEXT,
  deliverables TEXT,
  evidence_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Production Batches & Destination Lineage
CREATE TABLE IF NOT EXISTS production_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  batch_code TEXT NOT NULL,
  design_variant_id UUID REFERENCES design_variants(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  released_quantity NUMERIC NOT NULL,
  produced_quantity NUMERIC NOT NULL DEFAULT 0,
  qc_passed_quantity NUMERIC NOT NULL DEFAULT 0,
  delivered_quantity NUMERIC NOT NULL DEFAULT 0,
  installed_quantity NUMERIC NOT NULL DEFAULT 0,
  accepted_quantity NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
  fulfilment_item_id UUID REFERENCES fulfilment_items(id) ON DELETE SET NULL,
  allocation_id UUID REFERENCES requirement_allocations(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL,
  destination_zone TEXT,
  destination_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_req_alloc_req_id ON requirement_allocations(requirement_id);
CREATE INDEX IF NOT EXISTS idx_req_alloc_proj_id ON requirement_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_des_pkg_proj_id ON design_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_des_var_pkg_id ON design_variants(design_package_id);
CREATE INDEX IF NOT EXISTS idx_des_var_req_id ON design_variants(requirement_id);
CREATE INDEX IF NOT EXISTS idx_fulfilment_req_id ON fulfilment_items(requirement_id);
CREATE INDEX IF NOT EXISTS idx_fulfilment_alloc_id ON fulfilment_items(allocation_id);
CREATE INDEX IF NOT EXISTS idx_dept_wp_req_id ON department_work_packages(requirement_id);
CREATE INDEX IF NOT EXISTS idx_prod_batch_proj_id ON production_batches(project_id);
CREATE INDEX IF NOT EXISTS idx_prod_batch_items_batch ON production_batch_items(batch_id);
