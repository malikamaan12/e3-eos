# P03: Procurement, fabrication and inventory

**Version:** 1.0 | **Build phase, not event lifecycle stage**

**Dependencies:** P02  
**Outcome:** Approved scope becomes accountable orders, production jobs, reservations and accepted receipts.  
**Primary modules:** M08, M09, M10 and linked M07/M14 commitment primitives  
**Accountable participants:** Procurement, Finance authority owner, workshop lead, warehouse/rentals owner, backend engineers and QA.

## 1. Phase boundary

Procurement owner, Finance and warehouse owner sign source reconciliation and release tests. Without inventory-source agreement, only tentative demand/exclusively allocated pilot stock may be used.

All company thresholds, named approvers, country rules, report deadlines and project workflows remain configuration, not hard-coded defaults. Shared authority, policy, money, evidence and integration contracts apply. A phase cannot implement its own conflicting approval or cost-calculation engine.

## 2. Implementation backlog and acceptance

| Story ID | Work package | Developer implementation | Completion evidence |
|---|---|---|---|
| P03-ST01 | Vendor master and verification | Support companies, freelance/cash suppliers, field-specific requiredness, expiring documents, update links and configurable grace. Protect bank changes. | No universal fake compliance document; grace and exception routes follow project authority and remain visible. |
| P03-ST02 | RFQ and comparison | Generate controlled scopes, send RFQs, capture questions/offers, compare technical equivalence/total delivered cost and document sole-source rationale. | Comparable quantities and exclusions retained; no invented competitive offers. |
| P03-ST03 | PR/PO and commitment release | Create requisition, current budget/authority check, exact-version PO, approval, idempotent release/outbox and acknowledgement. | Concurrent replay creates one commitment; supplier delivery status distinct from internal release. |
| P03-ST04 | Amendment, receipts and matching | Handle partial receipt/rejection, service acceptance, cancellation, substitutions and invoice matching references. | Original version preserved; allocated lines sum to source and partial balances remain explicit. |
| P03-ST05 | Fabrication work orders | Link approved drawing, material takeoff, workshop route, subcontract work, inspections and rework. | Drawing revision identifies affected in-progress work; completion does not bypass required quality acceptance. |
| P03-ST06 | Asset registry and condition | Support serialized and bulk resources, warehouse locations, QR references, maintenance/quarantine and custody. | Quarantined or damaged returns are excluded from usable availability. |
| P03-ST07 | Authoritative reservation service | Implement full operational windows, holds/expiry, exclusive exclusion constraint, bulk capacity locks and subrental requests. | Two projects cannot overbook the same pool; a shortage creates a request, not automatic spending. |
| P03-ST08 | Inventory/procurement migration cutover | Reconcile current legacy IDs, quantities, asset condition, open bookings, PR/POs and source authority. | One designated writer for each migrated pool; rentals integration uses EOS allocation or pilot assets are exclusively ring-fenced. |
| P03-ST09 | Procurement/production dashboards | Show due acknowledgements, manufacturing checkpoints, source commitments, delivery risks and resource readiness. | Dashboard figures reconcile to authoritative order/receipt/resource records. |

## 3. Required screens and interactions

Vendor profile, RFQ/offer comparison, purchase request/order, receipt and amendment screens, workshop board, asset passport, reservation calendar and dispatch/return preparation.

Every screen includes scoped loading/empty/error/permission/offline or stale-data states as relevant. Draft state and accepted state must be visibly different. Actions explain who can proceed and why a condition is unresolved. Client/internal separation is enforced by the API rather than hidden controls.

## 4. Data and migration work

This is the first controlled source-authority switch. Reconcile before/after snapshots, retain references, freeze only the agreed scope and verify rentals cannot independently write the same reservation pool.

Implement the phase's aggregate tables, indexes, constraints, row-scope tests, migration/backfill and import reconciliation defined in the shared data model. Mutable drafts use row versions; approved/posted records retain historical versions and correction records. No production schema push or database reset.

## 5. API surface and permissions

Base prefix: `/api/v1`. Implement and extend the versioned OpenAPI before accepting an endpoint. Critical payloads, concurrency, idempotency, error codes and current-authority checks are defined in the shared API contract.

