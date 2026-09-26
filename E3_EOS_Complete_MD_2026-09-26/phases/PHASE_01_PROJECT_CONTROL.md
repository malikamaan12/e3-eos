# P01: Project control and configurable lifecycle

**Version:** 1.0 | **Build phase, not event lifecycle stage**

**Dependencies:** P00  
**Outcome:** An internal project can run from idea to a basic evidence-backed closeout through a genuinely editable workflow.  
**Primary modules:** M01, M02, M03, M04, M06 core, M15 basic, M17 notifications, M18  
**Accountable participants:** Product owner/PMO, backend/frontend engineers, QA and governance configuration owner.

## 1. Phase boundary

P01 exits only when real UI configuration changes affect server validation and reporting without code edits or cross-project effects. All P00 regression tests and P01 state/configuration cases pass.

All company thresholds, named approvers, country rules, report deadlines and project workflows remain configuration, not hard-coded defaults. Shared authority, policy, money, evidence and integration contracts apply. A phase cannot implement its own conflicting approval or cost-calculation engine.

## 2. Implementation backlog and acceptance

| Story ID | Work package | Developer implementation | Completion evidence |
|---|---|---|---|
| P01-ST01 | Project intake and progressive completeness | Build idea/tender/direct award/call-off creation with separate classifications, client contacts, deadline/timezone, finance assumptions, venue and project roles. | Unknown budget/client/venue is allowed when appropriate; fixed information and missing owners remain visible. |
| P01-ST02 | Template and stage graph studio | Seed thirteen-stage task library plus compressed templates. Implement add/archive/reorder/split/merge/repeat/reopen and parallel workstreams. | Migration preview maps tasks/requirements; deleting a stage never deletes an obligation or cost history. |
| P01-ST03 | Custom form/schema builder | Implement typed fields, translation, conditional requiredness, defaults, references and per-project overlays. | Stable field IDs and schema versions preserve historic values; invalid conversions are previewed, not silently applied. |
| P01-ST04 | Requirements/risks/clarifications | Link source pages/files to scope, assumptions, owner, feasibility and go/no-go decisions. | Coverage report finds missing deliverables/owners; lost tender closes with correct outcome. |
| P01-ST05 | Work packages, tasks and schedule | Build assignments, calendars, dependency DAG, baseline/forecast/actual, milestones, recurring periods and saved views. | Task complete remains distinct from reviewer acceptance; fixed deadlines cannot drift silently. |
| P01-ST06 | Generic approval and exception workflow | Implement exact-version requests, decision routes, protected authority publication, scoped expiry/use/review and anti-self-downgrade. | Single-use exception is consumed with action; review can close without rewriting the original missing condition. |
| P01-ST07 | Evidence and communication | Attach scanned documents, comments, mentions, source references and decision logs. Implement outbox-backed in-app/email notifications. | An email/comment does not act as approval; failed email does not hide the in-app task. |
| P01-ST08 | Basic closure and portfolio | Provide manual source-linked delivery/handover, basic report export and separate closure dimensions. | A full synthetic lifecycle is demonstrable without fake financial settlement or undocumented approval. |
| P01-ST09 | Configuration history and comparison | Show effective rule source, why blocked, versions, change impact and actionable exception path. | Country-source changes and unknown/stale facts are visible; no zero-latency or unconditional override claims. |

## 3. Required screens and interactions

Portfolio, New Project wizard, project overview/completeness, scope/risks/clarifications, task board, timeline, approval inbox, rule/form/graph editor, audit history and basic report/closure screens.

Every screen includes scoped loading/empty/error/permission/offline or stale-data states as relevant. Draft state and accepted state must be visibly different. Actions explain who can proceed and why a condition is unresolved. Client/internal separation is enforced by the API rather than hidden controls.

## 4. Data and migration work

Import a limited read-only historical project sample with source IDs and unverified approvals marked. No live asset/ledger cutover. Copy only structure into new projects.

Implement the phase's aggregate tables, indexes, constraints, row-scope tests, migration/backfill and import reconciliation defined in the shared data model. Mutable drafts use row versions; approved/posted records retain historical versions and correction records. No production schema push or database reset.

## 5. API surface and permissions

Base prefix: `/api/v1`. Implement and extend the versioned OpenAPI before accepting an endpoint. Critical payloads, concurrency, idempotency, error codes and current-authority checks are defined in the shared API contract.

