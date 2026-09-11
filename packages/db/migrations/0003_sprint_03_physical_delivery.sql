-- ==============================================================================
-- E3-EOS Sprint 03 — Physical Delivery Control & RLS Migration
-- ==============================================================================

-- 1. Vendors Enhancement
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS trading_name TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vendor_type TEXT NOT NULL DEFAULT 'company';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'Qatar';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_persons JSONB DEFAULT '[]'::jsonb;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS brands JSONB DEFAULT '[]'::jsonb;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS commercial_registration TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS tax_vat_number TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS insurance TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS licences JSONB DEFAULT '[]'::jsonb;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rating TEXT DEFAULT '4.5';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS qualification_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS restricted_bank_details JSONB;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS risk_flags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS onboarding_stage TEXT DEFAULT 'completed';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS projects_used JSONB DEFAULT '[]'::jsonb;


-- 2. Procurement Requirements
CREATE TABLE IF NOT EXISTS procurement_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  requirement_code TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'boq_line',
  boq_line_id UUID,
  requirement_id UUID,
  design_package_id UUID,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'units',
  required_on_site_date TIMESTAMP WITH TIME ZONE NOT NULL,
  procurement_lead_time_days TEXT NOT NULL DEFAULT '14',
  required_delivery_location TEXT NOT NULL,
  technical_specification TEXT,
  preferred_vendor_id UUID REFERENCES vendors(id),
  procurement_owner_id UUID REFERENCES users(id),
  estimated_cost TEXT NOT NULL DEFAULT '0',
  approved_budget TEXT NOT NULL DEFAULT '0',
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT NOT NULL DEFAULT 'medium',
  source_decision TEXT NOT NULL DEFAULT 'buy',
  internal_asset_quantity TEXT NOT NULL DEFAULT '0',
  external_sourcing_quantity TEXT NOT NULL DEFAULT '0',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. RFQs
CREATE TABLE IF NOT EXISTS rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  rfq_number TEXT NOT NULL,
  procurement_requirement_id UUID NOT NULL REFERENCES procurement_requirements(id),
  issue_date TIMESTAMP WITH TIME ZONE NOT NULL,
  closing_date TIMESTAMP WITH TIME ZONE NOT NULL,
  invited_vendor_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  technical_specification TEXT NOT NULL,
  quantity TEXT NOT NULL,
  delivery_requirement TEXT NOT NULL,
  commercial_terms TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'issued',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Vendor Quotes
