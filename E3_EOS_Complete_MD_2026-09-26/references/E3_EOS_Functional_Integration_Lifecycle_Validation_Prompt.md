# E3 EOS — Functional Integration and End-to-End Lifecycle Validation

> **Architecture amendment — 19 September 2026:** E3 Rentals is authoritative for inventory, physical assets, availability, equipment reservations and custody. E3 Purchase Management System / PurchaseTracker is authoritative for procurement vendors and purchasing. EOS supplies project demand, approvals within its own authority, an integrated interface, source-linked projections and requests through adapters. Apply `E3_EOS_Rentals_PurchaseTracker_API_Integration_Plan.md` when interpreting warehouse, vendor and procurement instructions below. Live connections are explicitly deferred until EOS is ready. Preserve existing records and reconcile overlapping identities before cutover; do not build a second authoritative inventory, vendor or purchasing engine in EOS. Before external activation, exercise these boundaries through isolated contract fixtures and label the results Contract verified; source-system execution remains Not tested/Deferred. Local fixtures cannot establish live inventory, an approved external vendor, an issued purchase order or a completed live end-to-end acceptance gate.

## 1. Assignment and current baseline

Continue implementation in the existing E3 EOS repository. Complete the integrations, persistence and workflow behavior needed to run a newly created event project from intake through operational closeout and financial follow-up.

Read the repository instructions first. Inspect the actual schemas, services, UI components, policies, background jobs and existing tests. Adapt this brief to that architecture and preserve legitimate existing records. Implement the necessary changes, run the tests, and produce an evidence-based handoff; a plan alone is not completion.

The preceding developer update reports commit `7cc707a`, fixes for audit issues O01–O20, 679 passing tests, typecheck/build success and ten HTTP smoke checks against a local API server. Treat those as reported baseline results. Confirm the checked-out and deployed revisions independently. The original audit did not prove a successful backend safety bypass; preserve that distinction when describing O01.

Relevant prior deliverables:

- `E3_EOS_Other_Modules_Audit_2026-09-19.html` — observations and original acceptance criteria.
- `E3_EOS_Other_Modules_Repair_Prompt.md` — the repair backlog.
- Existing Design & Creative, RFP extraction, Scope Management and Controlled Documents/Vault implementation briefs.

Retest existing fixes and extend them where required. E3's operating model remains configurable by project, workflow version, role, country and effective policy. The 13-stage workflow is a supported template with canonical reporting mappings; it must not become the only possible project lifecycle.

**Completion target:** demonstrate an integrated lifecycle using persistent records from a fresh project, with correct project isolation, approvals, financial calculations, supporting files and client visibility. Report implemented, locally verified, deployed and accepted as separate states.

## 2. First establish what actually exists

Create a concise integration inventory before editing. For each participating module, identify:

| Item | Required information |
|---|---|
| User workflow | Route, relevant role and actual enabled actions |
| Data | Canonical entities, relationships and authoritative datastore |
| Commands and reads | Existing APIs/services, validation and authorization |
| Integration | Upstream source, downstream consumers and update mechanism |
| Evidence | Files, versions, actor, timestamp and approval references |
| Current status | Working, partial, demonstrative, missing or blocked, with evidence |

Identify use of fixture imports, project-code conditionals, in-memory repositories, generated timestamps, synthetic evidence, local-only state, fallback totals and simulated progress in operational flows. A repository implemented as a map is not by itself proof of a defect; verify whether real persistence exists behind it and whether records survive application restart.

Confirm the staging web and API deployment identities, migration version and environment. Reconcile them with the source revision being tested. Keep demo data visibly identifiable and prevent demo fallback from populating an ordinary project's records.

## 3. Close the acceptance gaps in the reported fixes

The following are verification targets, not assumptions that the submitted code is wrong:

1. **Readiness:** verify arbitrary mandatory prerequisites, not only `QCDD-INSP-441` or the QND project. A displayed score of 97% does not establish the opening decision. The authoritative blocker must control both the UI and the server transaction, including a stale page and concurrent evidence changes.
2. **Project identity and reports:** distinguish any newly created projects, not only Tourism versus QND. Read names, venues, results and financials from their authorized records. Unknown IDs must not resolve to a sample project. Separate route identity from query parameters.
3. **Field Ops:** bind each queued operation to the tenant, project, authenticated actor, entity version and operation ID at creation time. Switching the selected project later must not retarget that operation. Verify synchronization and deduplication after reconnect.
4. **Forecasting and FX:** verify the actual calculation inputs, assumptions, rate source and effective timestamp. A date label or changing number does not establish a live external rate. Support approved manual rates when configured and identify them honestly.
5. **Crew policy:** the update introduces a 14-hour rest interval, whereas the earlier UI described an 11-hour E3 inter-shift policy. Resolve the intended policy through configured, versioned rules and its approved source. Daily work limits, breaks, assignment duration and inter-shift rest are separate constraints. Do not infer a rest policy by subtracting a daily work limit from 24 hours. This task does not establish the legal correctness of either value.
6. **Evidence:** a lightbox, hash, GPS label or seeded inspector name is useful only when linked to the actual file and persisted verification record. Show metadata that exists, including its source; unknown metadata remains unknown. Hash the relevant actual bytes when claiming integrity.
7. **Invoice OCR:** test a newly uploaded file with different content from `INV-QL-5519_Scan.pdf`. Its extraction must use the configured OCR service and return source-grounded fields. Demonstration scan selection and a progress animation do not establish processing.
8. **Closeout:** unchecked defaults are not sufficient. Derive prerequisites from authoritative records and persist approval decisions. Reloading must neither lose a valid decision nor recreate a signature or timestamp.
9. **Workflow versions:** stage-name alignment must preserve project-specific templates, dependencies, role mappings and version history. Existing approved projects must not silently adopt a changed template.

Keep the O01–O20 register with its original criteria. Document any severity change and its reason. Mark an issue closed only with evidence of the corrected behavior at the relevant verification level.

## 4. Shared contracts and persistence

Use the existing database and application architecture. Add the smallest shared contracts needed to eliminate demonstrated inconsistencies.

### Project and entity identity

- Maintain stable tenant, project, entity and version identifiers across UI routes, APIs, jobs, caches, files and exports. Human-readable codes are labels or explicit aliases, not a fallback mechanism.
- Authorize reads, writes, evidence retrieval and exports using the authenticated context. Display the project name/code on project-scoped workflows.
- Isolate or cancel outdated requests when project selection changes. Do not let a late response from one project populate another.
- Forbid references to another project's records unless an explicit permitted relationship supports the use case, such as a reusable organization-vault document.

### Changes and downstream effects

- Preserve lineage from requirement and location allocation to design revision, BOQ line, sourcing decision, production package, receipt, installation evidence and acceptance.
- Use normal transactions for related state updates. If work crosses a background-job boundary, persist its pending state and make retries idempotent using the existing queue/outbox mechanism or a small compatible extension.
- Add concurrency checks to edits and approvals that can invalidate another user's work. Surface conflicts with a recoverable review flow.
- Distinguish a proposed change from an approved revision. A changed requirement must identify affected commitments, approvals and outputs; it must not silently rewrite a released PO, issued invoice, signed drawing or frozen submission pack.
- Persist record history and amendments. Draft deletion, archive and correction behavior must respect dependencies and existing retention rules.

### Truthful state and calculations

- Represent loading, empty, stale, unavailable, working, awaiting approval, approved and blocked states distinctly where relevant.
- Derive summary cards and detail tables from the same project, dates, filters and transaction sources. Show exclusions and opening balances explicitly.
- Every verification claim needs an evidence basis and evaluation time. Missing evidence cannot produce an unexplained green status.
- Compute gates and financial arithmetic deterministically from defined inputs. Use AI for document interpretation and assistance with human review, not as the authority for arithmetic or final approval.

## 5. Central Settings and configurable workflows

### AI and integration configuration

Use the central Settings capability for provider connections, models, OCR/document services, embeddings where used, viewer/conversion services and other integrations.

Settings must support the applicable provider, approved endpoint configuration, model/operation assignment, connection status, timeout, retry policy, usage limits and cost budget. Keep secrets in the server-side secret mechanism, expose masked status, and record authorized changes. Validate external endpoint configuration according to the application's network security rules.

Map document extraction, invoice OCR and other AI-assisted jobs to explicit configuration versions. Retain provider/model, prompt/schema version, job status, actual usage and source-document references where available. Model/provider changes must not silently reinterpret already approved requirements.

Run long processing outside the request lifecycle where required. Support queued, running, failed, cancelled and completed states, retries without duplicate results, and actionable errors. Treat uploaded document content as data, not instructions to change system behavior or disclose credentials.