| Endpoint | Permission |
|---|---|
| `POST /projects` | `project.create` |
| `GET /projects` | `project.read` |
| `GET /projects/{projectId}` | `project.read` |
| `PATCH /projects/{projectId}` | `project.edit` |
| `POST /projects/{projectId}/clone` | `project.clone` |
| `POST /projects/{projectId}/roles` | `project.roles.manage` |
| `POST /projects/{projectId}/requirements` | `scope.edit` |
| `GET /projects/{projectId}/requirements` | `scope.read` |
| `POST /projects/{projectId}/requirements/{id}/disposition` | `scope.disposition` |
| `POST /projects/{projectId}/clarifications` | `scope.edit` |
| `POST /projects/{projectId}/clarifications/{id}/respond` | `scope.edit` |
| `POST /projects/{projectId}/risks` | `risk.edit` |
| `POST /projects/{projectId}/qualification-decisions` | `project.qualify` |
| `POST /programmes` | `programme.manage` |
| `POST /agreements/{id}/call-offs` | `commercial.calloff` |
| `GET /templates` | `configuration.read` |
| `POST /templates/{id}/versions` | `configuration.author` |
| `POST /projects/{projectId}/policy-drafts` | `configuration.author` |
| `POST /projects/{projectId}/policy-drafts/{id}/validate` | `configuration.validate` |
| `POST /projects/{projectId}/policy-drafts/{id}/impact` | `configuration.validate` |
| `POST /projects/{projectId}/policy-drafts/{id}/publish` | `configuration.publish` |
| `GET /projects/{projectId}/policy` | `configuration.read` |
| `POST /projects/{projectId}/transitions` | `workflow.transition` |
| `POST /projects/{projectId}/approval-requests` | `approval.request` |
| `GET /projects/{projectId}/approval-requests` | `approval.read` |
| `POST /projects/{projectId}/approval-requests/{id}/decisions` | `approval.decide` |
| `POST /projects/{projectId}/exceptions` | `exception.request` |
| `POST /projects/{projectId}/exceptions/{id}/authorise` | `exception.authorise` |
| `POST /projects/{projectId}/exceptions/{id}/revoke` | `exception.revoke` |
| `POST /projects/{projectId}/exceptions/{id}/reviews` | `exception.review` |
| `POST /admin/authority-policies/{id}/versions` | `authority.author` |
| `POST /admin/authority-policies/{id}/publish` | `authority.publish` |
| `POST /projects/{projectId}/work-packages` | `work.edit` |
| `GET /projects/{projectId}/work-packages` | `work.read` |
| `POST /projects/{projectId}/tasks` | `work.edit` |
| `PATCH /projects/{projectId}/tasks/{id}` | `work.edit` |
| `POST /projects/{projectId}/tasks/{id}/complete` | `work.complete` |
| `POST /projects/{projectId}/work-packages/{id}/acceptances` | `work.accept` |
| `POST /projects/{projectId}/dependencies` | `schedule.edit` |
| `POST /projects/{projectId}/baselines` | `schedule.baseline` |
| `POST /projects/{projectId}/forecast-changes` | `schedule.edit` |
| `GET /projects/{projectId}/timeline` | `schedule.read` |
| `POST /projects/{projectId}/documents/upload-intents` | `document.upload` |
| `POST /projects/{projectId}/documents/{id}/versions` | `document.version` |
| `GET /projects/{projectId}/documents` | `document.read` |
| `POST /projects/{projectId}/documents/{id}/access` | `document.read` |
| `POST /projects/{projectId}/designs` | `design.edit` |
| `POST /projects/{projectId}/designs/{id}/annotations` | `design.review` |
| `POST /projects/{projectId}/designs/{id}/release` | `design.release` |
| `POST /projects/{projectId}/comments` | `collaboration.comment` |

The module also needs ordinary permitted read/draft-edit companions with complete JSON schemas. No generic draft PATCH can set `approved`, `paid`, `permit_valid` or `ready_to_open`. Release actions use dedicated commands.

## 6. Mandatory phase test cases

Run all prior-phase regression tests plus these initial cases. Results must link to actual test files, CI run, commit and reviewer; listing a case is not evidence of a pass.

| ID | Scenario | Expected outcome |
|---|---|---|
| AT-013 | Five-stage and thirteen-stage projects compared | Shared procurement metrics use canonical events and definition versions, not stage names. |
| AT-014 | Idea saved without client/venue/budget | Unknowns preserved; no fake zero/date/client inserted. |
| AT-015 | Lost tender is closed | Maturity closed and outcome lost, not delivered or won. |
| AT-016 | Task completed without required acceptance | Completion visible while acceptance remains pending. |
| AT-017 | Inspection stage removed | Applicable inspection obligation persists until authorised disposition; scope coverage does not falsely improve. |
| AT-018 | Stage split/merge/repeat/reopen | Stable records/history survive; dependencies mapped; cycles rejected or explicit new instances created. |
| AT-019 | Custom field type/requiredness changed | Migration previews old values, conversions and gaps; no silent historic corruption. |
| AT-020 | Policy compilation fails | Prior valid snapshot remains active; no partial activation. |
| AT-021 | Country source changes with active pinned project | Affected open work reviewed with effective dates; source change not hidden by pinning. |
| AT-022 | Current fact unknown/stale | Three-valued evaluation applies relevant restriction/verification; never interprets unknown as passed. |
| AT-023 | Exception reviewed and closed | Historical unmet condition remains; active review closes without permanent false unresolved status. |
| AT-024 | Single-use exception reused/replayed | Only authorised target executes once; second different use rejected. |
| AT-025 | Exception expires before review deadline | No new authorisation possible; review status remains independent. |
| AT-026 | Permanent business change requested | Uses new policy version, not endless emergency renewal. |
| AT-027 | High-consequence preapproval replaced by later task | Release still blocked until required current prior authority exists. |
| AT-028 | Immediate stop-work action needed | Protective action and incident capture available without ordinary release approval delay. |
| AT-029 | Overdue exception follow-up | Only configured risk-related actions restricted; unrelated invoicing/reporting/protective action available. |
| AT-030 | Clone event with costs/signatures/reservations | Only permitted templates/structure copied; historical proof and personal data reset. |
| AT-031 | Tender deadline across timezone/DST boundary | UTC/source IANA zone preserved; local view and elapsed/business duration calculation correct. |

## 7. Demonstration and UAT

Create an internal idea with no client or budget, turn it into a five-stage concept project, assign packages, approve an exact output and close it. Separately create a tender, register a zoned deadline, mark it lost and show accurate portfolio outcome. Modify one project without changing another.

Use labelled synthetic data until the relevant E3 owner authorises a controlled pilot. A stakeholder walks the journey and checks the actual API/source record, not only a screenshot. Capture feedback as versioned backlog changes.

## 8. Explicit exclusions

No claim of full production purchasing, field readiness or reconciled financial operation. These are later phases; P01 is a complete lightweight project-control slice.

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
