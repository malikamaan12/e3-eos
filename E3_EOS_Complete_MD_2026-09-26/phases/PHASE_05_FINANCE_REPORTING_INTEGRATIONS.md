# P05: Finance, integrations, final reports and closeout

**Version:** 1.0 | **Build phase, not event lifecycle stage**

**Dependencies:** P04  
**Outcome:** One event has reconciled financials, controlled client reporting and clearly owned external data feeds.  
**Primary modules:** M14, M15, M17 plus completed M16 results room  
**Accountable participants:** Finance owner, PM/reporting lead, marketing/ticketing owners, integration engineers and QA.

## 1. Phase boundary

P00-P05 can enter a controlled operational pilot only after applicable P07 security/recovery/UAT gates. Finance signs definitions and reconciliations; source owners sign connector or fallback behaviour.

All company thresholds, named approvers, country rules, report deadlines and project workflows remain configuration, not hard-coded defaults. Shared authority, policy, money, evidence and integration contracts apply. A phase cannot implement its own conflicting approval or cost-calculation engine.

## 2. Implementation backlog and acceptance

| Story ID | Work package | Developer implementation | Completion evidence |
|---|---|---|---|
| P05-ST01 | Financial source contract and controlled imports | Bind real ledger/HR source or verified reviewed import mappings; register external IDs and currency/tax basis. | No unknown ERP assumed; duplicate source records do not duplicate cost. |
| P05-ST02 | Actuals, accruals and commitment reconciliation | Match posted invoices, accepted unbilled costs, remaining commitments, deposits/retentions and allocations. | Worked 90,000 EAC example remains invariant after accrual converts to invoice. |
| P05-ST03 | Billing and settlement visibility | Map contract milestones to billing requests, ledger outcomes and collected/payment mirrors. | Delivered, invoiced, posted and collected stay separate; rejected ledger invoice never shows paid. |
| P05-ST04 | BookingQube and Metricool adapters | Activate verified read contracts or use reviewed imports; map event/session/campaign and observation definitions. | Unknown endpoints/plan access are not mocked as production success; freshness and source coverage visible. |
| P05-ST05 | Google collaboration adapters | Provide optional Calendar projection and Drive reference/import/export with chosen source authority. | External changes become proposals/conflicts; approved evidence frozen appropriately; no silent baseline overwrite. |
| P05-ST06 | Metric definitions and dashboards | Version metric formula, period, units, denominators and source; build scoped projections. | Entry versus unique visitor, approval timing and EAC calculations reconcile under comparable definitions. |
| P05-ST07 | Report builder and client results room | Generate controlled internal/client reports, evidence manifests, bilingual exports and exact-version publication. | Client bundle contains only permitted content; provisional data disclosed and later revisions retained. |
| P05-ST08 | Closure dimensions and lessons | Implement operational/acceptance/reporting/financial-review/settlement closure, reopen and reviewed knowledge reuse. | Receivable can remain open after operational closure; lesson does not auto-edit a master policy. |
| P05-ST09 | Full event reconciliation drill | Run onboarding through design/procurement/field/financial report with source outages and corrections. | PM, Finance and client-services reviewers accept the real source-to-report trace and exception register. |

## 3. Required screens and interactions

Financial position, cost/accrual/commitment matching, billing tracker, connector health/conflicts, metric definitions, report studio, client results room and closure checklist.

Every screen includes scoped loading/empty/error/permission/offline or stale-data states as relevant. Draft state and accepted state must be visibly different. Actions explain who can proceed and why a condition is unresolved. Client/internal separation is enforced by the API rather than hidden controls.

## 4. Data and migration work

Reconcile opening balances, source transaction uniqueness, PO allocation and outstanding receivables. Ledger remains statutory authority; no unreviewed double-entry migration.

Implement the phase's aggregate tables, indexes, constraints, row-scope tests, migration/backfill and import reconciliation defined in the shared data model. Mutable drafts use row versions; approved/posted records retain historical versions and correction records. No production schema push or database reset.

## 5. API surface and permissions

Base prefix: `/api/v1`. Implement and extend the versioned OpenAPI before accepting an endpoint. Critical payloads, concurrency, idempotency, error codes and current-authority checks are defined in the shared API contract.

