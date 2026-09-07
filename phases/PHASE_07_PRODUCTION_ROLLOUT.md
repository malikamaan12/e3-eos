# P07: Migration, acceptance and production rollout

**Version:** 1.0 | **Build phase, not event lifecycle stage**

**Dependencies:** P00-P05; P06 features optional and flag-gated  
**Outcome:** A security-tested, reconciled release is accepted by named E3 owners with recovery and support evidence.  
**Primary modules:** All accepted release scope; P06 optional  
**Accountable participants:** E3 product/operations/Finance owners, technical lead, independent security reviewer, QA and support/DevOps.

## 1. Phase boundary

P07 is the formal production acceptance gate after P00-P05; P06 can be accepted later as a separate release through the same gate. Security and recovery work occurs throughout earlier phases, not only here.

All company thresholds, named approvers, country rules, report deadlines and project workflows remain configuration, not hard-coded defaults. Shared authority, policy, money, evidence and integration contracts apply. A phase cannot implement its own conflicting approval or cost-calculation engine.

## 2. Implementation backlog and acceptance

| Story ID | Work package | Developer implementation | Completion evidence |
|---|---|---|---|
| P07-ST01 | Traceability and scope review | Map every enabled feature to module/story/API/schema/test and explicit decision register. | No mock endpoints, silent TODO releases or hidden missing dependencies. |
| P07-ST02 | Security and authority assessment | Test portal/API/file/search/export isolation, privileged recovery, self-downgrade, signature tampering and replay. | Relevant critical/high exploitable findings fixed or affected feature excluded from release. |
| P07-ST03 | Production-like performance and device testing | Run declared concurrent users/tasks/BOQ/field payload envelope and provider degradation. | Measured targets or explicitly adjusted supported scope/capacity; no untested performance promises. |
| P07-ST04 | Restore/replay and continuity drill | Restore data/object manifests, recover queue intents, reconcile finance/reservations and test regional-outage assumptions. | Measured RPO/RTO and approved geography/continuity risk documented. |
| P07-ST05 | Migration rehearsal and source cutover | Reconcile real source IDs, open commitments/actuals, assets, bookings and publication access in approved scope. | Owners approve totals and source authority; rollback/compensation does not delete real external effects. |
| P07-ST06 | Role-based UAT and training | PM, design, procurement, warehouse, field, Finance, client and Super Admin complete representative journeys. | Operational owners demonstrate actual usage, exceptions and runbooks, not developer-only demo. |
| P07-ST07 | Controlled launch and monitoring | Enable accepted features/project cohort, monitor latency/queues/access/sync/finance and reconcile after release. | Named support coverage, escalation, secrets ownership, backups and alerts operational. |
| P07-ST08 | Handover and maintenance | Deliver source, infrastructure, actual OpenAPI, tests, licences, runbooks, migration evidence, account ownership and admin documentation. | E3 can configure workflows, export data, restore service and change developer without hidden credentials/dependencies. |

## 3. Required screens and interactions

Release readiness checklist, migration reconciliation, feature flags, support health and owner sign-off workspace. No new mandatory business features introduced at launch.

Every screen includes scoped loading/empty/error/permission/offline or stale-data states as relevant. Draft state and accepted state must be visibly different. Actions explain who can proceed and why a condition is unresolved. Client/internal separation is enforced by the API rather than hidden controls.

## 4. Data and migration work

Use rehearsed expand/backfill/validate/cutover with minimal agreed scope. Preserve legacy references and audit; no destructive reseeding. Verify authoritative writer boundaries after rollout.

Implement the phase's aggregate tables, indexes, constraints, row-scope tests, migration/backfill and import reconciliation defined in the shared data model. Mutable drafts use row versions; approved/posted records retain historical versions and correction records. No production schema push or database reset.

## 5. API surface and permissions

Base prefix: `/api/v1`. Implement and extend the versioned OpenAPI before accepting an endpoint. Critical payloads, concurrency, idempotency, error codes and current-authority checks are defined in the shared API contract.

| Endpoint | Permission |
|---|---|
| Shared existing endpoints | Validate the complete enabled release scope. |

The module also needs ordinary permitted read/draft-edit companions with complete JSON schemas. No generic draft PATCH can set `approved`, `paid`, `permit_valid` or `ready_to_open`. Release actions use dedicated commands.

## 6. Mandatory phase test cases

Run all prior-phase regression tests plus these initial cases. Results must link to actual test files, CI run, commit and reviewer; listing a case is not evidence of a pass.

| ID | Scenario | Expected outcome |
|---|---|---|
| AT-087 | Restore database and object manifests in isolated environment | Recovery targets measured; domain balances, approvals and references reconcile. |
| AT-088 | Rollback after external PO already sent | No deletion/reset; compensating business action and reconciled delivery state. |
| AT-089 | Production deployment contains mock data or placeholder connector success | Go-live blocked; only approved source records/configuration activated. |
| AT-090 | Large event load and dependency pressure | Agreed p95/queue freshness targets met or launch scope/capacity adjusted with evidence. |
| AT-091 | RLS/export/file/portal independent security assessment | No unresolved exploitable critical/high defects in accepted release scope. |
| AT-092 | Operational owner support drill | Named owners can use runbooks, reconcile failures and verify actual project closure. |

## 7. Demonstration and UAT

E3 owners run a complete approved pilot scenario and a failure drill themselves: provider timeout, wrong policy, offline attendance, duplicate invoice and report correction. Demonstrate recovery without fabricated approvals or missing financial history.

Use labelled synthetic data until the relevant E3 owner authorises a controlled pilot. A stakeholder walks the journey and checks the actual API/source record, not only a screenshot. Capture feedback as versioned backlog changes.

## 8. Explicit exclusions

No automatic activation of unfinished P06 features, unreviewed countries, unknown connectors or unresolved high-consequence security gaps.

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
