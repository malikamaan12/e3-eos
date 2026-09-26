# E3-EOS — Practical RFP & Document Intelligence Integration Prompt

Implement this within the existing E3-EOS repository. This is an integration specification, not an instruction to create a separate application. It supersedes earlier parser recommendations where they conflict with the controls below.

## 1. Outcome and implementation boundaries

Extend document intake so an authorized user can upload an RFP package, inspect evidence-backed requirement proposals, compare them with existing project requirements, approve explicit decisions, and publish a controlled import into the existing register.

The intelligence must propose decisions; the application must validate them; an authorized reviewer must approve operational changes. Do not claim the system can understand every possible tender scenario. Unresolved meaning must produce a visible review item, not a guessed answer.

Before editing, inspect repository instructions, schema, routes, services, tests, and existing document/parser, requirement, scope, allocation, workflow, permission, AI, queue, storage, and audit code. Produce a brief integration map identifying what will be reused, extended, or added. Verify implementation status from code rather than assuming earlier prompts have been built.

Preserve working features, user edits, existing IDs, assignments, approved baselines, and links. Reuse the current database, deployment pattern, UI components, and authorization. Do not introduce a second authoritative requirement register, hard-coded project lifecycle, parallel approval engine, new microservice estate, or new paid provider without a justified need and authorization. Use additive migrations and reversible feature flags. Do not deploy or mutate live project records as part of testing.

## 2. Deliver one complete vertical slice first

The first working release must complete this journey:

1. Select an existing project and upload its tender documents.
2. Confirm document roles, revisions, languages, and known relationships.
3. Process documents asynchronously, with page/sheet coverage and failure visibility.
4. Extract candidate obligations, source evidence, and structured attributes.
5. Compare candidates with each other and with current project records.
6. Review recommendations beside original evidence.
7. Preview exact creates, evidence links, revisions, allocations, and unresolved issues.
8. Publish approved changes through existing EOS services.
9. Re-upload or retry without creating duplicate operational requirements.
10. Upload an addendum and review its impact without silently replacing approved work.

Start with digital PDF, scanned PDF, DOCX, and XLSX. English, Arabic, mixed-language text, and right-to-left evidence must be represented in the schema and tested. If the configured OCR cannot reliably process a page or language, route it to manual capture with a visible limitation. Do not quietly claim format support.

Allow unsupported files to remain registered attachments, clearly marked unprocessed. Native CAD interpretation, automated drawing measurements, email/portal connectors, historical-project learning, and conversational tender search are later increments. Their absence must not block a useful first release.

## 3. Separate evidence, proposals, requirements, and allocations

Use these conceptual layers; adapt names to existing entities:

| Layer | Purpose | Important rule |
|---|---|---|
| Source document version and evidence span | Original file and precise paragraph, table cell, note, or page location | Never rewrite original evidence; corrections are new records linked to it |
| Extraction candidate | A proposed obligation plus extracted facts, uncertainty, and source links | Not yet an operational requirement |
| Review proposal | Recommended create/link/revise/split action with differences and risks | Cannot directly authorize operational writes |
| Existing EOS requirement and revision | The approved operational interpretation | Remains the single source of truth |
| Existing allocation or child requirement | Where, when, and how much of an obligation applies | Repeated locations are not duplicate requirements by default |

Many evidence spans may support one requirement; one compound source clause may support several requirements. Store this many-to-many relationship. Link evidence to individual structured fields where it supports a quantity, deadline, responsibility, or condition.

Do not confuse these identities:

- Same file bytes: processing duplication.
- Same source clause extracted twice: extraction duplication.
- Same obligation repeated elsewhere: possible evidence consolidation.
- Same item in another zone/phase: potentially a different allocation.
- Same requirement type in a previous project: reusable reference, not the same obligation.

If allocations already exist, reuse them. Otherwise add the smallest compatible extension or explicit child requirements; document the mapping. Do not duplicate files, tasks, or BOQ rows merely because an item has multiple organizational links.

## 4. Intake, evidence, and processing coverage