When a service is unconfigured, show the missing setup and keep manual review available where appropriate. Record live-provider testing as blocked if credentials/access are unavailable. Contract tests may validate an adapter, but are not evidence that the external service was exercised.

### Workflow and policy configuration

Support project-assigned template versions, stage dependencies, responsible roles, approval requirements and mapping to E3's reporting maturity states: Idea, Developing, Submitted, Negotiating, Authorised, Delivering, Closing and Closed.

Authorized Super Admin modifications and permitted overrides must carry scope, reason, actor, evidence, effective date and audit history. The system must distinguish configurable operational rules, approved exceptions and mandatory restrictions according to the configured policy. A role with administrative access must not silently convert a blocked prerequisite into approved evidence.

Validate and publish configuration changes explicitly. Show the impact on existing projects and preserve their assigned versions unless an authorized migration is performed. Use named policy inputs in tests rather than unexplained constants embedded in components.

## 6. Prepare the lifecycle scenario

Create an isolated staging run with two fresh projects through the normal creation flow or the supported application service. Mark every test record with a run ID. Use synthetic organizations, test identities and a dedicated test warehouse/asset pool; reservations and movements must remain within that pool. Suppress real invitations, RFQs, client links and financial instructions.

- **Project A:** `EOS-UAT-LIFECYCLE-<run-id>`; synthetic client `E3 Integration Test Client A`; `Test Venue Alpha`; two zones, A/Main Event and B/Reception & Exhibition; a three-day event around 45 days after the run begins; QAR base currency; `Asia/Qatar` timezone. Use the existing configurable 13-stage template.
- **Project B:** `EOS-UAT-ISOLATION-<run-id>`; different synthetic client, venue, dates and scope. Assign a valid shorter workflow with canonical reporting mappings. Its project-specific financial and evidence records start empty.

Represent the tender deadline with date, time and timezone, for example 13:00 Asia/Qatar ten days after the run begins. Also test a source that supplies a date but no time; retain the missing-time state for review.

Use these 20 logical requirements as the initial approved scope for Project A. The quantities are test fixtures, not commercial quotations or operating recommendations.

| ID | Requirement | Quantity / unit | Location allocation | Responsible workstream | Intended fulfillment / acceptance |
|---|---|---|---|---|---|
| R01 | Registration counters | 4 each | A:2, B:2 | Production + Logistics | Two from stock, two fabricated; installed and accepted at the correct locations |
| R02 | Modular stage deck | 48 m² | A:48 | Production | Approved drawing, fabricated package, installation inspection |
| R03 | LED screen | 36 m² | A:36 | AV / Procurement | Rental, received quantity and technical test |
| R04 | Audio system | 1 set | A:1 | AV / Procurement | Rental and approved sound-test record |
| R05 | Lighting fixtures | 12 each | A:12 | AV / Procurement | Rental, receipt and technical acceptance |
| R06 | Audience chairs | 80 each | A:80 | Logistics | Stock reservation, dispatch, receipt and return |
| R07 | Display plinths | 6 each | B:6 | Production | Two stock and four fabricated; approved finish and dimensions |
| R08 | Printed branding panels | 10 each | A:4, B:6 | Creative + Procurement | Approved artwork and purchased print output |
| R09 | Cable protection | 100 linear m | A:60, B:40 | Logistics / Site | Stock allocation and installation inspection |
| R10 | Queue barriers | 20 each | A:8, B:12 | Logistics | Reservation, location-specific receipt and reconciliation |
| R11 | Counter-front graphics | 4 each | A:2, B:2 | Creative + Production | Related to R01; separately controlled artwork/output, not duplicate counters |
| R12 | Coordinated 3D layout | 1 deliverable | Shared A+B | Design | Versioned model and plan with an approved review record |
| R13 | Required site safety permit | 1 document | Shared A+B | HSE | Applicable, valid and verified evidence for the intended event period |
| R14 | Crew coverage | 16 person-shifts | A:8, B:8 | Operations | Explicit dated shifts, qualifications and configured rest checks |
| R15 | Transport services | 2 trips | Shared A+B | Logistics | Dated manifests and real receipt evidence |
| R16 | Commercial registration evidence | 1 document | Project-wide | Administration / Tender | Correct entity and applicable validity, retrieved from the vault |
| R17 | Trade license evidence | 1 document | Project-wide | Administration / Tender | Correct entity, scope and validity, retrieved from the vault |
| R18 | Financial statements | 2 annual documents | Project-wide | Finance / Tender | Synthetic FY2024 and FY2025 records with controlled access |
| R19 | Daily site reports | 3 reports | Shared A+B | Site Operations | One per event day with author, dated activities and evidence |
| R20 | Approved show run sheet | 6 cues | A:6 | Show Operations | Dependencies, responsible roles, planned/actual times and delay records |