| Endpoint | Permission |
|---|---|
| `POST /vendors` | `vendor.edit` |
| `POST /vendors/{id}/verification` | `vendor.verify` |
| `POST /vendors/{id}/bank-changes` | `vendor.bank.request` |
| `POST /projects/{projectId}/rfqs` | `procurement.source` |
| `POST /projects/{projectId}/rfqs/{id}/issue` | `procurement.issue` |
| `POST /projects/{projectId}/offers` | `procurement.source` |
| `POST /projects/{projectId}/comparisons` | `procurement.evaluate` |
| `POST /projects/{projectId}/purchase-requests` | `procurement.request` |
| `POST /projects/{projectId}/purchase-orders` | `procurement.order` |
| `POST /projects/{projectId}/purchase-orders/{id}/release` | `procurement.release` |
| `POST /projects/{projectId}/purchase-orders/{id}/amendments` | `procurement.amend` |
| `POST /projects/{projectId}/purchase-orders/{id}/acknowledgements` | `procurement.track` |
| `POST /projects/{projectId}/receipts` | `procurement.receive` |
| `POST /projects/{projectId}/production-orders` | `production.plan` |
| `POST /projects/{projectId}/production-orders/{id}/material-issues` | `production.issue` |
| `POST /projects/{projectId}/production-orders/{id}/checkpoints` | `production.update` |
| `POST /contributor-grants` | `contributor.invite` |
| `POST /contribute/{token}/responses` | `contributor.respond` |
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

The module also needs ordinary permitted read/draft-edit companions with complete JSON schemas. No generic draft PATCH can set `approved`, `paid`, `permit_valid` or `ready_to_open`. Release actions use dedicated commands.

## 6. Mandatory phase test cases

Run all prior-phase regression tests plus these initial cases. Results must link to actual test files, CI run, commit and reviewer; listing a case is not evidence of a pass.

| ID | Scenario | Expected outcome |
|---|---|---|
| AT-043 | Concurrent release requests for one PO | One commitment and one external delivery intent; same idempotent result returned. |
| AT-044 | Two call-offs concurrently consume parent ceiling | Atomic allocation prevents unapproved ceiling overrun. |
| AT-045 | Supplier order times out remotely | Outcome ambiguous; reconciliation before resend prevents duplicate external order. |
| AT-046 | Supplier bank details changed | Protected review/verification occurs; ordinary vendor editor cannot silently redirect authorised payment details. |
| AT-047 | Sole-source/cash/freelance supplier route | Configured fields/grace/source rationale supported without fabricated documents or comparisons. |
| AT-048 | Drawing changes after fabrication release | Affected work orders/POs flagged; already built item retains actual source version. |
| AT-049 | Two projects confirm same exclusive asset | Database reservation invariant permits only non-overlapping authoritative claims. |
| AT-050 | Bulk stock concurrent demand exceeds pool | Locked capacity check rejects excess; no oversell from two prechecks. |
| AT-051 | Asset returns damaged or under maintenance | Not available until serviceability release; custody and reservation states remain separate. |
| AT-052 | Current rentals inventory cutover | Opening balances/bookings/conditions reconcile; only one writer controls each pool after cutover. |
| AT-053 | PO split across packages and partial receipts | Allocations equal source once; rejected/unreceived portions remain explicit. |
| AT-054 | Subrental shortage detected | Creates request/forecast exposure, not automatic unauthorised supplier commitment. |

## 7. Demonstration and UAT

Convert an approved BOQ package into RFQ/sole-source decision, authorised PO, fabrication order, partial receipt and resource booking. Attempt two simultaneous reservations and two release retries. Demonstrate exactly one authorised commitment and one valid booking.

Use labelled synthetic data until the relevant E3 owner authorises a controlled pilot. A stakeholder walks the journey and checks the actual API/source record, not only a screenshot. Capture feedback as versioned backlog changes.

## 8. Explicit exclusions

No unapproved automatic subrental, no complete payroll system, no assumption an existing rentals admin API is safe until inspected, no full live-event acceptance yet.

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
