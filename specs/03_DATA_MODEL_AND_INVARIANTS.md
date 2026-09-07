# Domain data model, state contracts and invariants

**Version:** 1.0 | **Implementation:** PostgreSQL 17 + Drizzle; business rules enforced by application services and database constraints

## 1. Common record contract

Every business record has a stable opaque UUID, organisation scope, project/entity scope where relevant, creator, creation time, updater, integer row version, classification and provenance. Domain references use IDs, never display labels. Scope is derived from the authenticated membership and parent record, not trusted from arbitrary request fields.

Use `timestamptz` for instants and retain the originating IANA timezone. Use `date` for all-day business dates. A local time without timezone is not a valid submission deadline. Preserve captured-at, received-at and effective-at separately for offline/imported facts. Display both project and viewer timezone where ambiguity matters.

Use `numeric(24,6)` or an approved domain-specific precision for money, rates and quantities; currency is an ISO code, UOM a stable unit reference. API decimal values are strings. Use decimal arithmetic, not floating-point JavaScript money. Currency rounding and tax rules belong to approved effective configuration. Unknown value is null with knowledge status; an explicitly known zero remains a value.

Record envelopes distinguish `knowledge_status` (`unknown`, `assumed`, `requested`, `confirmed`, `not_applicable`) from business state. Business value confidence is not a probability unless explicitly defined. Typed custom fields reference a schema version and stable field ID. Sensitive values are not copied into generic audit diffs.

## 2. Entity inventory and ownership

| Domain | Principal tables/aggregates | Key relationships / constraints |
|---|---|---|
| Identity | users, sessions, external_accounts, memberships, invitations, role_definitions, permission_grants, delegations | Identity distinct from organisation/project membership. Service accounts are scoped actors, not human approvers. |
| Organisation | organisations, legal_entities, region_cells, countries, locales, calendars, tax_profiles | Historical entity/currency meaning survives reorganisations. Country metadata does not certify legal compliance. |
| Parties | parties, contacts, party_roles, client_authorities, vendor_profiles, vendor_documents | One party may be client and vendor; banking changes are separately controlled. |
| Portfolio | programmes, parent_agreements, agreement_allocations, projects, project_locations, project_roles, operating_periods, sessions | Unique project code per organisation; call-off consumption allocated atomically against parent ceiling. |
| Scope | requirements, source_references, applicability_decisions, assumptions, clarifications, risk_items, scope_changes | Every applicable requirement has an owner and linked deliverable or authorised disposition. |
| Work | workstreams, work_packages, task_instances, checklist_results, dependency_edges, milestones, baselines, forecast_versions | Baseline immutable; completed tasks remain distinct from acceptance records. |
| Workflow | stage_templates, template_versions, stage_instances, stage_memberships, workflow_edges, transition_records | Work can be remapped without changing its stable ID; repetition creates new instances. |
| Configuration | policy_sources, authored_deltas, policy_drafts, compiled_snapshots, active_policy_pointers, policy_conflicts, migration_plans, authority_policies | One active business snapshot per scope; protected authority remains current and independent. |
| Decisions | rule_evaluations, approval_requests, approval_steps, approval_decisions, authority_bases, exception_authorisations, exception_uses, exception_reviews | Exact target version/hash and actor; independence by user identity; single-use consumption unique. |
| Documents | documents, document_versions, file_objects, scan_results, annotations, transmittals, evidence_links, release_records | Object hash/version immutable after acceptance; restricted files cannot bypass publication checks. |
| Commercial | estimates, estimate_versions, boq_lines, line_components, unit_conversions, proposal_versions, contracts, contract_versions, budget_versions, variations, revenue_streams | Cost-side and sell-side projections share traceability, not exposure. Draft != accepted != authorised. |
| Procurement | rfqs, rfq_lines, vendor_offers, comparison_versions, purchase_requests, purchase_orders, purchase_order_versions, po_lines, acknowledgements, goods_receipts, service_acceptances | PO versions tied to authority basis and commitment entries. Issued != acknowledged != received. |
| Production | work_orders, material_requirements, material_issues, production_operations, production_checkpoints, rework_records | Released drawing version and inspection criteria attached to fabrication job. |
| Inventory | resource_catalogue, serial_assets, bulk_pools, stock_movements, reservations, asset_assignments, maintenance_holds, return_inspections, subrental_requests | Exclusive reservations cannot overlap; pooled bookings have locked capacity check. Returned != serviceable. |
| Crew/logistics | people, qualifications, availability, assignments, shifts, attendance_facts, attendance_adjustments, trip_plans, load_lists, delivery_slots, passes | Attendance facts cannot be erased by later roster edits; expired credentials block relevant future release only. |
| Compliance/live | obligations, permits, certificates, ram_documents, inspections, findings, snags, readiness_checks, opening_releases, run_sheets, incidents, corrective_actions, handovers | External approval identity/source, actual issue/expiry and affected scope retained. |
| Finance | source_transactions, cost_entries, accruals, commitment_entries, allocations, billing_requests, invoice_mirrors, payment_mirrors, reconciliations, period_closures | External transaction ID unique by provider/account/type; invoice/accrual/commitment matching prevents double count. |
| Reporting | metric_definitions, observations, metric_snapshots, report_templates, report_versions, supplier_evaluations, lessons, scenario_runs | Metric definition version and source freshness included; client report immutable once published. |
| Collaboration | comments, decisions_log, notifications, delivery_attempts, publications, publication_items, contributor_grants | A comment is never an approval. Published projection is explicit and narrow. |
| Infrastructure | outbox, inbox, jobs, idempotency_records, connector_accounts, sync_cursors, conflicts, offline_operations, audit_events, audit_manifests | Unique delivery identity; durable state in PostgreSQL, not only Redis. |

