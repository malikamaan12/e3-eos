# P04: Crew, logistics, readiness and live field operations

**Version:** 1.0 | **Build phase, not event lifecycle stage**

**Dependencies:** P03  
**Outcome:** E3 can prepare, open, operate and dismantle an event with mobile evidence and bounded offline behaviour.  
**Primary modules:** M11, M12, M13; deeper M04/M10/M18  
**Accountable participants:** Operations PM, logistics/warehouse, HR, HSE/quality, field supervisors and mobile/QA engineers.

## 1. Phase boundary

HSE/Operations approve readiness semantics and contingency. All offline/revocation/critical-condition tests pass on actual target device families.

All company thresholds, named approvers, country rules, report deadlines and project workflows remain configuration, not hard-coded defaults. Shared authority, policy, money, evidence and integration contracts apply. A phase cannot implement its own conflicting approval or cost-calculation engine.

## 2. Implementation backlog and acceptance

| Story ID | Work package | Developer implementation | Completion evidence |
|---|---|---|---|
| P04-ST01 | Crew availability and qualifications | Import/source credentials, manage roles/skills and plan shifts using reviewed jurisdiction/entity calendars. | Current qualifications and roster conflicts visible; no unreviewed statutory payroll rate hard-coded. |
| P04-ST02 | Attendance and labour evidence | Capture actual attendance and adjustments; retain source time and reviewer. | Later roster/HR changes produce conflict review, not deletion of actual attendance evidence. |
| P04-ST03 | Trips, loads and access | Plan transport, loading lists, delivery slots, credentials, venue access, bump-in/install and bump-out. | Resource windows include preparation/transport/return inspection and show cross-project impact. |
| P04-ST04 | Compliance and document applicability | Register permits/certificates/RAMS, issuer/source, actual issue/expiry, applicable scope and reviewed alternatives. | Missing upload differs from absent approval; later-issued evidence cannot appear pre-existing. |
| P04-ST05 | Quality and readiness | Implement inspection/snag/rectification, rehearsal/test records and scoped ready-to-open release. | One unresolved critical condition blocks affected release even when task completion is high. |
| P04-ST06 | Field PWA and offline queue | Implement assigned-work bundle, Dexie capture queue, media upload, per-operation sync and current-authority reconciliation. | Offline notes/observations retained; no offline purchase/policy/permit approval authority. |
| P04-ST07 | Live command centre | Build run sheets, shift logs, incidents, maintenance, client requests, protective actions and handovers. | Sensitive incident details restricted; stop-work capture does not wait for routine approval. |
| P04-ST08 | Bump-out and return condition | Record removal, venue handover, return inspections, missing/damaged goods and claims. | Operationally delivered is not assumed fully returned/financially settled. |
| P04-ST09 | Actual device and connectivity drills | Test iOS/Android, low bandwidth, storage eviction, revoked user and incomplete media upload. | Operations accepts explicit offline limits and manual contingency; pending evidence not falsely accepted. |

## 3. Required screens and interactions

Crew planner, qualification cards, shift/attendance screen, load plan, venue slot calendar, obligation register, readiness matrix, command centre and field home/sync queue.

Every screen includes scoped loading/empty/error/permission/offline or stale-data states as relevant. Draft state and accepted state must be visibly different. Actions explain who can proceed and why a condition is unresolved. Client/internal separation is enforced by the API rather than hidden controls.

## 4. Data and migration work

Import minimum worker/qualification and operational records under privacy approval. No bulk copies of HR/identity files into offline storage. Verify current asset custody and venue access windows.

Implement the phase's aggregate tables, indexes, constraints, row-scope tests, migration/backfill and import reconciliation defined in the shared data model. Mutable drafts use row versions; approved/posted records retain historical versions and correction records. No production schema push or database reset.

## 5. API surface and permissions

Base prefix: `/api/v1`. Implement and extend the versioned OpenAPI before accepting an endpoint. Critical payloads, concurrency, idempotency, error codes and current-authority checks are defined in the shared API contract.