| Endpoint | Permission |
|---|---|
| `POST /projects/{projectId}/cost-imports` | `finance.import` |
| `POST /projects/{projectId}/accruals` | `finance.accrue` |
| `POST /projects/{projectId}/cost-allocations` | `finance.allocate` |
| `POST /projects/{projectId}/billing-requests` | `finance.bill` |
| `POST /projects/{projectId}/reconciliations` | `finance.reconcile` |
| `GET /projects/{projectId}/financial-position` | `finance.read` |
| `POST /projects/{projectId}/metric-observations` | `metrics.record` |
| `POST /projects/{projectId}/reports` | `report.create` |
| `POST /projects/{projectId}/reports/{id}/publish` | `report.publish` |
| `POST /projects/{projectId}/closure-decisions` | `project.close` |
| `POST /projects/{projectId}/lessons` | `learning.record` |
| `GET /portfolio/metrics` | `portfolio.read` |
| `POST /connectors` | `integration.manage` |
| `POST /connectors/{id}/test` | `integration.test` |
| `POST /connectors/{id}/sync` | `integration.sync` |
| `GET /connectors/{id}/health` | `integration.read` |
| `POST /webhooks/{provider}/{accountId}` | `integration.webhook` |
| `POST /integration-conflicts/{id}/resolve` | `integration.resolve` |
| `POST /portfolio/scenarios` | `scenario.create` |
| `POST /portfolio/scenarios/{id}/apply` | `scenario.apply` |
| `GET /portfolio/rule-analytics` | `governance.read` |
| `POST /projects/{projectId}/ai-drafts` | `ai.request` |
| `POST /projects/{projectId}/ai-drafts/{id}/accept` | `ai.review` |

The module also needs ordinary permitted read/draft-edit companions with complete JSON schemas. No generic draft PATCH can set `approved`, `paid`, `permit_valid` or `ready_to_open`. Release actions use dedicated commands.

## 6. Mandatory phase test cases

Run all prior-phase regression tests plus these initial cases. Results must link to actual test files, CI run, commit and reviewer; listing a case is not evidence of a pass.

| ID | Scenario | Expected outcome |
|---|---|---|
| AT-066 | Worked accrual-to-invoice example | EAC remains 90,000 when 10,000 moves from accrued to actual; no double count. |
| AT-067 | Financial source file imported twice | Unique source identity rejects duplicate business effects; batch history retained. |
| AT-068 | Invoice quarantined by accounting ledger | EOS shows awaiting/rejected ledger status, not posted or paid. |
| AT-069 | Credit note/reversal arrives after final report | Corrective fact and report revision; original report/source manifest retained. |
| AT-070 | Allocation sum exceeds invoice line | Validation rejects or routes rounding discrepancy; no duplicated source expense. |
| AT-071 | Financial period/currency/FX rate differs | Source and reporting bases preserved; no silent addition of mixed currencies. |
| AT-072 | Provider webhook forged or replayed | Verify/dedupe/quarantine per actual contract; no unauthenticated state change. |
| AT-073 | BookingQube API unavailable/unverified | Validated import/manual aggregates used; no fabricated endpoint or false live metric. |
| AT-074 | Ticket entries and daily uniques aggregated | Definitions prevent repeat entries becoming unique visitors or invalid unique sums. |
| AT-075 | Metricool stale or plan lacks API | Connector disabled/provisional; source freshness disclosed and core operation unaffected. |
| AT-076 | Calendar event changed externally | Creates reconciliation/change proposal, not silent baseline rewrite. |
| AT-077 | Client report generated from internal data | Server-side audience projection and sensitive-field tests pass. |
| AT-078 | Operational project closed with receivable open | Operational closure allowed under policy; settlement remains open. |
| AT-079 | Report generated twice from frozen snapshot | Deterministic content/basis or documented generation metadata; no duplicate publication effect. |

## 7. Demonstration and UAT

Use one complete controlled event. Reconcile a partially invoiced PO, import a duplicate, simulate ledger rejection and ticketing outage, publish a redacted final report and close operations while collection remains open.

Use labelled synthetic data until the relevant E3 owner authorises a controlled pilot. A stakeholder walks the journey and checks the actual API/source record, not only a screenshot. Capture feedback as versioned backlog changes.

## 8. Explicit exclusions

No new general ledger, tax filing, autonomous financial approval, invented “audited” report label or ticketing checkout. Advanced AI and optimiser not required for core readiness.

## 9. Developer handover for this phase

Deliver migrations, API schemas/generated client, UI flows, permission and concurrency tests, effective policy fixtures, audit/events, feature flags, operational metrics, failure runbook and rollout/rollback notes. Record new dependencies/licences and updated external capability evidence. Provide a short phase closure note linking story IDs to commits and acceptance results.

## 10. References

- [Product/module contract](../specs/01_PRODUCT_MODULES_AND_UX.md)
- [Selected technical architecture](../specs/02_TECH_ARCHITECTURE_AND_ADRS.md)
- [Data and invariants](../specs/03_DATA_MODEL_AND_INVARIANTS.md)
- [Configuration and authority](../specs/04_CONFIGURATION_APPROVALS_AND_EXCEPTIONS.md)
- [API/event contract](../specs/05_API_AND_EVENT_CONTRACTS.md)
- [Integration and offline contract](../specs/06_INTEGRATIONS_AND_OFFLINE.md)
- [Security and operations](../specs/07_SECURITY_DEPLOYMENT_AND_RUNBOOKS.md)
- [Reporting/finance](../specs/08_REPORTING_FINANCE_AND_ANALYTICS.md)
- [Acceptance register](../specs/09_QA_ACCEPTANCE_AND_TRACEABILITY.md)
- [Decision and production gates](../specs/10_DECISIONS_RISKS_AND_GO_LIVE.md)
