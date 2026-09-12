-- ==============================================================================
-- E3-EOS Sprint 04 — Live Operations, Compliance, Offline Field Execution & Closeout Migration
-- ==============================================================================

-- 1. Worker Qualifications Enhancements
ALTER TABLE worker_qualifications ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP WITH TIME ZONE;
ALTER TABLE worker_qualifications ADD COLUMN IF NOT EXISTS issuing_body TEXT;
ALTER TABLE worker_qualifications ADD COLUMN IF NOT EXISTS verification_evidence TEXT;
ALTER TABLE worker_qualifications ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Crew Attendance Enhancements
ALTER TABLE crew_attendance ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE crew_attendance ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES users(id);
ALTER TABLE crew_attendance ADD COLUMN IF NOT EXISTS qualifications_checked BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE crew_attendance ADD COLUMN IF NOT EXISTS fatigue_warning_acknowledged BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE crew_attendance ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Incident Records Enhancements
ALTER TABLE incident_records ADD COLUMN IF NOT EXISTS incident_number TEXT;
ALTER TABLE incident_records ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'safety';
ALTER TABLE incident_records ADD COLUMN IF NOT EXISTS zone TEXT;
ALTER TABLE incident_records ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE incident_records ADD COLUMN IF NOT EXISTS protective_actions JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE incident_records ADD COLUMN IF NOT EXISTS injuries_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE incident_records ADD COLUMN IF NOT EXISTS hospital_transport_required BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE incident_records ADD COLUMN IF NOT EXISTS venue_evacuation_initiated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE incident_records ADD COLUMN IF NOT EXISTS requires_regulatory_reporting BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE incident_records ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE incident_records ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id);
ALTER TABLE incident_records ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE incident_records ADD COLUMN IF NOT EXISTS root_cause TEXT;

-- 4. Venue Handover Records Enhancements
ALTER TABLE venue_handover_records ADD COLUMN IF NOT EXISTS signoff_by TEXT;
ALTER TABLE venue_handover_records ADD COLUMN IF NOT EXISTS signoff_role TEXT;
ALTER TABLE venue_handover_records ADD COLUMN IF NOT EXISTS keys_returned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE venue_handover_records ADD COLUMN IF NOT EXISTS punch_list_items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE venue_handover_records ADD COLUMN IF NOT EXISTS client_representative_name TEXT;
ALTER TABLE venue_handover_records ADD COLUMN IF NOT EXISTS client_signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE venue_handover_records ADD COLUMN IF NOT EXISTS audit_hash TEXT;

-- 5. Compliance Obligations Table
CREATE TABLE IF NOT EXISTS compliance_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  authority_type TEXT NOT NULL,
  title TEXT NOT NULL,
  permit_reference TEXT NOT NULL,
  issue_date TIMESTAMP WITH TIME ZONE,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  applicable_zone TEXT NOT NULL,
  critical_for_opening BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active',
  verification_mode TEXT NOT NULL DEFAULT 'digital_upload',
  physical_verification JSONB,
  audit_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. Live Run Sheet Items Table
CREATE TABLE IF NOT EXISTS live_run_sheet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  cue_number TEXT NOT NULL,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  planned_start TIMESTAMP WITH TIME ZONE NOT NULL,
  planned_end TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  dependent_on_cues JSONB NOT NULL DEFAULT '[]'::jsonb,
  responsible_person TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. Maintenance Records Table
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  fault_reference TEXT NOT NULL,
  asset_id TEXT,
  zone TEXT NOT NULL,
  fault_description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  reported_by UUID NOT NULL REFERENCES users(id),
  reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  technician_assigned TEXT,
  status TEXT NOT NULL DEFAULT 'reported',
  action_taken TEXT,
  parts_replaced JSONB NOT NULL DEFAULT '[]'::jsonb,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. Client Requests Table
CREATE TABLE IF NOT EXISTS client_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  request_reference TEXT NOT NULL,
  description TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'verbal',
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  scope_category TEXT NOT NULL DEFAULT 'snag',
  commercial_implication BOOLEAN NOT NULL DEFAULT false,
  estimated_cost INTEGER NOT NULL DEFAULT 0,
  client_approved_cost INTEGER,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'logged',
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 9. Shift Handovers Table
CREATE TABLE IF NOT EXISTS shift_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  outgoing_lead_id UUID NOT NULL REFERENCES users(id),
  incoming_lead_id UUID NOT NULL REFERENCES users(id),
  handover_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  zone TEXT NOT NULL,
  pending_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  safety_briefing TEXT NOT NULL,
  crowd_status TEXT NOT NULL,
  equipment_status TEXT NOT NULL,
  handover_notes TEXT,
  acknowledged_by_incoming BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 10. Zone Readiness Nodes Table
CREATE TABLE IF NOT EXISTS zone_readiness_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  zone_name TEXT NOT NULL,
  department TEXT NOT NULL,
  technical_pass BOOLEAN NOT NULL DEFAULT false,
  safety_pass BOOLEAN NOT NULL DEFAULT false,
  aesthetic_pass BOOLEAN NOT NULL DEFAULT false,
  compliance_pass BOOLEAN NOT NULL DEFAULT false,
  inspector_id UUID NOT NULL REFERENCES users(id),
  inspected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'not_ready',
  snags JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 11. Bump-Out Activities Table
CREATE TABLE IF NOT EXISTS bump_out_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  zone_name TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  planned_completion TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_completion TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled',
  safety_signoff_by UUID REFERENCES users(id),
  safety_signoff_at TIMESTAMP WITH TIME ZONE,
  assets_cleared BOOLEAN NOT NULL DEFAULT false,
  hazards_identified TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 12. Asset Return Inspections Table
CREATE TABLE IF NOT EXISTS asset_return_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  asset_id TEXT NOT NULL,
  manifest_id TEXT NOT NULL,
  condition_received TEXT NOT NULL DEFAULT 'pristine',
  damage_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  repair_cost_estimate INTEGER NOT NULL DEFAULT 0,
  responsibility TEXT NOT NULL DEFAULT 'venue',
  notes TEXT,
  inspected_by UUID NOT NULL REFERENCES users(id),
  inspected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 13. Claims Exposures Table
CREATE TABLE IF NOT EXISTS claims_exposures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  claim_type TEXT NOT NULL,
  description TEXT NOT NULL,
  claimed_amount INTEGER NOT NULL DEFAULT 0,
  assessed_exposure INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  settled_amount INTEGER,
  settlement_notes TEXT,
  logged_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 14. Operational Closure Decisions Table
CREATE TABLE IF NOT EXISTS operational_closure_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  decision TEXT NOT NULL,
  checklist JSONB NOT NULL,
  open_receivables_acknowledged BOOLEAN NOT NULL DEFAULT true,
  signoff_by TEXT NOT NULL,
  signoff_role TEXT NOT NULL,
  audit_hash TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 15. Enable Row-Level Security
ALTER TABLE compliance_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_run_sheet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_readiness_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bump_out_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_return_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims_exposures ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_closure_decisions ENABLE ROW LEVEL SECURITY;

-- 16. Tenant Isolation Policies
CREATE POLICY tenant_isolation_compliance_obligations ON compliance_obligations USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_live_run_sheet_items ON live_run_sheet_items USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_maintenance_records ON maintenance_records USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_client_requests ON client_requests USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_shift_handovers ON shift_handovers USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_zone_readiness_nodes ON zone_readiness_nodes USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_bump_out_activities ON bump_out_activities USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_asset_return_inspections ON asset_return_inspections USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_claims_exposures ON claims_exposures USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_operational_closure_decisions ON operational_closure_decisions USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
