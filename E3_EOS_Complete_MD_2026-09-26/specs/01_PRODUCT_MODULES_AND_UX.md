# Product modules, workspaces and experience contract

**Version:** 1.0 | **Authority:** normative product requirements, subject to versioned E3 change control

## 1. Purpose and non-goals

Build a custom internal event operating system with controlled client collaboration. A project begins as an idea, tender, enquiry, internal initiative or awarded assignment and retains its identity through delivery, final reporting and settlement. Operational completion, acceptance, reporting, financial review and settlement are different dimensions.

Do not rebuild ticket sales/check-in, statutory bookkeeping, statutory payroll, CAD/3D authoring or government permit issuance. Do not build a public SaaS marketplace, separate microservice for every module, generic website CMS or autonomous spending agent. EOS coordinates their approved records where relevant.

## 2. Module catalogue

| ID | Module | Initial phase | Functional scope |
|---|---|---|---|
| M01 | Portfolio and project onboarding | P01 | Ideas, enquiries, tenders, direct awards, call-offs, parent programmes, project identity, roles, dates, finance assumptions and venue context. |
| M02 | Requirements and feasibility | P01 | Tender requirements, risks, assumptions, clarifications, site surveys, pursue/pause/no-go decisions and source-to-deliverable traceability. |
| M03 | Workflow and configuration studio | P00/P01 | Versioned templates, stage graphs, forms, rules, country/entity overlays, policy compiler, impact preview and protected publication. |
| M04 | Planning and work management | P01 | Work packages, tasks, dependencies, calendars, baseline/forecast/actual dates, milestones, recurring operating periods and personal queues. |
| M05 | Design and document control | P02 | Moodboards, drawings, revision comparison, review annotations, issue purpose, release registers, evidence and controlled external publication. |
| M06 | Approvals and exceptions | P01/P02 | Version-bound decisions, commercial authority, review chains, scoped exceptions, consumption, expiry, closure and escalation. |
| M07 | BOQ and commercial management | P02 | Internal unit costing, client quotes, scenarios, contract authority, budgets, payment milestones, sponsorship and promoted-event economics. |
| M08 | Vendors and procurement | P03 | Vendor validation, RFQs, comparisons, sole-source rationale, PRs, POs, commitments, acknowledgements, amendments and receipts. |
| M09 | Fabrication and production | P03 | Material takeoffs, workshop jobs, material use, fabrication checkpoints, subcontract outputs, quality acceptance and reusable assets. |
| M10 | Inventory and shared resources | P03 | Serialised/bulk assets, reservations, availability, warehouse movements, maintenance quarantine, subrentals and return inspection. |
| M11 | Crew and logistics | P04 | Qualifications, assignments, shifts, attendance, planning premiums, loads, trips, access passes, delivery slots and bump-in/out. |
| M12 | Compliance and readiness | P04 | Reviewed country/venue obligations, permits, certificates, RAMS, inspections, snags, constraints and scoped opening authority. |
| M13 | Field and live operations | P04 | Offline-first evidence, run sheets, command centre, shift logs, incidents, client requests, maintenance, handovers and service delivery. |
| M14 | Financial control and reconciliation | P05 | Actual costs, accruals, remaining commitments, allocations, billing requests, ledger mirrors, collection, cash exposure and settlement. |
| M15 | Reports, portfolio intelligence and learning | P01/P05/P06 | Canonical metrics, final client/internal reports, evidence manifests, supplier evaluation, rule analytics, historical estimating and lessons. |
| M16 | Client and contributor portals | P02/P03 | Branded concept/milestone/commercial/results rooms, authorised client actions and narrow supplier upload links. |
| M17 | Integrations and automation | P00/P05 | Outbox/inbox, connector contracts, imports, reconciliation, freshness, provider credentials, dead-letter queues and notifications. |
| M18 | Identity, security and platform operations | P00 | Authentication, access grants, organisation boundaries, protected governance, audit, retention, observability and recovery. |

## 3. Workspaces and route map

| Workspace | Proposed routes | Primary actions |
|---|---|---|
| Leadership | `/portfolio`, `/portfolio/resources`, `/portfolio/exceptions` | Compare pipeline, delivery health, risk, cash and open decisions across permitted entities. |
| Personal work | `/my-work`, `/approvals`, `/notifications` | See assigned work, deadline impact, review exact versions, delegate under policy. |
| Project | `/projects/:id/overview`, `/scope`, `/timeline`, `/design`, `/commercial`, `/procurement`, `/production`, `/resources`, `/crew-logistics`, `/readiness`, `/live`, `/finance`, `/reports`, `/history`, `/settings` | One linked project record; no duplicated client/internal project copies. |
| Field | `/field/projects/:id`, `/field/sync`, `/field/assignments/:id` | Released instructions, scans, evidence, checklists, incidents, delivery acknowledgements. |
| Client | `/portal/projects/:id`, `/concept`, `/milestones`, `/commercial`, `/results` | Review published versions and authorised pending decisions only. |
| Supplier | `/contribute/:token` | Restricted RFQ response or evidence upload, without general project browsing. |
| Admin | `/admin/templates`, `/policies`, `/authority`, `/roles`, `/countries`, `/fields`, `/integrations`, `/audit`, `/migrations` | Draft, preview, publish and monitor controlled configuration. |

These are application routes, not API endpoints. Names are proposed defaults. Language selection and Arabic RTL must work from P01, including exported content and date displays. All actionable views require loading, empty, validation-error, permission-denied, offline and stale-data states.

