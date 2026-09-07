# P02: Design, BOQ, commercial approvals and client portal

**Version:** 1.0 | **Build phase, not event lifecycle stage**

**Dependencies:** P01  
**Outcome:** A client can review a controlled design and proposal, accept an exact version and approve an authorised change.  
**Primary modules:** M05, M06 specialised routes, M07, M16  
**Accountable participants:** Design lead, PM/commercial lead, Finance reviewer, client-services owner and engineering/QA.

## 1. Phase boundary

Design-to-proposal-to-client decision traceability and strict client projection tests pass. Finance approves the calculation definitions, not only the screen layout.

All company thresholds, named approvers, country rules, report deadlines and project workflows remain configuration, not hard-coded defaults. Shared authority, policy, money, evidence and integration contracts apply. A phase cannot implement its own conflicting approval or cost-calculation engine.

## 2. Implementation backlog and acceptance

| Story ID | Work package | Developer implementation | Completion evidence |
|---|---|---|---|
| P02-ST01 | Design version and moodboard workspace | Upload concepts/layouts/artwork, annotate exact pages/coordinates and compare revisions. | Each review/release references a version; new revision has no inherited fabrication approval. |
| P02-ST02 | BOQ and cost engine | Implement decimal quantity/UOM/component costing, margin/markup, rate sources, fees/discounts/tax basis and scenario versions. | Reference calculation fixtures pass; lump-sum decomposition does not duplicate total. |
| P02-ST03 | Proposal generation | Create controlled sell-side proposal and branded export from approved estimate scope. | No buy rates/internal margins in client API, browser payload, export or job metadata. |
| P02-ST04 | Authority and contract basis | Record client contract, framework/call-off, internal investment/development allowance and limits. | Projects can incur only explicitly authorised development/commitment scope, without forcing one contract route. |
| P02-ST05 | Change control | Capture request, scope/cost/time/technical impact, internal authority, client decision and baseline application. | Pending exposure separate from approved contract value; material changes invalidate relevant approvals. |
| P02-ST06 | Client rooms and publication | Build branded concept, milestone, commercial and results rooms over selected immutable projections. | Client role/read/decision permissions enforced server-side and on attachments; empty results room is not filled with fabricated metrics. |
| P02-ST07 | Client acceptance and sign-off | Capture publication-version/purpose/target hash and current authorised client identity. | Native acceptance label is truthful; formal e-signature remains optional integration, not assumed legal certification. |
| P02-ST08 | Arabic/English exports and accessibility | Validate realistic BOQ descriptions, multiline quantities, RTL reports, keyboard review and error states. | Reviewed sample proposal/layout exports and accessible client approval journey. |

## 3. Required screens and interactions

Design board/revision viewer, BOQ grid, estimate comparison, proposal/contract workspace, variation ledger, publish dialogue and four client rooms.

Every screen includes scoped loading/empty/error/permission/offline or stale-data states as relevant. Draft state and accepted state must be visibly different. Actions explain who can proceed and why a condition is unresolved. Client/internal separation is enforced by the API rather than hidden controls.

## 4. Data and migration work

Import approved templates/rate cards with effective dates and source. Existing client documents are verified/imported as versions; historic signatures remain historic evidence, not new authorisations.

Implement the phase's aggregate tables, indexes, constraints, row-scope tests, migration/backfill and import reconciliation defined in the shared data model. Mutable drafts use row versions; approved/posted records retain historical versions and correction records. No production schema push or database reset.

## 5. API surface and permissions

Base prefix: `/api/v1`. Implement and extend the versioned OpenAPI before accepting an endpoint. Critical payloads, concurrency, idempotency, error codes and current-authority checks are defined in the shared API contract.

| Endpoint | Permission |
|---|---|
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
| `POST /projects/{projectId}/estimates` | `commercial.estimate` |
| `POST /projects/{projectId}/estimates/{id}/lines` | `commercial.estimate` |
| `POST /projects/{projectId}/estimates/{id}/calculate` | `commercial.estimate` |
| `POST /projects/{projectId}/proposals` | `commercial.propose` |
| `POST /projects/{projectId}/contracts` | `commercial.contract` |
| `POST /projects/{projectId}/variations` | `change.request` |
| `POST /projects/{projectId}/variations/{id}/apply` | `change.apply` |
| `POST /projects/{projectId}/publications` | `portal.publish` |
| `POST /projects/{projectId}/publications/{id}/withdraw` | `portal.publish` |
| `GET /portal/projects` | `portal.read` |
| `GET /portal/projects/{projectId}` | `portal.read` |
| `GET /portal/projects/{projectId}/publications/{id}` | `portal.read` |
| `POST /portal/projects/{projectId}/decisions` | `portal.decide` |
| `POST /portal/projects/{projectId}/comments` | `portal.comment` |

The module also needs ordinary permitted read/draft-edit companions with complete JSON schemas. No generic draft PATCH can set `approved`, `paid`, `permit_valid` or `ready_to_open`. Release actions use dedicated commands.

## 6. Mandatory phase test cases

Run all prior-phase regression tests plus these initial cases. Results must link to actual test files, CI run, commit and reviewer; listing a case is not evidence of a pass.

| ID | Scenario | Expected outcome |
|---|---|---|
| AT-032 | PO/proposal significant amount/supplier/design changed after approval | Prior relevant approval superseded or re-evaluated; execution cannot reuse stale content hash. |
| AT-033 | Certificate issued after activity | Actual dates shown; cannot be presented as existing before release. |
| AT-034 | New internal drawing revision uploaded | Client sees only published revision; production release purpose/version explicit. |
| AT-035 | Client approval attempts different publication ID | Scope/version/purpose check fails without revealing internal content. |
| AT-036 | Publication withdrawn while link exists | Future access denied; UI does not promise recall of previous downloads. |
| AT-037 | Estimate contains hourly/shift units and lump-sum breakdown | Explicit conversions and allocations; no multiplication of full lump sum across children. |
| AT-038 | BOQ fee/tax/discount/rounding scenarios | Deterministic Decimal calculation and versioned basis match expected totals. |
| AT-039 | Margin confused with markup or zero revenue | Correct formula; zero/unknown denominator clearly not available. |
| AT-040 | Proposed change not client authorised | Shown as pending exposure, excluded from approved contract/budget. |
| AT-041 | Client click recorded as acceptance | Labelled native decision, not invented government/legal signature certification. |
| AT-042 | Arabic/English report and portal with long text | RTL layout, wrapping, keyboard focus and non-colour status indicators usable. |

## 7. Demonstration and UAT

Cost a graduation stage package, share a specific layout/proposal, receive client acceptance, revise the drawing internally and prove the old approval cannot authorise the new fabrication version. Request a last-minute change and show pending versus approved financial impact.

Use labelled synthetic data until the relevant E3 owner authorises a controlled pilot. A stakeholder walks the journey and checks the actual API/source record, not only a screenshot. Capture feedback as versioned backlog changes.

## 8. Explicit exclusions

No custom CAD/3D editor, ticketing checkout, automatic supplier purchase, government signing promise or unrestricted shared-folder client access.

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