Tables may be consolidated where lifecycle and access are genuinely identical. Do not collapse all domain data into one untyped JSON document table. Keep approval/evidence cross-references type-safe through an `approvable_versions` registry or explicit FK tables, not dangling `(type,id)` text pairs.

## 3. Core state dimensions

| Dimension | Canonical values / behaviour |
|---|---|
| Project maturity | idea, developing, submitted, negotiating, authorised, delivering, closing, closed. Labels editable; mapping versioned. |
| Project outcome | undetermined, delivered, lost, withdrawn, cancelled. Do not infer from maturity alone. |
| Work state | planned, active, waiting, blocked, review, completed, cancelled, reopened. A historical transition records reopening. |
| Acceptance | not_required_with_basis, pending, accepted, rejected, conditional. Conditional includes unresolved conditions. |
| Requirement disposition | applicability_unknown, applicable_open, satisfied, exception_authorised, not_applicable, formally_amended, superseded. |
| Exception validity | draft, requested, authorised, rejected, consumed, expired, revoked. Temporal expiry also evaluated on execution. |
| Exception review | not_required_with_basis, open, in_review, remediation_required, closed. Independent from validity. |
| Reservation | tentative, held, confirmed, in_use, return_pending, released, cancelled. A hold consumes capacity until its valid expiry. |
| Release | draft, awaiting_authority, authorised_for_scope, execution_pending, executed, superseded, revoked_for_future_use. |
| Accounting mirror | unverified, submitted, accepted_by_ledger, posted, rejected, disputed, reversed. Payment has its own state. |

Do not use a single finance enum to say an entire project is simultaneously budgeted/paid/reconciled. These are separate records and dimensions. Display labels can change; canonical meanings require controlled migration, not silent relabelling.

## 4. Versioning and evidence

`DocumentVersion` stores content hash, object generation/key, MIME type, scan result, purpose, language and retention category. `ApprovalDecision` points at an immutable target version and purpose; it does not approve every future revision of a design package. The hash manifest includes significant transaction fields and relevant attachment versions, sorted/canonicalised server-side.

`PublicationItem` points to the exact approved public projection. Document change does not automatically republish. Comments/annotations use page/coordinate anchors and version IDs. Changing a drawing evaluates affected work orders, POs and site instructions; already built work is not pretended to have used the new drawing.

Accepted financial and evidence facts are corrected by adjustments/reversals with references, not overwritten. Draft edits use optimistic concurrency. Personal data has separate retention/disposal and access controls; “audit history” does not mean every personal field is copied forever.

## 5. Financial and scope allocations

An allocation links a source line to one or more work packages/BOQ lines. Store quantity basis, amount, currency, allocation method and approval version. Allocations must equal the source within approved rounding tolerance; a discrepancy is explicit. Do not allocate the full source amount to each package.

A PO amendment changes only the remaining authorised obligation plus any explicitly accepted retrospective adjustment. Receipts and invoices preserve their original source version and matching. A client variation changes contract/budget only when approved; pending exposure stays separate.

Parent programme aggregation counts child amounts once. Intercompany recharge elimination is an explicit report policy, not deletion of the original transaction. Management estimated margin is distinct from statutory recognised profit.

## 6. Reservation invariants and database enforcement