CREATE TABLE IF NOT EXISTS vendor_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  quote_reference TEXT NOT NULL,
  unit_rate TEXT NOT NULL,
  total_price TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'QAR',
  delivery_time_days TEXT NOT NULL,
  payment_terms TEXT NOT NULL,
  warranty TEXT NOT NULL,
  technical_compliance TEXT NOT NULL,
  exclusions TEXT,
  validity_days TEXT NOT NULL DEFAULT '30',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  clarifications TEXT,
  technical_score TEXT,
  commercial_score TEXT,
  risk_score TEXT,
  total_score TEXT,
  is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Purchase Orders Extension
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS rfq_id UUID REFERENCES rfqs(id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS procurement_requirement_id UUID REFERENCES procurement_requirements(id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS subtotal TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tax TEXT DEFAULT '0';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivery_location TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES users(id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);

-- 6. Production Packages
CREATE TABLE IF NOT EXISTS production_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  package_code TEXT NOT NULL,
  vendor_id UUID,
  linked_requirement_id UUID,
  approved_design_revision_id UUID,
  boq_line_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  title TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  completed_quantity INTEGER NOT NULL DEFAULT 0,
  material TEXT NOT NULL,
  finish TEXT,
  production_owner_id UUID NOT NULL REFERENCES users(id),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  required_completion_date TIMESTAMP WITH TIME ZONE NOT NULL,
  delivery_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_released',
  fabrication_released_at TIMESTAMP WITH TIME ZONE,
  fabrication_released_by UUID REFERENCES users(id),
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. Quality Inspections & Snags
CREATE TABLE IF NOT EXISTS quality_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  package_id UUID NOT NULL REFERENCES production_packages(id),
  item_id TEXT,
  inspector_id UUID NOT NULL REFERENCES users(id),
  inspection_date TIMESTAMP WITH TIME ZONE NOT NULL,
  inspection_type TEXT NOT NULL,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  result TEXT NOT NULL DEFAULT 'passed',
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS snags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  package_id UUID REFERENCES production_packages(id),
  inspection_id UUID REFERENCES quality_inspections(id),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'minor',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES users(id),
  due_date TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  blocks_dispatch BOOLEAN NOT NULL DEFAULT FALSE,
  blocks_readiness BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. Multi-Warehouse & Assets
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  warehouse_code TEXT NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Qatar',
  city TEXT NOT NULL DEFAULT 'Doha',
  address TEXT NOT NULL,
  zones JSONB NOT NULL DEFAULT '["AV", "Lighting", "Scenic", "Furniture", "Games", "Branding", "Tools", "Consumables", "Quarantine", "Returns"]'::jsonb,
  capacity TEXT NOT NULL DEFAULT '10,000 sq m',
  manager_id UUID REFERENCES users(id),
  operating_hours TEXT NOT NULL DEFAULT '07:00 - 19:00',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  asset_tag TEXT NOT NULL,
  barcode TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'units',
  ownership TEXT NOT NULL DEFAULT 'e3_owned',
  warehouse_id UUID REFERENCES warehouses(id),
  zone TEXT NOT NULL DEFAULT 'General',
  location TEXT NOT NULL DEFAULT 'Bay 01',
  condition TEXT NOT NULL DEFAULT 'serviceable',
  availability TEXT NOT NULL DEFAULT 'available',
  purchase_value TEXT NOT NULL DEFAULT '0',
  replacement_value TEXT NOT NULL DEFAULT '0',
  maintenance_status TEXT NOT NULL DEFAULT 'Up to date',
  last_inspection_date TIMESTAMP WITH TIME ZONE,
  next_inspection_date TIMESTAMP WITH TIME ZONE,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  asset_id UUID NOT NULL REFERENCES assets(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  procurement_requirement_id UUID,
  boq_line_id UUID,
  allocated_quantity INTEGER NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouse_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  asset_id UUID NOT NULL REFERENCES assets(id),
  source TEXT NOT NULL,
  destination TEXT NOT NULL,
  movement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT NOT NULL DEFAULT 'good',
  project_id UUID REFERENCES projects(id),
  evidence_uris JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_id UUID NOT NULL REFERENCES users(id),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 9. Logistics & Transport
CREATE TABLE IF NOT EXISTS packing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  packing_list_number TEXT NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id),
  destination TEXT NOT NULL,
  vehicle_id TEXT,
  driver_id UUID REFERENCES users(id),
  dispatch_date TIMESTAMP WITH TIME ZONE NOT NULL,
  required_arrival TIMESTAMP WITH TIME ZONE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  delivery_proof JSONB,
  dispatched_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logistics_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  vehicle_id TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT '7 Ton',
  supplier TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  driver_phone TEXT NOT NULL,
  load_description TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
  arrival_time TIMESTAMP WITH TIME ZONE NOT NULL,
  access_slot TEXT NOT NULL DEFAULT 'Slot A',
  permit_number TEXT,
  loading_dock TEXT NOT NULL DEFAULT 'Dock 01',
  contact_person TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 10. Crew Scheduling
CREATE TABLE IF NOT EXISTS crew_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  person_name TEXT NOT NULL,
  employer TEXT NOT NULL DEFAULT 'E3 Live Operations',
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  shift_id UUID,
  location TEXT NOT NULL,
  supervisor_name TEXT,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  accreditation TEXT NOT NULL DEFAULT 'Verified Site Pass',
  permit TEXT,
  certification TEXT,
  personnel_type TEXT NOT NULL DEFAULT 'e3_employee',
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 11. Site Operations & Reports
CREATE TABLE IF NOT EXISTS daily_site_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  report_date TEXT NOT NULL,
  work_completed TEXT NOT NULL,
  work_delayed TEXT NOT NULL DEFAULT 'None',
  manpower_count TEXT NOT NULL DEFAULT '0',
  equipment_active TEXT NOT NULL DEFAULT 'All operational',
  deliveries_received TEXT NOT NULL DEFAULT 'All cleared',
  incidents_occurred TEXT NOT NULL DEFAULT 'Zero incidents',
  snags_identified TEXT NOT NULL DEFAULT 'None',
  client_instructions TEXT NOT NULL DEFAULT 'None',
  weather_conditions TEXT NOT NULL DEFAULT 'Clear, 28°C',
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  tomorrow_plan TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  is_immutable BOOLEAN NOT NULL DEFAULT TRUE,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS installation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  package_id UUID,
  asset_id UUID,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_delivered',
  evidence_uris JSONB NOT NULL DEFAULT '[]'::jsonb,
  installer_notes TEXT,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 12. Operational Readiness Gate & Opening Authorizations
CREATE TABLE IF NOT EXISTS operational_readiness_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  overall_status TEXT NOT NULL DEFAULT 'NOT_READY',
  overall_score_percent TEXT NOT NULL DEFAULT '0',
  dimension_checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  critical_blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
  exceptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  eligible_for_opening_review BOOLEAN NOT NULL DEFAULT FALSE,
  can_open BOOLEAN NOT NULL DEFAULT FALSE,
  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opening_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  authorized_by TEXT NOT NULL,
  authorized_role TEXT NOT NULL,
  authorized_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  readiness_status TEXT NOT NULL,
  readiness_score_percent TEXT NOT NULL,
  exceptions_acknowledged JSONB NOT NULL DEFAULT '[]'::jsonb,
  justification TEXT,
  dual_signoff_by TEXT,
  dual_signoff_at TIMESTAMP WITH TIME ZONE,
  audit_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE warehouse_movements ADD COLUMN IF NOT EXISTS notes TEXT;

-- 13. Enable Row-Level Security
ALTER TABLE procurement_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE snags ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_site_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_readiness_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_authorizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_procurement_requirements ON procurement_requirements USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_rfqs ON rfqs USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_vendor_quotes ON vendor_quotes USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_production_packages ON production_packages USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_quality_inspections ON quality_inspections USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_snags ON snags USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_warehouses ON warehouses USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_assets ON assets USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_asset_allocations ON asset_allocations USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_warehouse_movements ON warehouse_movements USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_packing_lists ON packing_lists USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_logistics_plans ON logistics_plans USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_crew_assignments ON crew_assignments USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_daily_site_reports ON daily_site_reports USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_installation_items ON installation_items USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_operational_readiness_gates ON operational_readiness_gates USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_opening_authorizations ON opening_authorizations USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);