## 4. Intake fields and progressive completeness

| Group | Contract |
|---|---|
| Identity | Stable generated ID; editable project code with unique organisation scope; title; overview; objectives; source; priority; sensitivity; tags. |
| Classification | Separate business route, event format, commercial model, maturity and operating model. No single overloaded `type` enum. |
| Client | Optional internal idea; otherwise organisation/contact, description, procurement/billing/technical representatives, approval authority and scope. |
| Dates | Submission and clarification deadlines with timezone; site visit; decision; design; production; access; event sessions; bump-out; reporting; billing. All can begin unknown where policy permits. |
| Financial assumptions | Currency; expected value/revenue and cost range; assumed/fixed/quoted/authorised basis; development allowance; contingency basis; funding source; target outcome. Unknown never equals zero. |
| Venue | Country/city/venue/hall/zone, access windows, services, contacts, booking status, plans and survey status. Multiple locations supported. |
| Ownership | Sponsor, project lead and project-role assignments. No hard-coded employee names. |
| Governance | Selected templates, entity/country/location overlays, approval matrix, publication rules and required evidence. |
| Success | KPI definitions, audience, agreed report outputs and due-date formula or explicit date. |

Suggested minimum to save an idea is title, description, origin and owner, all business-default requirements editable by authorised configuration. Stable IDs, authenticated provenance and valid relationships are engineering invariants. Every unanswered required business field has explicit knowledge status, owner and review date when appropriate.

## 5. Lifecycle template and alternate routes

The thirteen stage files are a starter task library, not fixed application navigation or hard-coded enum values. Retain:

1. Onboarding.
2. Qualification/feasibility.
3. Idea/concept/first draft.
4. Clarification/design development.
5. Proposal/submission/authorisation.
6. Detailed delivery planning.
7. Vendor selection/orders.
8. Production/resource preparation.
9. Logistics/bump-in/installation.
10. Finishing/testing/readiness.
11. Operations/delivery.
12. Bump-out/reconciliation.
13. Post-event report/closure/learning.

Authorised users can add, merge, split, reorder, repeat, rename, reopen or archive stage instances, and operate workstreams in parallel. Repetition creates new instances with stable lineage, not a cyclic scheduling dependency. Deleting a stage archives its relationship; it never deletes a requirement, cost, approval or evidence record. Explicitly remap surviving work.

Support a lost tender, paused idea, concept-only commission, rapid call-off, promoted event, recurring attraction, touring programme and multi-venue project. A closed lost tender has outcome `lost`, not `delivered`. A direct award may import existing approvals as verified or unverified records. Cloning resets signatures, costs, reservations, actual dates, published tokens and unnecessary personal data.

## 6. Connected work and communication

Hierarchy: organisation -> programme/parent agreement -> project -> zone/workstream -> work package -> tasks/checklists. A package connects source requirements, drawings, BOQ lines, purchase lines, resource demand, approvals, site evidence and acceptance. Cross-links are explicit records, not free-text mentions only.

Each task has one accountable owner, contributors, planned/forecast/actual dates, dependency type, completion criterion, review policy and visibility. Completion is not acceptance. Global search, imports and exports enforce the same permissions as normal screens.

Provide threaded comments, mentions, decision logs, clarification correspondence, transmittals and a linked contact history. A comment saying “approved” is not an approval decision. A notification saying “sent” is not supplier acceptance. Importing an email attaches its source and timestamps; it does not trust the sender text as instructions to execute.

## 7. Client collaboration rules

The home screen prioritises decisions awaiting the client. Publish an approved projection, not an unrestricted view of internal tables. Concept room: moodboards/layouts/annotations. Milestones: selected progress and evidence. Commercial: sell-side proposal, variations and billing status by source. Results: published report, audited-or-provisional metric labels and approved media.

Client viewers cannot automatically approve; assignment must grant the relevant project, purpose and amount/scope. Publication references an exact version. Replace/withdraw publication through recorded actions. A newer internal draft remains private. Revocation affects future access; downloaded copies cannot be remotely recalled.

Redact supplier buy rates, internal margins, payroll, other clients, private incidents and unpublished document metadata server-side. Branding is editable per organisation/project; permitted content never changes because of a theme. Walkthroughs begin as vetted external links/recorded media, not an in-house CAD engine. Do not auto-fetch arbitrary URLs.

## 8. Starter templates and extensibility

Ship example templates for corporate/graduation, public multi-zone event, tender-only, concept-only, call-off and recurring attraction. Country profiles start with jurisdiction metadata and reviewed obligations, not invented rates. Include Qatar and a second-country test fixture using explicitly synthetic rules. Every template identifies its version, owner, review status and source.

Custom fields support text, rich text, choice, multi-choice, decimal with unit, money, date, zoned instant, contact/reference, location, boolean, attachment and calculated read-only field. Stable field IDs survive label/translation changes. Promote commonly queried custom fields to indexed projections without altering historic values. No arbitrary user JavaScript, SQL or HTML execution.

## 9. Common usability acceptance

Users must be able to see “why blocked”, policy source, missing facts and the correct review/exception route. Every list supports scoped filters, saved views, bulk actions with per-record permission/results and accessible keyboard interaction. Destructive bulk changes require preview and confirmation. The client portal must never show internal approval-engine jargon.

Timeline colour is never the sole indicator of risk. Print/export layouts handle Arabic and English, long quantities, item units and realistic multiline descriptions. QR labels contain opaque reference identifiers, not personal data or permanent public document links.