Register tenant, project, tender package, document version, original filename, checksum, uploader, issue date, language, document role, revision, and claimed amendment target. A filename is a hint, not authority. Same filename with changed bytes is a possible new version, not an overwrite.

Reuse extraction results for identical bytes only inside the authorized context, with matching processing configuration. Reusing bytes must not automatically reuse project applicability or create cross-tenant links. Keep each legitimate document registration and provenance.

Build an immutable evidence map including:

- Original wording and source language; any translation stored separately.
- Section hierarchy, clause ID, headings, definitions, and nearby context.
- PDF page index, printed page label where available, bounding box and coordinate system.
- DOCX paragraph/table identifiers; a versioned rendered-page map if page viewing is provided.
- XLSX sheet, cell/range, row/column headers, units, formula and cached-value status.
- Table continuation links, merged-cell inheritance, footnotes, exclusions, and referenced appendices.
- Extraction method/version, OCR warnings, and any reviewer correction.

Do not invent page numbers for a format without stable pagination. Preserve track changes, comments, hidden-sheet status, and draft/final ambiguity for review; do not treat deleted draft wording as a current obligation. Do not execute macros or trust stale spreadsheet formula results.

Maintain coverage per page, sheet, and meaningful block: pending, extracted, candidate-linked, classified non-obligation, needs manual review, unsupported, or failed. Non-obligation classification needs a reason and remains reversible.

Show processing coverage separately from human-review coverage and estimated extraction quality. “All pages processed” must not mean “all requirements found.” Referenced but missing appendices and unexplained extraction gaps remain visible issues. Do not require every block to become a requirement.

## 5. Understand the source before matching it

Use a bounded pipeline:

1. Deterministically extract available text, structure, tables, and identifiers.
2. OCR only the pages/regions that require it; check native-text quality as well.
3. Build document context: defined terms, parties, locations, phases, document relationships, language rules, and cross-references.
4. Extract obligations section by section with headings, table headers, nearby qualifiers, and relevant definitions included.
5. Resolve cited clauses against their actual source text. A summary is navigation context, never replacement evidence.
6. Validate candidate fields against source spans.
7. Retrieve possible matches, then adjudicate relationships using structured differences.
8. Run deterministic consistency and coverage checks before review.

Chunk at meaningful clause/table boundaries where possible. Overlap chunks safely and reconcile duplicated extraction by stable source identity. Bound reference expansion and detect cycles. If a required context window cannot be processed, leave an unresolved reference rather than silently dropping it.

Extract obligations expressed in lists, tables, forms, conditions, negatives, and footnotes, not only sentences containing “shall.” Distinguish deliverables from background information, eligibility criteria, bid-returnables, commercial conditions, and post-award duties. A bidder qualification or signed form is not automatically a procurement item.

Split independent actions such as design, submit for approval, fabricate, and operate when they need separate ownership or completion evidence. Keep the object's essential qualifiers attached. Never fragment “minimum 20 licensed guards per operating shift” into unrelated facts that lose their shared meaning.

## 6. Candidate contract and field provenance

Each candidate must support:

- Stable ID, extraction run, tenant/project/document references, and exact evidence spans.
- Title, concise actionable wording, original wording, source language, and category.
- Contractual responsible party, action, object, mandatory/optional/prohibited/conditional status.
- Quantity value/range, unit, comparator such as exact/minimum/maximum/estimated, and quantity basis.
- Basis examples: total, per zone, per shift, per day, concurrent, reusable across occurrences, or unspecified.
- Locations, zones, phase, schedule, frequency, applicability conditions, exclusions, and alternatives.
- Specification attributes, materials, dimensions, standards exactly as cited, and acceptance evidence.
- Absolute or relative deadline expression, timezone/calendar when known, and unresolved dependencies.
- Parent/child, supports, depends-on, exception-to, conflicts-with, or amends relationships.
- Proposed internal department, owner, scope package, and existing-entity matches, separate from source facts.
- Missing fields, validation issues, risk flags, extraction signals, and review status.

