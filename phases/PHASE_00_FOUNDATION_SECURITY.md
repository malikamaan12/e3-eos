# P00: Foundation, architecture and security

**Version:** 1.0 | **Build phase, not event lifecycle stage**

**Dependencies:** None  
**Outcome:** A deployable, tested platform foundation with a demonstrated authentication and policy-publication vertical slice.  
**Primary modules:** M03, M06 foundations, M17, M18  
**Accountable participants:** Technical lead, security/DevOps, E3 product owner and designated governance owner.

## 1. Phase boundary

P00 requires passing platform/authority tests and documented exact stack compatibility. Unsupported library combinations must be resolved before P01, not hidden in a future technical-debt item.

All company thresholds, named approvers, country rules, report deadlines and project workflows remain configuration, not hard-coded defaults. Shared authority, policy, money, evidence and integration contracts apply. A phase cannot implement its own conflicting approval or cost-calculation engine.

## 2. Implementation backlog and acceptance

| Story ID | Work package | Developer implementation | Completion evidence |
|---|---|---|---|
| P00-ST01 | Repository and current-system audit | Inspect actual rentals/procurement/web repositories and data ownership, active records and security issues. Produce reuse/migrate/leave-isolated map. No production writes. | Approved inventory of code, schemas, source owners and migration risks; no assumed shared database. |
| P00-ST02 | Dependency and deployment spike | Lock compatible Node 24, Next 16/React 19, Nest 12 ESM, Better Auth stable/Drizzle, PG17 and BullMQ. Run on staging cloud containers. | Login/MFA, server session, scoped query, reviewed migration and background job execute using exact locked versions. |
| P00-ST03 | Monorepo and CI | Create repository/module boundaries, lint/typecheck/tests, secret/dependency scan, Docker and Terraform skeleton. | One command starts synthetic local dependencies; CI builds reproducible digested images. |
| P00-ST04 | Scope and identity model | Implement organisation/entity/user/membership/project-grant/audience model and protected setup. | No public signup; client session cannot access internal scope; recovery/bootstrap recorded. |
| P00-ST05 | Database and idempotency primitives | Create reviewed schemas, composite scope FKs, transaction-local RLS context, audit/outbox/inbox/idempotency tables. | Replay produces one effect; pooled context isolation and worker scope tests pass. |
| P00-ST06 | Policy compiler proof | Implement typed DSL schema, true/false/unknown, source manifest, immutable snapshot and atomic publish prototype. | Failed compile leaves active snapshot unchanged; current authority revocation overrides stale snapshot. |
| P00-ST07 | Document security foundation | Private upload quarantine, bounded signed access, scan job and immutable object metadata. | Malicious/oversized upload cannot become an approved public document. |
| P00-ST08 | Operational foundation | Configure secrets, regional logs/backups, health checks, queue lag and deployment gates. | Recovery drill plan, budget/SKU verification and infrastructure-access ownership documented. |

## 3. Required screens and interactions

Login, invite acceptance, MFA/recovery, forbidden state, admin bootstrap screen, developer policy preview and job health view. No production commercial screens.

Every screen includes scoped loading/empty/error/permission/offline or stale-data states as relevant. Draft state and accepted state must be visibly different. Actions explain who can proceed and why a condition is unresolved. Client/internal separation is enforced by the API rather than hidden controls.

## 4. Data and migration work

Only new isolated EOS schemas with synthetic fixtures. No shared legacy production credentials and no takeover of asset/finance authority.

Implement the phase's aggregate tables, indexes, constraints, row-scope tests, migration/backfill and import reconciliation defined in the shared data model. Mutable drafts use row versions; approved/posted records retain historical versions and correction records. No production schema push or database reset.

## 5. API surface and permissions

Base prefix: `/api/v1`. Implement and extend the versioned OpenAPI before accepting an endpoint. Critical payloads, concurrency, idempotency, error codes and current-authority checks are defined in the shared API contract.

| Endpoint | Permission |
|---|---|
| `GET /me` | `identity.read` |
| `GET /my-work` | `work.read` |
| `POST /invitations` | `membership.invite` |
| `POST /memberships/{id}/revoke` | `membership.revoke` |
| `GET /audit-events` | `audit.read` |
| `GET /jobs/{id}` | `jobs.read` |
| `GET /events/stream` | `events.read` |

The module also needs ordinary permitted read/draft-edit companions with complete JSON schemas. No generic draft PATCH can set `approved`, `paid`, `permit_valid` or `ready_to_open`. Release actions use dedicated commands.

## 6. Mandatory phase test cases

Run all prior-phase regression tests plus these initial cases. Results must link to actual test files, CI run, commit and reviewer; listing a case is not evidence of a pass.

| ID | Scenario | Expected outcome |
|---|---|---|
| AT-001 | Unauthorised organisation/project ID supplied | API, exports, file access, search and job status deny cross-scope data; no existence leakage. |
| AT-002 | Client calls internal costing API | Request denied server-side; response and logs contain no buying rates or payroll. |
| AT-003 | Approver role revoked after policy publication | Next decision/release denied despite old snapshot or active browser session. |
| AT-004 | One identity assigned two approval roles | Cannot satisfy a required independent two-person decision. |
| AT-005 | Requester weakens own pending approval route | Protected change flow detects effect; no silent self-authorisation under weaker policy. |
| AT-006 | Bootstrap/recovery account used | No demo backdoor; witnessed setup/recovery evidence, expiry, MFA and immediate audit alert. |
| AT-007 | Pooled database connection changes organisation | Transaction-local scope cannot leak into next request; app DB role cannot bypass RLS. |
| AT-008 | Invalid/oversized/malicious upload | Quarantined; never publicly readable, executed or accepted as evidence. |
| AT-009 | Queue job retried after process crash | Exactly one business effect through durable idempotency, not an exactly-once delivery assumption. |
| AT-010 | Session CSRF/origin/header manipulation | Forged browser command blocked; raw webhook body remains correctly verifiable. |
| AT-011 | Node/Nest/Better Auth/Drizzle integration spike | Exact stable version lock successfully runs auth, MFA, migration, RLS, transaction and queue tests. |
| AT-012 | Audit store privileged tamper simulation | Application edits denied; controlled privileged change detectable against external manifest; no untamperability claim. |

## 7. Demonstration and UAT

A scoped internal user logs in, creates a synthetic record, publishes a valid policy, fails an invalid publication, executes an idempotent command and sees an audited queued notification. A client user is denied the internal record.

Use labelled synthetic data until the relevant E3 owner authorises a controlled pilot. A stakeholder walks the journey and checks the actual API/source record, not only a screenshot. Capture feedback as versioned backlog changes.

## 8. Explicit exclusions

No live client data, commercial commitments, final country regulations, external API write integrations, ticketing or production event reliance.

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
