-- ==============================================================================
-- E3-EOS Sprint 05 — Finance Reconciliation, Billing, Reporting, Client Results Room & Integrations Migration
-- ==============================================================================

-- 1. Supplier Invoices Table
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  vendor_id UUID NOT NULL,
  po_id UUID,
  invoice_number TEXT NOT NULL,
  invoice_date TIMESTAMP WITH TIME ZONE NOT NULL,
  received_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  currency TEXT NOT NULL DEFAULT 'QAR',
  amount_excluding_tax NUMERIC NOT NULL,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  payment_terms TEXT NOT NULL DEFAULT '30_days_net',
  status TEXT NOT NULL DEFAULT 'received',
  three_way_match_status TEXT NOT NULL DEFAULT 'pending',
  supporting_doc_uri TEXT,
  disputed_amount NUMERIC NOT NULL DEFAULT 0,
  approved_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  balance_remaining NUMERIC NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Supplier Invoice Lines Table
CREATE TABLE IF NOT EXISTS supplier_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  supplier_invoice_id UUID NOT NULL REFERENCES supplier_invoices(id),
  po_line_id UUID,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  match_exception_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Three-Way Matches Table
CREATE TABLE IF NOT EXISTS three_way_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  supplier_invoice_id UUID NOT NULL REFERENCES supplier_invoices(id),
  po_id UUID NOT NULL,
  receipt_id UUID,
  overall_match BOOLEAN NOT NULL,
  quantity_mismatch BOOLEAN NOT NULL DEFAULT false,
  rate_mismatch BOOLEAN NOT NULL DEFAULT false,
  tax_mismatch BOOLEAN NOT NULL DEFAULT false,
  duplicate_detected BOOLEAN NOT NULL DEFAULT false,
  exceeds_po_amount BOOLEAN NOT NULL DEFAULT false,
  service_unacknowledged BOOLEAN NOT NULL DEFAULT false,
  discrepancy_details JSONB,
  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Invoice OCR Extracts Table
CREATE TABLE IF NOT EXISTS invoice_ocr_extracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  file_hash TEXT NOT NULL,
  file_name TEXT NOT NULL,
  extracted_data JSONB NOT NULL,
  confidence_score NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'suggested',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Client Invoices Table
CREATE TABLE IF NOT EXISTS client_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  client_organisation_id UUID NOT NULL REFERENCES organisations(id),
  milestone_id UUID,
  contract_reference TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  billing_type TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'QAR',
  invoice_date TIMESTAMP WITH TIME ZONE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  gross_amount NUMERIC NOT NULL,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  retention_deduction NUMERIC NOT NULL DEFAULT 0,
  net_due_amount NUMERIC NOT NULL,
  collected_amount NUMERIC NOT NULL DEFAULT 0,
  outstanding_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  supporting_deliverables JSONB,
  issued_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. Payment Milestones Table
CREATE TABLE IF NOT EXISTS payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  milestone_code TEXT NOT NULL,
  milestone_name TEXT NOT NULL,
  percentage_of_contract NUMERIC NOT NULL,
  contractual_amount NUMERIC NOT NULL,
  planned_billing_date TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_billing_date TIMESTAMP WITH TIME ZONE,
  collection_status TEXT NOT NULL DEFAULT 'unbilled',
  evidence_requirements JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. Collections Table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  client_invoice_id UUID NOT NULL REFERENCES client_invoices(id),
  amount_received NUMERIC NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_reference TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  withholding_tax NUMERIC NOT NULL DEFAULT 0,
  deductions NUMERIC NOT NULL DEFAULT 0,
  disputed_balance NUMERIC NOT NULL DEFAULT 0,
  bank_account_id TEXT,
  recorded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. Project Cost Claims Table
CREATE TABLE IF NOT EXISTS project_cost_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  claimant_id UUID NOT NULL,
  claimant_name TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'QAR',
  receipt_uri TEXT,
  reason TEXT NOT NULL,
  cost_code TEXT NOT NULL DEFAULT 'COST-OPS-MISC',
  approval_status TEXT NOT NULL DEFAULT 'submitted',
  reimbursement_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 9. Exchange Rate Locks Table
CREATE TABLE IF NOT EXISTS exchange_rate_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  base_currency TEXT NOT NULL,
  transaction_currency TEXT NOT NULL,
  exchange_rate NUMERIC NOT NULL,
  rate_source TEXT NOT NULL DEFAULT 'Qatar Central Bank',
  rate_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 10. Tax Configurations Table
CREATE TABLE IF NOT EXISTS tax_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  jurisdiction_code TEXT NOT NULL,
  tax_name TEXT NOT NULL,
  tax_type TEXT NOT NULL,
  standard_rate_percent NUMERIC NOT NULL,
  reverse_charge_applicable BOOLEAN NOT NULL DEFAULT false,
  rules_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 11. Commercial Closeout Records Table
CREATE TABLE IF NOT EXISTS commercial_closeout_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  checklist_json JSONB NOT NULL,
  unmet_pillars_json JSONB NOT NULL,
  decision TEXT NOT NULL,
  final_gross_margin_percent TEXT NOT NULL,
  final_revenue NUMERIC NOT NULL,
  final_actual_cost NUMERIC NOT NULL,
  final_profit NUMERIC NOT NULL,
  audit_hash TEXT NOT NULL,
  signed_by TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 12. Month End Snapshots Table
