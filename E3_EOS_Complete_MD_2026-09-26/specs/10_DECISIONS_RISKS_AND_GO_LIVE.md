# Decision register, implementation control and go-live conditions

**Version:** 1.0 | **Status:** consolidated developer handover baseline, not a claim of deployment or signed commercial scope

## 1. What is decided

The product is a custom E3 operating system, not ticketing/ERP replacement. Use the selected TypeScript/Next/Nest/Drizzle/PostgreSQL stack, Better Auth, typed policy compiler, REST/OpenAPI, durable outbox/BullMQ, PWA capture and Google Cloud Doha deployment baseline. Use a modular monolith with shared services, protected authority and per-project flexibility. Implement the eight build phases and the thirteen configurable event-stage templates separately.

The earlier v0.1 source documents and v0.2 draft addendum are consolidated here. This package takes precedence over conflicting legacy wording, including merged completed/accepted states, permanently unresolved closed exceptions, frozen authority snapshots and unrestricted self-downgrade. Stage files reference shared controls instead of defining separate approval engines.

Exact security patch versions, live account credentials, real country legal rules and actual E3 spending authorities are not invented. Their owners and decision gates are listed below so developers can build the agreed mechanisms while completing evidence-based activation.

## 2. Activation decision register

| ID | Required fact/approval | Proposed accountable owner | Needed by | Effect if unavailable |
|---|---|---|---|---|
| D01 | Actual rentals/current website/procurement repositories, schemas, licences and security audit | Technical lead | P00 | Build isolated EOS; no production reuse or live-data migration. |
| D02 | Exact dependency locks and compatibility spike | Technical lead + security | P00 exit | Feature development cannot assume unsupported package combination. |
| D03 | Cloud account, region/service SKU, billing limits, log/backup geography | Technical lead + data owner | P00 deploy | Local/staging synthetic work only; no production personal/client data. |
| D04 | Organisation/legal entities and governance owners | E3 management | P01 configuration | Use clearly labelled synthetic fixtures, not invented real authority. |
| D05 | Actual approval/exception/spending matrix and emergency roles | Management + Finance + HSE/quality | Before real releases | Requests/drafts allowed; consequential release disabled without valid authority. |
| D06 | Accounting and HR/payroll products, source definitions and sample exports | Finance + HR | P03 mapping / P05 activation | Use controlled reviewed import/export; no fake live sync. |
| D07 | Inventory pool authority and current open bookings/serviceability | Warehouse/rentals owner + PM | P03 cutover | Tentative demand only, or exclusively allocated pilot pool under documented owner. |
| D08 | Reviewed country/entity/venue obligations and retention policies | Local qualified reviewers + data owner | Before relevant project live use | Unverified pack remains unverified; affected required release not falsely cleared. |
| D09 | BookingQube data contract and account access | Ticketing owner + technical lead | P05 connector | Approved manual import/aggregates with provenance and freshness labels. |
| D10 | Metricool entitlement and event-to-brand/campaign mappings | Marketing + technical lead | P05 connector | Source unavailable/provisional; no inferred metrics. |
| D11 | Approved sending identity and Google consent/scopes | IT owner | P01 invitations | Local mail sink only outside production; live invitations need approved sender. |
| D12 | Client terms, authorised approvers and external signing needs | Client services + commercial/legal reviewer | P02 portal release | Read-only published collaboration only until decision authority is established. |
| D13 | AI data-processing permissions and evaluated model allowlist | Data owner + technical lead | P06 enablement | AI remains off; all ordinary workflows still function. |
| D14 | Pilot projects, acceptance owners and actual capacity envelope | Product owner + PMO | P01 planning / P07 acceptance | Synthetic demonstrations do not count as operational acceptance. |
| D15 | Recovery geography, measured RPO/RTO and regional-outage residual risk | IT/security + management | P07 | No production dependency without documented risk/continuity decision. |