For each material field retain raw value, normalized value, provenance, and evidence reference. Provenance must distinguish explicit source, inherited source context, approved project setting, reviewer-entered value, and AI suggestion. Inheritance must cite the governing heading/definition and respect exceptions.

Unknown is not zero, not project-wide, and not a match. Do not invent quantities, durations, internal owners, deadlines, standards, or acceptance criteria. Suggested values must remain visibly unconfirmed. Existing tender facts must not be silently replaced by current industry practice or historical templates.

Keep raw and normalized units; only perform validated conversions between compatible dimensions. Preserve calendar and date ambiguity. “Seven days before opening” stays a dependency expression until its anchor, calendar basis, and timezone are confirmed. Recalculation proposes a change; it does not silently amend an approved deadline.

Treat contractual responsibility and internal delivery ownership separately: “contractor shall provide” does not prove which E3 department or person is assigned.

## 7. Decision policy: match meaning and applicability, not just wording

Use a decision proposal with separate relationship, suggested action, field differences, evidence, blocking issues, and reviewer explanation. One proposal may be a likely duplicate and still have an OCR or commercial-risk flag.

| Scenario | Proposed handling | Forbidden shortcut |
|---|---|---|
| Same applicable obligation repeated in scope and BOQ | Attach both evidence sources to one existing/new requirement | Add the repeated quantities together |
| Same obligation, one source adds a compatible attribute | Propose field-level enrichment/revision with both sources | Automatically overwrite current wording or approvals |
| Same item in two named zones or phases | Use distinct allocations/children, or separate obligations if ownership/specification differs | Merge away the distinction |
| Different required actions on the same item | Linked obligations, e.g. design and fabrication | Treat every mention of an item as one task |
| Aggregate quantity plus a detailed breakdown | Link total and allocations; reconcile compatible arithmetic | Count both total and breakdown as additional supply |
| Similar text with different numbers, party, dates, units, or conditions | Explain difference; propose conflict, amendment, or separate applicability | Let semantic similarity decide authority |
| Explicit addendum replaces a clause | Propose a scoped requirement revision with retained history | Choose newest upload automatically |
| Same type in a previous project | Offer template/reference only if permitted | Link as the same current obligation |
| Insufficient evidence | Keep in review and optionally draft clarification | Fill gaps to make a clean register |

Compare party, action, object, modality/negation, quantity comparator and basis, specification, location, phase, time, conditions, exclusions, alternatives, and source authority. Missing critical applicability is not a wildcard.

Examples the product must handle:

- “20 chairs total” repeated in two places remains 20.
- “20 chairs in each of two zones” has two allocations of 20 and a derived total of 40.
- “20 chairs across Zones A and B” is a total of 20; the split is unknown.
- “20 chairs total; A: 12, B: 8” is 20, not 40. A: 12 and B: 10 creates a reconciliation issue, not an automatic corrected total.
- “20 staff per shift” is coverage, not automatically 40 distinct employees for two shifts; roster and relief planning is separate.
- Reusable equipment across non-overlapping dates does not imply purchasing the sum of all occurrences.
- “Provide generator” and “maintain client-provided generator” are different responsibilities.
- “20” and “minimum 20” are not identical facts. Assess compatible constraints and propose enrichment or clarification with explicit semantics.
- “Provide security” is too broad to merge all zone-specific security rows into one undifferentiated requirement.

Arithmetic must use quantity basis and comparator. Summing minimum quantities produces a minimum bound, not an exact total. Do not total incomparable units or treat alternatives as simultaneously mandatory.

Do not assume pairwise similarity is transitive. Before consolidating three or more candidates, check every material constraint against the proposed group. One broad clause must not bridge incompatible obligations. Persist a reviewer's “keep separate” decision so reprocessing does not repeatedly propose the same merge unless material evidence changes.

## 8. Matching engine and bounded AI use

Use three steps, reusing current infrastructure:

1. Exact/source-ID and normalized lexical checks for processing duplicates and strong references.
2. Tenant/project-scoped candidate retrieval using structured fields and full-text search; add embeddings through the existing stack where justified.
3. Structured semantic adjudication on the candidate and a bounded set of retrieved matches, with source context for both sides.