CREATE TABLE IF NOT EXISTS month_end_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  period_key TEXT NOT NULL,
  contract_value NUMERIC NOT NULL,
  current_budget NUMERIC NOT NULL,
  committed_cost NUMERIC NOT NULL,
  actual_cost NUMERIC NOT NULL,
  eac NUMERIC NOT NULL,
  vac NUMERIC NOT NULL,
  margin_percent TEXT NOT NULL,
  billed_amount NUMERIC NOT NULL,
  collected_amount NUMERIC NOT NULL,
  receivables_amount NUMERIC NOT NULL,
  net_cash_exposure NUMERIC NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT true,
  snapshot_hash TEXT NOT NULL,
  locked_by TEXT NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 13. Client Results Rooms Table
CREATE TABLE IF NOT EXISTS client_results_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  project_overview_json JSONB NOT NULL,
  delivered_scope_json JSONB NOT NULL,
  curated_photos_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  attendance_metrics_json JSONB NOT NULL,
  executive_highlights_json JSONB NOT NULL,
  client_billing_status_json JSONB,
  server_redaction_verified BOOLEAN NOT NULL DEFAULT true,
  published_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 14. Post Event Reports Table
CREATE TABLE IF NOT EXISTS post_event_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  report_title TEXT NOT NULL,
  sections_json JSONB NOT NULL,
  is_finalized BOOLEAN NOT NULL DEFAULT false,
  finalized_at TIMESTAMP WITH TIME ZONE,
  finalized_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 15. Project KPIs Table
CREATE TABLE IF NOT EXISTS project_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  kpi_code TEXT NOT NULL,
  name TEXT NOT NULL,
  target_value TEXT NOT NULL,
  actual_value TEXT NOT NULL,
  measurement_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'measuring',
  evidence_reference TEXT,
  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 16. Client Feedback Records Table
CREATE TABLE IF NOT EXISTS client_feedback_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  client_representative TEXT NOT NULL,
  survey_method TEXT NOT NULL,
  overall_rating INTEGER NOT NULL,
  nps_score INTEGER,
  feedback_comments TEXT NOT NULL,
  client_signoff_uri TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 17. Lessons Learned Table
CREATE TABLE IF NOT EXISTS lessons_learned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  category TEXT NOT NULL,
  observation TEXT NOT NULL,
  root_cause TEXT NOT NULL,
  impact TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  reusable_across_projects BOOLEAN NOT NULL DEFAULT true,
  applicable_project_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  logged_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 18. Vendor Performance Evaluations Table
CREATE TABLE IF NOT EXISTS vendor_performance_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  vendor_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id),
  price_score INTEGER NOT NULL,
  quality_score INTEGER NOT NULL,
  delivery_score INTEGER NOT NULL,
  responsiveness_score INTEGER NOT NULL,
  hse_score INTEGER NOT NULL,
  average_score TEXT NOT NULL,
  evaluator_name TEXT NOT NULL,
  recommend_for_future_projects BOOLEAN NOT NULL DEFAULT true,
  narrative_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 19. Enterprise Connectors Table
CREATE TABLE IF NOT EXISTS enterprise_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  connector_type TEXT NOT NULL,
  connector_name TEXT NOT NULL,
  system_of_record_domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected',
  endpoint_url TEXT,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 60,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  records_processed INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 20. Reconciliation Exceptions Table
CREATE TABLE IF NOT EXISTS reconciliation_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  connector_id UUID NOT NULL REFERENCES enterprise_connectors(id),
  entity_type TEXT NOT NULL,
  external_id TEXT NOT NULL,
  eos_id TEXT,
  mismatch_type TEXT NOT NULL,
  external_payload TEXT NOT NULL,
  eos_payload TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  resolution_action TEXT,
  justification TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- Row-Level Security Enablement
-- ==============================================================================
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE three_way_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_ocr_extracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_cost_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rate_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_closeout_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE month_end_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_results_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_event_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_feedback_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons_learned ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_performance_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_exceptions ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- Tenant Isolation Policies
-- ==============================================================================
CREATE POLICY tenant_isolation_supplier_invoices ON supplier_invoices USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_supplier_invoice_lines ON supplier_invoice_lines USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_three_way_matches ON three_way_matches USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_invoice_ocr_extracts ON invoice_ocr_extracts USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_client_invoices ON client_invoices USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_payment_milestones ON payment_milestones USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_collections ON collections USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_project_cost_claims ON project_cost_claims USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_exchange_rate_locks ON exchange_rate_locks USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_tax_configurations ON tax_configurations USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_commercial_closeout_records ON commercial_closeout_records USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_month_end_snapshots ON month_end_snapshots USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_client_results_rooms ON client_results_rooms USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_post_event_reports ON post_event_reports USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_project_kpis ON project_kpis USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_client_feedback_records ON client_feedback_records USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_lessons_learned ON lessons_learned USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_vendor_performance_evaluations ON vendor_performance_evaluations USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_enterprise_connectors ON enterprise_connectors USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_reconciliation_exceptions ON reconciliation_exceptions USING (organisation_id = current_setting('app.current_tenant_id', true)::uuid);