These are configuration/verification gates with owners, not open-ended architectural questions to hand back to the developer. Any change to the selected architecture needs an ADR recording reason, impact, migration and approval.

## 3. Team and ownership recommendation

Recommended responsibilities, not a committed headcount: E3 product owner; technical lead; backend/domain engineers; frontend/UX engineer; QA automation; shared DevOps/security; E3 Finance, Procurement, Operations/HSE and warehouse reviewers. Several roles may be combined only where independence requirements permit it. A developer is not automatically the finance approver or local regulatory reviewer.

Estimate effort by phase backlog after P00 repository/access review. This package deliberately does not present an unsupported fixed calendar or fixed implementation price. Phases advance through accepted evidence, not a promise of a release after an arbitrary number of weeks.

## 4. Scope and cost management

Track software delivery itself as work packages with owner, effort estimate, acceptance IDs and dependencies. Record recurring cost categories: cloud database/HA/backups, worker/compute, Redis, storage/media/egress, logging, email quotas, optional provider subscriptions, security testing and support. Obtain actual calculator/provider quotes before procurement; no prices in this document are represented as verified.

Avoid a premium grid/scheduler licence without explicit approval. No separate public ticketing checkout, general ledger, payroll calculation, CAD engine, blockchain signatures, omnichannel marketing publisher or microservice estate is hidden in the first release scope. Optional capabilities are feature-flagged and cannot delay acceptance of the authorised core unless explicitly made a requirement.

## 5. Pilot and migration sequence

Start with a controlled corporate/graduation-style project for basic scope/design/commercial proof. Use a multi-zone public event as the next operational stress case. Validate recurring attraction periods separately. These are recommended archetypes, not claims that a particular event date/client is approved for pilot.

P01 can demonstrate an entire lifecycle with manual source-linked records, but it is not yet a production purchasing/field operating system. Controlled operational pilot requires P00-P05 controls relevant to the event plus the applicable P07 security/recovery checklist. P06 optimisation can follow behind flags without delaying core rollout.

Perform read-only source inventory, sanitised rehearsal, ID mapping, opening reconciliation, frozen cutover window, controlled authoritative-source switch and post-cutover verification. Preserve existing identifiers and real records; do not wipe old production or manufacture transactions. Temporary parallel reporting is acceptable; two authoritative inventory/financial writers are not.

## 6. Go-live checklist

- Product scope/feature flags accepted by E3, with critical workflows demonstrated end to end.
- Real authority matrix, country/venue requirements and client access configured/reviewed for the release scope.
- Domain permissions and high-consequence concurrency tests pass; no client/internal leakage.
- Exact dependency lock, security scan, threat-model remediation and independent review evidence retained.
- Opening stock, reservations, PR/POs, costs and financial source mappings reconciled and signed off.
- Provider adapters verified or visibly disabled with a controlled fallback; no mock success endpoints.
- Backup/restore, regional continuity decision and job replay tested; named support roles trained.
- Actual field-device offline limitations and manual contingency accepted by Operations.
- Report calculations, client projection, source freshness and closure dimensions approved by Finance/PM.
- Production monitoring, alerts, escalation, secrets, billing caps and rollback/compensation runbooks active.

No checklist item can be changed to “passed” by an override. An authorised scope reduction or risk disposition is a different recorded outcome. Unsafe or unverified external compliance cannot be certified by software sign-off.

## 7. Developer delivery instructions

Start with P00. Submit an implementation plan mapping every phase item to code modules/tests, then deliver one complete vertical slice at a time. Do not implement all screens as disconnected mock CRUD and defer domain controls. Update OpenAPI and schema before API changes; update ADRs before stack changes; keep the generated master and focused Markdown files aligned.

Deliver source code in E3-owned repositories; infrastructure-as-code; migration scripts; real OpenAPI/schema and generated clients; tests; operating runbooks; provider capability manifests; deployment evidence; data export/restore procedure; and administrator/end-user training documentation. E3 retains access to code, accounts, credentials ownership and configuration exports.