Always include explicit clause/reference matches even if outside the normal semantic top-K. Search current-batch candidates, persisted pending proposals, and active project requirements; consult superseded records for history, not as active matches. Do not deduplicate against inaccessible or unrelated projects.

Return a validated object containing candidate ID, matched entity IDs and revisions, relationship, suggested action, field-level differences, proposed patch, evidence references, concise decision explanation, unresolved questions, and blocking issues. Request a short evidence-based explanation, not hidden chain-of-thought.

The model never selects arbitrary database targets or writes operational records. Validate all IDs, citations, tenant ownership, field types, allowed actions, and patch paths server-side. A syntactically valid JSON object is not proof the extracted meaning is correct. Unknown or contradictory outputs must abstain and enter review.

Use one extraction pass plus a targeted adjudication pass where needed, not a multi-agent system by default. Apply bounded retries, configurable token/cost budgets, caching by input and processing versions, and selective reprocessing. Persist provider/model/prompt/schema/rule versions and sanitized execution diagnostics. Capture reviewer corrections as evaluation cases and proposed rule/template improvements; validate them before changing shared production behavior. Do not automatically train on confidential tender data or apply one reviewer's preference across projects.

Do not use an LLM-reported “95% confidence” as automatic approval. Distinguish OCR signals, citation validity, critical-field completeness, rule conflicts, retrieval coverage, and model uncertainty. Calibrate any scores on a labeled evaluation set; until then display them as uncalibrated signals.

## 9. Automation limits

Initially automate only processing, candidate extraction, review grouping, and suppression of confirmed processing duplicates. All changes to the operational register require an authorized publish decision, including evidence additions to approved records.

Bulk review may be offered for low-risk, fully evidenced proposals of the same action type, with an exact count, visible selection, and a change preview. Do not provide an unconditional “accept everything” route around blocking issues.

Never auto-publish quantities, scope amendments, contractual/commercial terms, HSE controls, deadlines, conditions, ownership changes, or supersession based on model confidence. Design the policy so greater automation can be introduced only after measured validation and explicit configuration.

## 10. Practical review interface

Extend the current project document/requirements screens with an Import Review workspace:

- Left: original source viewer, highlighted clause/cells, document metadata, and surrounding context.
- Centre: proposed requirement with editable facts, provenance, missing-field indicators, allocation details, and source references.
- Right: existing matches, side-by-side field differences, recommended action, risk flags, and decision controls.

Review groups: New; Repeated Evidence; Enrichment; Separate Allocation; Possible Amendment; Conflict; Missing Information; Non-requirement; Processing Failure. Filters include package, document, category, zone, department, risk, and status. Review states must remain distinct from the project's delivery/lifecycle states.

Actions: create new; attach evidence; propose revision; add allocation; split; keep separate; link related; flag conflict; draft clarification; reject with reason; defer. Keep merge/supersede exceptional for existing live requirements because their tasks and approvals may differ. Require explicit impact review and a reversible mapping if such a migration is supported.

Before publication show, for example: “8 new requirements, 6 evidence links, 2 proposed revisions, 3 allocations, 4 unresolved issues.” Explain whether revisions are only change requests or will become active under current workflow permissions. No button should misleadingly report “import complete” while unresolved material issues remain.

Users may publish an unrelated valid subset, but dependent proposals must commit together or wait. Record the partial import and remaining blockers. Restrict publication of uncertain items; a reviewer must supply verified facts/evidence or use an authorized, audited exception pathway that visibly retains the uncertainty. An override must not bypass authorization or source isolation.

## 11. Safe publish, retry, concurrent edits, and reversal

Extraction and re-analysis must never mutate live requirements. Publish only reviewed proposals via existing requirement/change-control services.

Implement:

- Durable processing jobs, bounded retries, stage checkpoints, cancellation, and explicit partial failure.
- Stable source/candidate identity and unique keys for extraction duplicates; do not use an unstable model sentence alone as identity. Distinguish multiple obligations from the same source span so deduplication does not erase a legitimate compound-clause split.
- An import operation ID and idempotency key. Retrying a completed publish returns its recorded result instead of creating more rows.
- Project-scoped publish serialization or an equivalent transaction/locking strategy. Inside the protected commit, recheck target revisions and whether another import created a matching obligation after review. New ambiguity returns to review rather than silently creating or merging.
- Optimistic concurrency against every target requirement and allocation. A stale reviewed patch fails safely with a fresh diff.
- Atomic commits for each dependent change set and durable audit records.
- Existing outbox/job equivalent for downstream effects, so retries do not duplicate notifications or tasks.

Reprocessing after a model/parser upgrade creates a new run and compares proposed changes with prior accepted/rejected decisions. It must not undo reviewer edits, restore rejected noise, replace approved baselines, or produce extra active requirements. Materially changed evidence reopens only the relevant decisions.

Support safe unpublish only for untouched imported drafts. If later approvals, tasks, or production links exist, use a compensating revision/change request and impact review; do not delete downstream history. Preserve old requirement IDs and lineage.

## 12. Addenda, authority, conflict, and clarification

Do not hard-code a universal legal precedence list. Use the tender's explicit precedence and language provisions plus reviewer-confirmed document relationships. Issue date, file role, upload order, or an informal email alone is not sufficient authority. If precedence is absent or disputed, retain the conflict and ask for review.

For an addendum, identify the exact target clause/field and whether it adds, replaces, deletes, limits, or clarifies. Preserve all unaffected attributes. Store issue time, effective applicability, recorded time, previous interpretation, proposed interpretation, and evidence.

An uploaded amendment may warn that current planning could be outdated, but must not silently stop, delete, or replace tasks, releases, or approved requirements. Review affected scope, allocations, BOQ, design versions, procurement, staffing, schedule, and production adoption. Use the existing change/approval mechanism; accepted changes flag linked outputs for reassessment rather than automatically rewriting their contents.

Draft clarification questions with evidence, the exact missing/conflicting fact, affected requirements, and potential impact. Do not send them externally. An uploaded response follows the same evidence, authority, comparison, and review process. “No BOQ match found” is a coverage warning, not proof the obligation is excluded from scope.

## 13. EOS integration contract

| Existing area | Required behavior |
|---|---|
| Project/document control | Retain current IDs, tenant isolation, immutable versions, source viewer, and document relationships |
| Requirements/scope | Publish to the existing register; preserve manual fields, parent-child structures, packages, and assignment workflow |
| Zones/locations | Propose existing matches or unresolved names; adding an allocation must not duplicate the underlying design/file |
| Departments/people | Suggest from approved mappings; do not auto-assign a person from a job title or tender party |
| Design & Creative | Link design obligations and their evidence; a design upload/approval does not itself prove contractual compliance |
| BOQ/procurement | Link compatible rows with quantity basis and discrepancy flags; never auto-create orders or financial commitments |
| Tasks/approvals | Use existing transitions and explicit follow-on actions; do not generate one task per extracted sentence |
| Production/change control | Flag affected approved releases for review; require existing authorization for changed instructions |
| Client portal | Follow explicit publication permissions; imported source clauses do not become client-visible by default |

If an integration module does not yet exist, provide an adapter boundary and honest pending status. Do not fabricate working downstream behavior or rebuild unrelated modules to satisfy this prompt.

## 14. Minimal persistence and API surface

Reuse existing entities first. Add only missing concepts: ingestion run, immutable source span, candidate, reconciliation proposal, reviewer decision, requirement-evidence link, import batch/operation, and document-reference/issue records. Extend existing allocations, revisions, audit, and change requests rather than cloning them.

Candidates and proposals need versioned validated schemas; committed material facts need queryable typed fields, not only opaque AI text. Add appropriate composite foreign keys/ownership checks, indexes, uniqueness for processing identities and publish operations, and retention rules.

Expose authenticated operations for start/resume/cancel run; inspect coverage; list candidates; inspect evidence/matches; record decision; preview change set; publish; inspect result/history; and propose amendment impact. Match current API conventions. Enforce tenant, project, document visibility, reviewer/publisher permissions, preconditions, and idempotency on the server.