Create authentic test artifacts using valid file formats: a synthetic tender with searchable text plus a scanned page, an addendum, two differing invoice files, PDF/2D design files, one valid supported 3D model, vault evidence and actual POD/QC image files. Store real bytes and metadata. Deliberately include one missing attachment case. Test-provider outputs and synthetic source documents must be identified as test material.

## 7. Execute the connected lifecycle

### A. Intake, RFP interpretation and scope review

Create and reopen both projects. Validate incomplete launch versus draft saving. Confirm time/timezone round-trips and project-specific templates. Prepare the reusable vault evidence described in section F alongside intake so it is available when submission and readiness prerequisites need it.

Upload the test tender for Project A. Extract proposed requirements with page/section references, relevant source text, quantities, units, locations, required evidence, due dates and confidence/review reasons. Preserve raw observations separately from approved scope.

Include these controlled cases in the tender/addendum:

- R01 appears in narrative and an appendix as the same four counters; retain both sources and count four once.
- R08 is described as four panels in A and six in B, with ten stated in a summary; create location allocations totaling ten, not twenty.
- R11 uses the word counter but describes its graphics; keep it related to R01 and distinct from the physical counters.
- A similar counter requirement exists in Project B; suggest reuse if permitted, but do not merge obligations across projects.
- A scanned table needs OCR and review. A low-confidence reading must not become an unflagged approved quantity.
- An addendum proposes R07 increasing from six to eight; preserve the original requirement, record the delta and its authority, and route the change for review.
- A contradictory deadline or dimension has no reliable precedence; flag the conflict instead of choosing silently.

Review and accept the initial 20 requirements. Verify editable title, description, allocation, department, owner, due date, acceptance criteria and supporting sources. Enable views by package, location, zone, department and status over the same records. Grouping must not multiply the scope or its cost.

### B. Design, comments and revision impact

Link layouts, plan PDFs, artwork and the supported 3D asset to the appropriate requirements and location allocations. Use the declared viewer capability matrix and conversion pipeline. Show clear processing or unsupported states for other formats.

Verify a comment anchored to a PDF page/position, a 2D asset position and a supported 3D object/viewpoint. Preserve the asset version, author, thread, visibility and resolution state. A new version must not silently move an old annotation to a different feature.

Use an internal reviewer and an authorized client test account. Confirm client access only to shared versions and permitted discussions. Record requested changes and a new approved revision. Turn approved design-derived items into proposed requirements or child deliverables with lineage and review, rather than silently expanding the committed scope.

For the R07 addendum/revision, show the effect on quantities, graphics/materials, BOQ, production and dates. Reopen only the applicable approvals under the configured policy. Retain superseded records and explain what changed.

### C. BOQ, sourcing and procurement

Build BOQ lines from approved scope and allocations. Keep buy cost, sell rate, margin, assumptions, tax treatment and pricing certainty explicit and permission-controlled.

For R01, allocate two counters from stock and two through fabrication; coverage must equal four. Support sourcing alternatives without duplicating the requirement. Test an insufficient-stock condition and a competing reservation.

Use normal RFQ/bid/award/PO workflows with test suppliers and suppressed external delivery. Apply threshold and segregation-of-duties rules through authorized test roles. Preserve approval and quote revisions.

Receive part of a PO and inspect the actual received quantity. Upload two different invoice files using the central OCR configuration, review extracted fields and link them to the correct supplier and PO. A retry or re-upload must not create a duplicate invoice.

Verify a quantity/price mismatch, its line-level explanation, and the configured hold/dispute resolution path. Under the test policy requiring receipt before invoice approval, an invoice exceeding the accepted quantity must remain blocked. A later correction or receipt resolves the discrepancy through a recorded action.

### D. Production, assets, logistics and installation

Create work packages from released design revisions and sourcing decisions. Record inspections against the actual item, drawing version, inspector and evidence. A failed mandatory inspection or invalidated drawing approval must prevent release until resolved.