| Endpoint | Permission |
|---|---|
| `GET /resources/availability` | `resource.read` |
| `POST /projects/{projectId}/reservations` | `resource.request` |
| `POST /projects/{projectId}/reservations/{id}/confirm` | `resource.confirm` |
| `POST /projects/{projectId}/reservations/{id}/release` | `resource.release` |
| `POST /projects/{projectId}/asset-movements` | `inventory.move` |
| `POST /resources/{id}/maintenance-holds` | `inventory.maintain` |
| `POST /projects/{projectId}/return-inspections` | `inventory.inspect` |
| `POST /projects/{projectId}/subrental-requests` | `resource.request` |
| `POST /projects/{projectId}/crew-assignments` | `crew.assign` |
| `POST /projects/{projectId}/shifts` | `crew.plan` |
| `POST /projects/{projectId}/attendance` | `crew.capture` |
| `POST /projects/{projectId}/trips` | `logistics.plan` |
| `POST /projects/{projectId}/delivery-slots` | `logistics.plan` |
| `POST /projects/{projectId}/obligations` | `compliance.manage` |
| `POST /projects/{projectId}/permits` | `compliance.record` |
| `POST /projects/{projectId}/inspections` | `quality.inspect` |
| `POST /projects/{projectId}/snags` | `quality.inspect` |
| `GET /projects/{projectId}/readiness` | `readiness.read` |
| `POST /projects/{projectId}/opening-releases` | `readiness.release` |
| `POST /projects/{projectId}/protective-actions` | `safety.protect` |
| `POST /projects/{projectId}/run-sheets` | `operations.plan` |
| `POST /projects/{projectId}/incidents` | `incident.capture` |
| `POST /projects/{projectId}/handover-records` | `operations.handover` |
| `GET /field/projects/{projectId}/bundle` | `field.read` |
| `POST /field/sync` | `field.sync` |
| `GET /field/sync/{batchId}` | `field.sync` |

The module also needs ordinary permitted read/draft-edit companions with complete JSON schemas. No generic draft PATCH can set `approved`, `paid`, `permit_valid` or `ready_to_open`. Release actions use dedicated commands.

## 6. Mandatory phase test cases

Run all prior-phase regression tests plus these initial cases. Results must link to actual test files, CI run, commit and reviewer; listing a case is not evidence of a pass.

| ID | Scenario | Expected outcome |
|---|---|---|
| AT-055 | Worker qualification revoked while device offline | Attendance observation retained for review; no new authoritative qualified release from stale bundle. |
| AT-056 | Offline operations repeat/out of order | Per-operation results/deduplication; current accepted record not overwritten by stale fact. |
| AT-057 | Photo queued but binary upload incomplete | Record pending evidence; not accepted as fully verified completion. |
| AT-058 | Device storage evicted or session revoked | Local recovery/contingency disclosed; no claim of guaranteed background sync or remote offline wipe. |
| AT-059 | Readiness 99 percent but one critical inspection unresolved | Affected zone/package not ready; percentage cannot override condition. |
| AT-060 | Permit upload absent but actual verification exists | Alternative verification follows policy; not assumed absent nor falsely uploaded. |
| AT-061 | Required external approval actually absent | No generic administrative grace period authorises the prohibited activity. |
| AT-062 | Travel/setup/return windows overlap other booking | Resource conflict includes full planning window, not only public event hours. |
| AT-063 | Overlapping shifts/rest/calendar change | Approved jurisdiction/profile rules applied with explicit unresolved exceptions and no hard-coded country rate. |
| AT-064 | Incident includes restricted personal narrative | Command centre/client/report projections limit detail to permitted audience. |
| AT-065 | Service acceptance and bump-out damage | Delivery completion separate from venue reinstatement, returns and claims. |

## 7. Demonstration and UAT

Run a simulated load-in with poor connectivity, record an incident/photo/attendance, reconnect after a qualification change, resolve the discrepancy and perform a scoped opening review. End with venue handover and damaged-asset quarantine.

Use labelled synthetic data until the relevant E3 owner authorises a controlled pilot. A stakeholder walks the journey and checks the actual API/source record, not only a screenshot. Capture feedback as versioned backlog changes.

## 8. Explicit exclusions

No silent legal certification, unrestricted offline approvals, background-sync guarantee, biometric attendance system or replacement statutory payroll.

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