Exclusive resource bookings use half-open intervals `[start,end)` including preparation, transport, event use, return and serviceability buffer. Hard reservations must not overlap. PostgreSQL range exclusion constraints support this design (S12). The example below is an implementation pattern; production migration must add complete scope FKs, permissions and indexes.

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE reservation_locks (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL,
  resource_id uuid NOT NULL,
  project_id uuid NOT NULL,
  busy_window tstzrange NOT NULL,
  state text NOT NULL CHECK (state IN ('held','confirmed','in_use','released','cancelled')),
  CHECK (NOT isempty(busy_window) AND lower(busy_window) IS NOT NULL
         AND upper(busy_window) IS NOT NULL
         AND lower_inc(busy_window) AND NOT upper_inc(busy_window)),
  EXCLUDE USING gist (
    organisation_id WITH =, resource_id WITH =, busy_window WITH &&
  ) WHERE (state IN ('held','confirmed','in_use'))
);
```

Bulk pools require a locked aggregate-capacity algorithm, not the exclusive-asset constraint. Lock the pool/calendar resource, expire eligible holds transactionally, calculate overlapping committed demand, check usable supply and apply the booking in one transaction. Lock multiple pools in stable order. Quantity in repair/quarantine is not available. A favourable what-if simulation never constitutes a reservation. A return-pending asset stays unavailable until the actual return and required inspection establish serviceability. Passing the forecast return time cannot silently release physical custody; extend the relevant lock or flag downstream conflict and unmet demand. Confirmation and dispatch also check current custody, not only the planned time range.

No Super Admin can make a physical asset exist in two places. An authorised schedule change can release/replace/transfer a booking with visible consequences, or record unmet demand/subrental, not falsify availability.

## 7. Transaction boundaries

| Command | Required atomic work |
|---|---|
| Publish policy | Verify expected active version; validate conflicts/migration; create immutable snapshot; update pointer; append audit/outbox. |
| Decide approval | Verify identity, role, scope, distinct-person condition and target hash; append decision; update request; outbox. |
| Release PO | Lock PO/current authority/budget scope as needed; current-fact checks; consume exception if required; reserve commitment; record release; audit + outbox. |
| Confirm reservation | Lock relevant resources; fresh capacity/serviceability check; insert booking; record authority; audit + outbox. |
| Post imported cost | Deduplicate provider record; validate allocations; update matching/accrual reversals; append source/cost facts; audit. |
| Publish report | Freeze accepted source snapshot/manifest; authorise target audience; create projection; audit + outbox. |
| Apply offline batch | Per operation: dedupe, validate current permissions/revision, retain captured fact or conflict, store result. Do not roll back unrelated accepted operations. |

Remote API calls do not run inside an open database transaction. Commit a durable intent, deliver asynchronously, reconcile outcome. Database deadlocks/serialization failures have bounded safe retries. Ambiguous remote delivery uses status reconciliation, not blind resending.

## 8. Scope, RLS and indexing

Foreign keys for scoped parent-child data should use composite uniqueness such as `(organisation_id,id)` so a valid ID cannot silently point across organisations. Include project scope when a child must belong to the same project. App-layer authorisation enforces finer project/field/audience grants. Use PostgreSQL RLS as defence in depth, not the sole policy engine. Application roles must not be table owners or have BYPASSRLS; understand owner bypass and FORCE RLS semantics (S11).

Use transaction-scoped `set_config` for verified organisation context on pooled connections; reset with transaction end. Never accept a user-provided tenant header as authority. Background jobs acquire a scoped execution context. Migration/admin database roles are separate and unavailable to the application.

Index common scopes and queries: `(organisation_id,project_id,state,due_at)`, source identity, open approvals by assignee, document version, active reservations, timestamped observations and unsent outbox. Paginate with stable cursors; no unbounded list endpoints. JSONB GIN indexes are selective, not applied indiscriminately to every custom field. Keep archival/report read models rebuildable from authoritative records.

## 9. Migration contract

Every migration is reviewed SQL, tested on representative snapshots and applied by a one-shot release identity. Use expand/backfill/validate/contract across compatible releases. No `drizzle-kit push` against production, no destructive reset and no synthetic production records to satisfy tests.

Map old IDs and references in an import registry. Preserve originals, provenance and verification status. Imported “approved” cells without decision evidence do not become verified approvals. Reconcile opening commitments, actuals, outstanding invoices, existing reservations and stock condition before cutover. Retain unresolved discrepancies with owners and signed acceptance instead of forcing balances to match.