Exercise stock reservation, picking, packing, dispatch, receipt, return, inspection and restocking for the selected assets. Enforce supported condition and quantity transitions; quarantined units cannot be counted as available. Make concurrent reservations and retrying a movement safe.

Create dated manifests and partial POD receipts. Store the actual receiver, time, attachment and accepted/damaged quantities. Open the POD as a different user and verify that the signer is unchanged and the attachment can be retrieved. Installation acceptance must reflect received/installed quantities for each zone.

### E. Crew, readiness and live operations

Plan actual daily shifts within an assignment period. Test overlap, insufficient rest, missing/expired qualifications and applicable configured work restrictions across both projects. Explain each failed rule using its policy version and evidence.

Evaluate readiness by project and zone from the connected requirements, design, QC, installation, staffing and permit records. With R13 missing or expired for the event period, opening must remain blocked regardless of aggregate completion. Test a newly created prerequisite ID as well as the previously reported example.

Resolve the evidence through the authorized review flow. Perform a simulated opening authorization only on the isolated test project with the appropriate test role, confirming server revalidation and the persisted approval event.

Run six test cues with one delay and its downstream effect. Compare run-sheet rows, summaries and command-centre data. Record DSRs and a test snag/incident. Use test-only event execution; send no real operational alerts or protective actions.

### F. Vault, controlled documents and submission packs

Store R16–R18 in the reusable organization vault with entity, document type, naming, version, issue/expiry metadata and visibility. Handle fiscal-year documents separately from documents with a genuine expiry date.

Test an expired certificate, a renewal and an otherwise valid document that expires before the intended submission/event date. Make applicability explicit. Reuse the same approved vault version across permitted projects without duplicating its identity or granting wider file access.

Build a tender pack with ordered documents, editable drafts, comments and working/pending-review/final/frozen states. Reordering must persist. Editing an eligible source creates a new revision; signed or frozen evidence remains intact. Prevent deletion of a referenced final version through an ordinary draft-delete action.

Produce a merged PDF from actual authorized files with the chosen order, page ranges, orientation and optional approved test stamp/signature placement. Distinguish a visual stamp/signature image from any cryptographic signing mechanism. Preview the output and retain its manifest, included versions and checksum. A later vault renewal must not silently rewrite an issued pack.

### G. Closeout, billing and client results

Keep operational closure, commercial closure, collection status and archival state distinct. Evaluate each against its assigned policy. Required unfinished de-rig, unresolved asset discrepancies or critical open incidents must explain why the relevant closure is blocked.

Reconcile asset returns, damage/repair claims, venue handover and final evidence. Complete the authorized operational closure in the test project. Maintain open receivables independently where the configured policy permits it.

Generate a draft post-event report and a client results projection from approved project facts. Missing attendance, safety hours or sustainability evidence must remain unavailable. A delayed show cannot become a zero-delay narrative. Internal costs, margins and private comments must remain restricted in both the API response and exported client artifact.

Review and freeze a test report version. Verify its source data, original approver and actual evidence after reload. Keep external publication/dispatch suppressed in the test run.

## 8. Deterministic finance checks

Use a separate isolated transaction fixture through the normal financial services for these arithmetic assertions. These are test amounts, with tax/withholding excluded by the fixture's explicit configuration; they are not business rates or a statement of Qatar tax treatment. Do not overwrite the lifecycle project's balances to make them match.

| Input / state | Expected amount (QAR) |
|---|---:|
| Original contract revenue | 100,000 |
| Approved client variation | 1,500 |
| Current contract revenue | 101,500 |
| Original cost budget | 70,000 |
| Approved cost-budget change | 1,200 |
| Current authorized cost budget | 71,200 |
| Client invoices issued | 60,000 |
| Collections allocated to those invoices | 45,000 |
| Outstanding invoiced receivable | 15,000 |
| Contract revenue not yet billed | 41,500 |
| Posted actual costs | 20,000 |
| Accepted accrued costs not yet posted as invoices | 5,000 |
| Remaining commitments excluding costs already counted above | 12,000 |
| Uncommitted estimate to complete | 8,000 |
| EAC: actual + accrued + remaining commitments + ETC | 45,000 |
| VAC: current budget − EAC | 26,200 |
| Forecast gross profit: current revenue − EAC | 56,500 |
| Forecast gross margin on revenue | 55.67% |