Tenant/project scope and allowed target IDs come from authenticated application context, never from document instructions or model-selected values. Manual capture must remain usable when AI or OCR is unavailable, with no false “ready” status.

## 15. Security and confidential document handling

Treat tender text, hidden content, comments, and retrieved material as untrusted data. Isolate extraction from privileged tools; validate structured outputs and keep publication behind application authorization and human review. A clause telling the model to export data or ignore instructions must not control execution. These controls follow the separation and least-privilege principles in the [OWASP prompt-injection guidance](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html).

Allowlist file types, validate content beyond supplied MIME headers, scan uploads, generate safe storage names, and sandbox converters with time, memory, and decompression limits. Disable active content and external entity resolution. Keep storage private and authorize preview/download URLs. Apply these controls before content processing, consistent with the [OWASP file-upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

Do not enable archive extraction or remote URL fetching until secure limits and SSRF protections exist. Do not disclose cross-tenant existence through checksum matching, search, logs, or cache hits. Apply access filters before retrieval and revalidate every citation/target after it.

Use only approved provider credentials and data-handling settings. Confirm permitted processing region, retention, and confidentiality controls before sending tender content externally. If unavailable, report the blocker and keep manual mode; do not switch to an unapproved service. Do not put document text, credentials, or signed URLs in ordinary logs. Secure raw AI diagnostics with limited access and retention.

## 16. Required tests and acceptance scenarios

Create synthetic fixtures and use authorized sample tenders if available. Each case must assert the resulting actions, active counts, quantities/bases, evidence links, revision behavior, and absence of unauthorized side effects. Convert the following into automated regression tests, not just screenshots:

| # | Fixture/scenario | Expected result |
|---|---|---|
| 1 | Same file uploaded and published twice | No extra operational requirements; reuse or safely recheck processing |
| 2 | Same filename, changed contents | New immutable document version; reviewed change proposal |
| 3 | Overlapping extraction chunks repeat a clause | One source candidate identity; no double import |
| 4 | Same 20 chairs in RFP and BOQ | One obligation with two evidence sources; quantity stays 20 |
| 5 | 20 chairs in each of A and B | Two allocations; derived total 40 |
| 6 | 20 chairs across A and B | Total 20; allocation split unresolved |
| 7 | Total 20 plus A:12 and B:8 | Total 20, not 40 |
| 8 | Total 20 plus A:12 and B:10 | Reconciliation issue; no invented correction |
| 9 | Minimum 20 versus exactly 20 | Preserve comparator; no blind duplicate collapse |
| 10 | 20 staff per shift, two shifts | Coverage maintained; no unsupported headcount/relief calculation |
| 11 | Equipment reused on non-overlapping days | No automatic purchase-quantity summation |
| 12 | Provide generator versus maintain client generator | Distinct responsibilities or explicit amendment, not duplicate |
| 13 | One source adds a material specification | Evidence-backed proposed revision; no silent overwrite |
| 14 | Optional/alternative item resembles mandatory base scope | Separate applicability; not double-counted |
| 15 | Provide X versus do not provide X | Negation retained; conflict or evidenced exception |
| 16 | Formal amendment changes only quantity | Reviewed revision; all unrelated attributes retained |
| 17 | Later informal note conflicts without authority | Unresolved conflict; newest file does not win |
| 18 | English and Arabic versions disagree | Both sources retained; governing-language rule only if evidenced |
| 19 | Ambiguous OCR or extraction disagreement: 15 versus 75 | Critical numeric uncertainty flagged; blocked from bulk publication |
| 20 | Table continues onto another page, with footnote | Headers/units/qualifier retained; evidence locatable |
| 21 | Compound design/fabricate/submit clause | Appropriate linked obligations, with shared evidence |
| 22 | Missing appendix or unresolved relative deadline | Visible issue; no invented requirement contents or date |
| 23 | Same template in a previous project | No cross-project merge or exposure |
| 24 | A matches broad B; B matches incompatible C | Group inconsistency prevents transitive merge |
| 25 | Existing requirement manually edited after review | Stale publish rejected; reviewer sees new diff |
| 26 | Two concurrent imports propose same obligation | Serialized recheck; no duplicate created by race |
| 27 | Job, publish, or notification delivery retries | Idempotent records and effects |
| 28 | Reprocess with new model after reviewer rejects/edits | Previous decisions retained; only changed evidence reconsidered |
| 29 | Partial extraction/provider outage | Visible gaps and resumable/manual path; no false completion |
| 30 | Injection text or unauthorized source/target ID | No tool execution, disclosure, or operational write |
| 31 | Amendment affects a production-adopted design | Impact review/change control; no automatic release replacement |
| 32 | Reviewer keeps similar clauses separate | Decision persists across unchanged reruns |
| 33 | Attempted rollback after downstream activity | Compensating change path; no destructive history deletion |
| 34 | XLSX stale formula or DOCX deleted draft text | Warning/context retained; not imported as verified current fact |

Build a held-out labeled corpus covering digital/scanned documents, tables, clauses, and bilingual cases. Report requirement precision/recall, numeric/date/party extraction errors, unsupported-field rate, duplicate precision/recall, false merges, missed amendments, citation correctness, abstention rate, review time, and processing cost/latency. Report denominators and breakdowns, not one overall “AI accuracy” percentage.

Proposed initial release gates: all deterministic safety/regression cases pass; every published requirement has a locatable source or explicitly approved manual provenance; no unauthorized cross-tenant access or silent approved-record mutation; zero false automatic semantic merges because semantic auto-publication is disabled. Agree empirical extraction-quality targets against the labeled corpus before enabling broader automation. Do not claim production accuracy from synthetic tests alone.

## 17. Delivery sequence

### Increment A — Evidence and manual-safe intake

Reuse uploads and viewer; add runs, coverage, source anchors, typed candidates, and manual review/import. Confirm tenant isolation, draft-only handling, immutable evidence, and idempotent publication. Add working AI/OCR adapters only for configured services; clearly label unavailable adapters.

### Increment B — Reconciliation that understands quantities

Add scoped matching, structured adjudication, allocation-aware quantity rules, keep-separate memory, field-level diffs, review grouping, partial publication, and concurrency checks. Complete the end-to-end RFP-plus-BOQ fixture.

### Increment C — Addenda and downstream impact

Add authority/context capture, scoped revisions, conflicts, clarification drafts, existing change-control integration, and affected-design/BOQ/production visibility. Complete the amendment fixture without changing approved records during extraction.

### Increment D — Calibrated improvements

Improve bilingual OCR and long-table handling against measured errors; add authorized historical templates, advanced drawing-note extraction, and connector adapters only when the first three increments are verified. Do not delay A–C for speculative advanced intelligence.

Work incrementally and run relevant tests after each increment. If a provider, permission, or architectural dependency blocks part of the build, deliver the safe completed slice and list the blocker precisely. Do not claim a mock adapter processes real tenders.

## 18. Required handoff and definition of done

Provide:

1. Repository integration map and actual reused/changed components.
2. Migrations, schema constraints, routes, permissions, processing configuration, and feature flags.
3. Exact supported-format/language behavior, failure paths, and provider prerequisites.
4. Working demonstrations: initial import, duplicate re-upload, zone allocations, manual edit protection, amendment review, and safe retry.
5. Automated test output, evaluation results with limitations, and build/type/lint status.
6. Screenshots of evidence review, field differences, allocation reconciliation, import preview, and amendment impact.
7. Deployment/rollback instructions appropriate to the existing environment; no unrequested deployment.
8. Explicit list of completed, partial, deferred, and blocked functionality.

Completion means a reviewer can trace every operational interpretation to evidence, publish through existing EOS controls without duplicate counts or lost manual work, and see unresolved uncertainty clearly. An attractive upload screen or a long AI-generated requirement list is not sufficient.

Begin by inspecting the repository and presenting the concise integration map, then implement the first complete vertical slice. Ask only for decisions that affect authority, data exposure, paid services, or material product behavior; make and document ordinary implementation choices within the existing architecture.