Convert the QAR 5,000 accepted accrual to a posted supplier invoice: actual costs become 25,000, accrual becomes zero and EAC remains 45,000. Ensure remaining commitments are measured consistently and the same underlying cost is never counted twice. Test cancellation/credit, partial collection and duplicate retries with explicit expected outcomes.

Define rate precision and rounding. Use a deliberately fixed approved test FX rate to verify conversion deterministically; test a configured live rate provider separately and retain its actual provenance.

## 9. Verification gates

Run focused integration/end-to-end checks where they address state, financial or authorization risks. Use visual checks for layout and viewer behavior. Extend the existing suite with meaningful assertions rather than chasing a test-count target.

| Gate | Required evidence |
|---|---|
| Fresh data | A complete run on Project A created after deployment, with no project-specific code branch or fixture import required |
| Isolation | A/B switching, direct links, query parameters, back/forward and unknown IDs preserve correct identity; unauthorized relationships fail |
| Persistence | Create/edit/approve records, refresh, sign in as another test user, and restart the isolated application instance against the same datastore; records and evidence persist |
| Concurrency | Conflicting edits, competing reservations and stale approvals are rejected or reconciled explicitly |
| Idempotency | Retried uploads, jobs, receipts, collections and offline operations do not duplicate accepted records |
| Policy | Missing/expired evidence and unresolved critical prerequisites block the relevant server commands for newly created records |
| Evidence | Actual files open and match their hashes/versions; missing files and unavailable metadata are represented honestly |
| Financial accuracy | Controlled expected totals reconcile across ledger, cards, invoices, aging and exports |
| Role separation | PM, designer, procurement, finance, HSE/operations, field, authorized approver and client test identities have the intended access |
| Offline behavior | Queue a permitted field operation, disconnect/reconnect, switch projects and retry; apply once to its original scope and show conflicts/errors |
| External services | Settings configuration, real supported uploads, actual job results and recoverable provider failures; untested providers remain explicitly unverified |
| Client output | Approved client projection and actual exported PDF omit restricted financials/private discussion and contain the correct project facts |
| Deployment | Record source commit, web/API deployment identifiers, tested URLs and observed run results on that deployment |

Use isolated application instances for restart and failure injection. Existing HTTP health checks remain useful service checks, but do not substitute for lifecycle assertions. If a module blocks progress, fix the cause and continue from a recorded checkpoint. Do not mark later dependent stages passed while their prerequisites remain untested.

## 10. Delivery sequence and handoff

Implement in reviewable increments:

1. **Identity, persistence and policy:** source/deployment verification, canonical project context, durable records, authorization, central Settings configuration contracts, shared gate decisions and O01–O05 retests.
2. **Scope through delivery:** requirement allocations and revisions, design lineage, BOQ/sourcing, procurement, production, warehouse, receipts and installation.
3. **Operations and evidence:** central Settings jobs, vault/packs, crew, readiness, offline field work and run-sheet updates.
4. **Closeout and acceptance:** financial reconciliation, client projections, closure policies and the complete isolated lifecycle run.

At each increment, retain the commit and relevant test evidence. Maintain compatibility with existing records and publish a reversible migration/backfill strategy where required. Make any incomplete historical records visible rather than inventing approval or evidence metadata.

Return these artifacts in the existing project documentation structure:

- `integration-inventory.md`: module/data/service dependencies and remaining implementation gaps.
- `uat-scenario.md`: fresh project IDs, test identities, generated source files, settings/workflow versions and checkpoints.
- `audit-retest-matrix.md`: O01–O20, original criteria, current status, tested deployment and evidence links.
- `lifecycle-validation.md`: scenario action, expected result, actual result, entity IDs, relevant screenshots and pass/fail/blocked status.
- `release-handoff.md`: commits, deployment identifiers, schema changes, test results, limitations and outstanding release blockers.

Use precise completion labels: **Implemented**, **Locally verified**, **Deployed**, **Verified on staging**, **Blocked**, or **Not tested**. Preserve raw test results and relevant sanitized failures. An approval badge, screenshot, build success or green test total alone is insufficient evidence for a complete lifecycle.

Complete authorized development and isolated testing without repeated confirmation for routine reversible implementation decisions. Keep production business transactions, real client/vendor communications, real financial postings and destructive cleanup outside the test run. If an unavailable credential, business decision or environment capability blocks a check, complete the remaining work and report the exact unresolved dependency.
